"""
Debts Management views
"""
import json
import logging
from decimal import Decimal
from datetime import datetime

from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Q, Sum, Prefetch
from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from auth_app.decorators import api_login_required, role_required
from ledger.models import Debt, DebtItem, Payment, Client, Product

logger = logging.getLogger(__name__)


@login_required
def debts_view(request):
    """Debts page view"""
    return render(request, 'debts.html')


@require_http_methods(["GET"])
@api_login_required
def api_debts_list(request):
    """
    Get list of debts grouped by client with pagination and filtering
    Query params:
    - page (default=1)
    - page_size (default=20)
    - search (optional) - search by client name, phone, telegram
    - status (optional) - 'all', 'open', 'closed'
    - date_filter (optional) - 'all', 'today', 'week', 'month'
    
    Returns grouped debts with totals, optimized with select_related and prefetch_related
    """
    try:
        page = int(request.GET.get('page', 1))
        page_size = min(int(request.GET.get('page_size', 20)), 100)
        search = request.GET.get('search', '').strip()
        status_filter = request.GET.get('status', 'all')
        date_filter = request.GET.get('date_filter', 'all')
        
        # Base queryset - non-archived debts with optimized queries
        debts = Debt.objects.filter(archived=False).select_related('client').prefetch_related(
            Prefetch('payments', queryset=Payment.objects.only('amount', 'debt_id'))
        ).only(
            'id', 'number', 'client_id', 'issued_at', 'total', 'currency',
            'client__id', 'client__name', 'client__phone', 'client__telegram'
        )
        
        # Date filter
        if date_filter != 'all':
            now = timezone.now()
            if date_filter == 'today':
                start = now.replace(hour=0, minute=0, second=0, microsecond=0)
                debts = debts.filter(issued_at__gte=start)
            elif date_filter == 'week':
                start = now - timezone.timedelta(days=7)
                debts = debts.filter(issued_at__gte=start)
            elif date_filter == 'month':
                start = now - timezone.timedelta(days=30)
                debts = debts.filter(issued_at__gte=start)
        
        # Group by client and calculate totals
        client_debts = {}
        for debt in debts:
            client_id = debt.client.id
            paid = sum(p.amount for p in debt.payments.all())
            left = debt.total - paid
            
            # Status filter
            if status_filter == 'open' and left <= 0:
                continue
            elif status_filter == 'closed' and left > 0:
                continue
            
            if client_id not in client_debts:
                client_debts[client_id] = {
                    'client': {
                        'id': debt.client.id,
                        'name': debt.client.name,
                        'phone': debt.client.phone,
                        'telegram': debt.client.telegram,
                    },
                    'debts': [],
                    'total': Decimal('0'),
                    'paid': Decimal('0'),
                    'left': Decimal('0'),
                    # Track currency-separated totals for accurate summary
                    'total_uzs': Decimal('0'),
                    'paid_uzs': Decimal('0'),
                    'left_uzs': Decimal('0'),
                    'total_usd': Decimal('0'),
                    'paid_usd': Decimal('0'),
                    'left_usd': Decimal('0'),
                }
            
            debt_data = {
                'id': debt.id,
                'number': debt.number,
                'issued_at': debt.issued_at.isoformat(),
                'total': str(debt.total),
                'paid': str(paid),
                'left': str(left),
                'currency': debt.currency,
            }
            
            client_debts[client_id]['debts'].append(debt_data)
            
            # Sum amounts by currency
            if debt.currency == 'usd':
                client_debts[client_id]['total_usd'] += debt.total
                client_debts[client_id]['paid_usd'] += paid
                client_debts[client_id]['left_usd'] += left
            else:  # uzs
                client_debts[client_id]['total_uzs'] += debt.total
                client_debts[client_id]['paid_uzs'] += paid
                client_debts[client_id]['left_uzs'] += left
        
        # Convert to list and search filter
        result = list(client_debts.values())
        
        if search:
            search_lower = search.lower()
            result = [
                item for item in result
                if search_lower in item['client']['name'].lower() or
                   search_lower in item['client']['phone'] or
                   (item['client']['telegram'] and search_lower in item['client']['telegram'].lower())
            ]
        
        # Calculate total for each client (for display) - keeping native currencies
        for item in result:
            item['total'] = str(item['total_uzs'] + item['total_usd'])
            item['paid'] = str(item['paid_uzs'] + item['paid_usd'])
            item['left'] = str(item['left_uzs'] + item['left_usd'])
            # Remove temp currency-specific fields
            del item['total_uzs']
            del item['total_usd']
            del item['paid_uzs']
            del item['paid_usd']
            del item['left_uzs']
            del item['left_usd']
        
        # Sort by left amount (highest first)
        result.sort(key=lambda x: Decimal(x['left']), reverse=True)
        
        # Pagination
        total = len(result)
        start = (page - 1) * page_size
        end = start + page_size
        result_page = result[start:end]
        
        # Calculate summary - return SEPARATED BY CURRENCY for frontend to convert
        summary_uzs_left = Decimal('0')
        summary_uzs_paid = Decimal('0')
        summary_usd_left = Decimal('0')
        summary_usd_paid = Decimal('0')
        
        # Re-iterate original debts to get accurate currency-separated totals
        for debt in debts:
            paid = sum(p.amount for p in debt.payments.all())
            left = debt.total - paid
            
            # Apply status filter
            if status_filter == 'open' and left <= 0:
                continue
            elif status_filter == 'closed' and left > 0:
                continue
            
            # Apply search filter
            if search:
                search_lower = search.lower()
                if not (search_lower in debt.client.name.lower() or
                       search_lower in debt.client.phone or
                       (debt.client.telegram and search_lower in debt.client.telegram.lower())):
                    continue
            
            # Sum by currency
            if debt.currency == 'usd':
                summary_usd_left += left
                summary_usd_paid += paid
            else:
                summary_uzs_left += left
                summary_uzs_paid += paid
        
        debtors_count = len([item for item in result if Decimal(item['left']) > 0])
        
        return JsonResponse({
            'success': True,
            'groups': result_page,
            'summary': {
                'uzs_left': str(summary_uzs_left),
                'uzs_paid': str(summary_uzs_paid),
                'usd_left': str(summary_usd_left),
                'usd_paid': str(summary_usd_paid),
                'debtors_count': debtors_count,
            },
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': (total + page_size - 1) // page_size,
                'has_next': end < total,
                'has_prev': page > 1,
            }
        })
        
    except ValueError:
        return JsonResponse({
            'success': False,
            'error': 'Noto\'g\'ri parametrlar'
        }, status=400)
    except Exception as e:
        logger.error(f'Debts list error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["GET"])
@api_login_required
def api_debt_detail(request, debt_id):
    """
    Get detailed information about a specific debt
    Includes items and payment history
    """
    try:
        debt = Debt.objects.select_related('client', 'created_by').prefetch_related(
            'items__product',
            'payments'
        ).get(id=debt_id)
        
        # Check access - cashiers can only view non-archived debts
        if request.user.role == 'cashier' and debt.archived:
            return JsonResponse({
                'success': False,
                'error': 'Ruxsat yo\'q'
            }, status=403)
        
        # Calculate totals
        paid = sum(p.amount for p in debt.payments.all())
        left = debt.total - paid
        
        # Serialize items
        items_data = [{
            'id': item.id,
            'product_id': item.product.id if item.product else None,
            'name': item.name,
            'price': str(item.price),
            'boxes': str(item.boxes),
            'qty': str(item.qty),
            'line_sum': str(item.line_sum),
        } for item in debt.items.all()]
        
        # Serialize payments
        payments_data = [{
            'id': p.id,
            'paid_at': p.paid_at.isoformat(),
            'amount': str(p.amount),
            'created_at': p.created_at.isoformat(),
        } for p in debt.payments.all().order_by('paid_at')]
        
        return JsonResponse({
            'success': True,
            'debt': {
                'id': debt.id,
                'number': debt.number,
                'client': {
                    'id': debt.client.id,
                    'name': debt.client.name,
                    'phone': debt.client.phone,
                    'telegram': debt.client.telegram,
                },
                'issued_at': debt.issued_at.isoformat(),
                'manual': debt.manual,
                'archived': debt.archived,
                'currency': debt.currency,
                'total': str(debt.total),
                'paid': str(paid),
                'left': str(left),
                'items': items_data,
                'payments': payments_data,
                'created_by': debt.created_by.name if debt.created_by else None,
                'created_at': debt.created_at.isoformat(),
            }
        })
        
    except Debt.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Qarz topilmadi'
        }, status=404)
    except Exception as e:
        logger.error(f'Debt detail error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["POST"])
@role_required('super', 'manager')
def api_debt_create(request):
    """
    Create a new debt
    Expects JSON with: client_id, issued_at, manual, currency, items (if not manual), total (if manual)
    """
    try:
        data = json.loads(request.body)
        client_id = data.get('client_id')
        issued_at_str = data.get('issued_at')
        manual = data.get('manual', False)
        currency = data.get('currency', 'uzs')
        items_data = data.get('items', [])
        manual_total = data.get('total', 0)
        
        # Validation
        if not client_id:
            return JsonResponse({
                'success': False,
                'error': 'Klient tanlanishi shart'
            }, status=400)
        
        try:
            client = Client.objects.get(id=client_id)
        except Client.DoesNotExist:
            return JsonResponse({
                'success': False,
                'error': 'Klient topilmadi'
            }, status=404)
        
        if not issued_at_str:
            return JsonResponse({
                'success': False,
                'error': 'Sana kiritilishi shart'
            }, status=400)
        
        try:
            issued_at = datetime.fromisoformat(issued_at_str.replace('Z', '+00:00'))
        except ValueError:
            return JsonResponse({
                'success': False,
                'error': 'Noto\'g\'ri sana formati'
            }, status=400)
        
        if currency not in ['uzs', 'usd']:
            return JsonResponse({
                'success': False,
                'error': 'Noto\'g\'ri valyuta'
            }, status=400)
        
        # Calculate total
        total = Decimal('0')
        if manual:
            total = Decimal(str(manual_total))
            if total <= 0:
                return JsonResponse({
                    'success': False,
                    'error': 'Summa 0 dan katta bo\'lishi kerak'
                }, status=400)
        else:
            if not items_data:
                return JsonResponse({
                    'success': False,
                    'error': 'Tovarlar ro\'yxati bo\'sh'
                }, status=400)
            
            for item in items_data:
                price = Decimal(str(item.get('price', 0)))
                qty = Decimal(str(item.get('qty', 1)))
                total += price * qty
            
            if total <= 0:
                return JsonResponse({
                    'success': False,
                    'error': 'Summa 0 dan katta bo\'lishi kerak'
                }, status=400)
        
        # Generate next number
        last_debt = Debt.objects.order_by('-number').first()
        next_number = (last_debt.number + 1) if last_debt else 1
        
        # Create debt with items
        with transaction.atomic():
            debt = Debt.objects.create(
                number=next_number,
                client=client,
                issued_at=issued_at,
                manual=manual,
                currency=currency,
                total=total,
                created_by=request.user,
            )
            
            # Create items if not manual
            if not manual:
                for item_data in items_data:
                    product_id = item_data.get('product_id')
                    product = Product.objects.get(id=product_id) if product_id else None
                    
                    DebtItem.objects.create(
                        debt=debt,
                        product=product,
                        name=item_data.get('name', ''),
                        price=Decimal(str(item_data.get('price', 0))),
                        boxes=Decimal(str(item_data.get('boxes', 0))),
                        qty=Decimal(str(item_data.get('qty', 1))),
                    )
        
        logger.info(f'Debt created: #{debt.number} for client {client.name} by {request.user.email}')
        
        return JsonResponse({
            'success': True,
            'debt': {
                'id': debt.id,
                'number': debt.number,
                'total': str(debt.total),
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Noto\'g\'ri ma\'lumot formati'
        }, status=400)
    except Exception as e:
        logger.error(f'Debt creation error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["POST"])
@api_login_required
def api_payment_create(request, debt_id):
    """
    Add a payment to a debt
    All roles can add payments (cashier, manager, super)
    """
    try:
        debt = Debt.objects.select_related('client').prefetch_related('payments').get(id=debt_id)
    except Debt.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Qarz topilmadi'
        }, status=404)
    
    # Cannot add payment to archived debt
    if debt.archived:
        return JsonResponse({
            'success': False,
            'error': 'Arxivlangan qarzga to\'lov qo\'shib bo\'lmaydi'
        }, status=400)
    
    try:
        data = json.loads(request.body)
        amount = Decimal(str(data.get('amount', 0)))
        paid_at_str = data.get('paid_at')
        
        if amount <= 0:
            return JsonResponse({
                'success': False,
                'error': 'To\'lov summasi 0 dan katta bo\'lishi kerak'
            }, status=400)
        
        # Calculate current left
        paid = sum(p.amount for p in debt.payments.all())
        left = debt.total - paid
        
        if amount > left:
            return JsonResponse({
                'success': False,
                'error': f'To\'lov qoldiqdan ({left}) oshib ketdi'
            }, status=400)
        
        # Parse date
        if paid_at_str:
            try:
                paid_at = datetime.fromisoformat(paid_at_str.replace('Z', '+00:00'))
            except ValueError:
                paid_at = timezone.now()
        else:
            paid_at = timezone.now()
        
        # Create payment
        with transaction.atomic():
            payment = Payment.objects.create(
                debt=debt,
                paid_at=paid_at,
                amount=amount,
            )
            
            # Auto-archive if fully paid
            new_left = left - amount
            if new_left == 0:
                debt.archived = True
                debt.archived_at = timezone.now()
                debt.save()
        
        logger.info(f'Payment added: {amount} to debt #{debt.number} by {request.user.email}')
        
        return JsonResponse({
            'success': True,
            'payment': {
                'id': payment.id,
                'amount': str(payment.amount),
                'paid_at': payment.paid_at.isoformat(),
            },
            'auto_archived': new_left == 0,
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Noto\'g\'ri ma\'lumot formati'
        }, status=400)
    except Exception as e:
        logger.error(f'Payment creation error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["POST"])
@role_required('super', 'manager')
def api_debt_delete(request, debt_id):
    """
    Delete a debt (move to archive)
    Only super and manager can delete
    """
    try:
        debt = Debt.objects.get(id=debt_id)
    except Debt.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Qarz topilmadi'
        }, status=404)
    
    try:
        with transaction.atomic():
            debt.archived = True
            debt.archived_at = timezone.now()
            debt.save()
        
        logger.info(f'Debt archived: #{debt.number} by {request.user.email}')
        
        return JsonResponse({
            'success': True,
            'message': 'Qarz arxivga ko\'chirildi'
        })
        
    except Exception as e:
        logger.error(f'Debt archive error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["POST"])
@role_required('super', 'manager')
def api_debt_update_items(request, debt_id):
    """
    Update debt items (for non-manual debts only)
    Only super and manager can update
    Validates that new total >= paid amount
    """
    try:
        debt = Debt.objects.select_related('client').prefetch_related('payments', 'items').get(id=debt_id)
    except Debt.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Qarz topilmadi'
        }, status=404)
    
    # Cannot update archived debts
    if debt.archived:
        return JsonResponse({
            'success': False,
            'error': 'Arxivlangan qarzni tahrirlab bo\'lmaydi'
        }, status=400)
    
    # Cannot update manual debts
    if debt.manual:
        return JsonResponse({
            'success': False,
            'error': 'Qo\'lda kiritilgan qarzni tahrirlab bo\'lmaydi'
        }, status=400)
    
    try:
        data = json.loads(request.body)
        items_data = data.get('items', [])
        currency = data.get('currency', debt.currency)
        
        if not items_data:
            return JsonResponse({
                'success': False,
                'error': 'Tovarlar ro\'yxati bo\'sh'
            }, status=400)
        
        # Calculate new total
        new_total = Decimal('0')
        for item_data in items_data:
            price = Decimal(str(item_data.get('price', 0)))
            qty = Decimal(str(item_data.get('qty', 1)))
            if price < 0 or qty < 0:
                return JsonResponse({
                    'success': False,
                    'error': 'Narx va miqdor manfiy bo\'lmasligi kerak'
                }, status=400)
            new_total += price * qty
        
        if new_total <= 0:
            return JsonResponse({
                'success': False,
                'error': 'Jami summa 0 dan katta bo\'lishi kerak'
            }, status=400)
        
        # Check paid amount
        paid = sum(p.amount for p in debt.payments.all())
        if new_total < paid:
            return JsonResponse({
                'success': False,
                'error': f'Yangi jami ({new_total}) to\'langan summadan ({paid}) kam bo\'lmasligi kerak'
            }, status=400)
        
        # Update debt with new items
        with transaction.atomic():
            # Delete old items
            debt.items.all().delete()
            
            # Create new items
            for item_data in items_data:
                product_id = item_data.get('product_id')
                product = Product.objects.get(id=product_id) if product_id else None
                
                DebtItem.objects.create(
                    debt=debt,
                    product=product,
                    name=item_data.get('name', ''),
                    price=Decimal(str(item_data.get('price', 0))),
                    boxes=Decimal(str(item_data.get('boxes', 0))),
                    qty=Decimal(str(item_data.get('qty', 1))),
                )
            
            # Update debt total and currency
            debt.total = new_total
            debt.currency = currency
            debt.save()
        
        logger.info(f'Debt items updated: #{debt.number} by {request.user.email}. New total: {new_total}')
        
        return JsonResponse({
            'success': True,
            'message': 'Tovarlar yangilandi',
            'new_total': str(new_total),
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Noto\'g\'ri ma\'lumot formati'
        }, status=400)
    except Exception as e:
        logger.error(f'Debt items update error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["POST"])
@role_required('super', 'manager')
def api_debt_permanent_delete(request, debt_id):
    """
    Permanently delete a debt
    Only super and manager can delete
    By default, only works for debts with balance = 0
    With force=True, can delete unpaid debts (requires explicit confirmation)
    """
    try:
        debt = Debt.objects.select_related('client').prefetch_related('payments', 'items').get(id=debt_id)
    except Debt.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Qarz topilmadi'
        }, status=404)
    
    # Parse request body for force parameter
    try:
        data = json.loads(request.body)
        force = data.get('force', False)
    except:
        force = False
    
    # Check if debt is fully paid
    paid = sum(p.amount for p in debt.payments.all())
    left = debt.total - paid
    
    if left > 0 and not force:
        return JsonResponse({
            'success': False,
            'error': "Faqat to'liq to'langan qarzlarni o'chirish mumkin"
        }, status=400)
    
    try:
        debt_number = debt.number
        client_name = debt.client.name
        debt_total = debt.total
        is_unpaid = left > 0
        
        with transaction.atomic():
            # Permanently delete debt (CASCADE will delete items and payments)
            debt.delete()
        
        if is_unpaid:
            logger.warning(f'UNPAID Debt PERMANENTLY DELETED: #{debt_number} for {client_name}, amount: {debt_total}, left: {left}, by {request.user.email}')
        else:
            logger.warning(f'Debt PERMANENTLY DELETED: #{debt_number} for {client_name} by {request.user.email}')
        
        return JsonResponse({
            'success': True,
            'message': "Qarz butunlay o'chirildi"
        })
        
    except Exception as e:
        logger.error(f'Permanent delete error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)
