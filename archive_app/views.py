"""
Archive Management views
"""
import json
import logging
from decimal import Decimal

from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Q, Prefetch
from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.http import require_http_methods

from auth_app.decorators import api_login_required, role_required
from ledger.models import Debt, Payment, Client, Product

logger = logging.getLogger(__name__)


@login_required
def archive_view(request):
    """Archive page view"""
    return render(request, 'archive.html')


@require_http_methods(["GET"])
@api_login_required
def api_archive_debts_list(request):
    """
    Get list of archived debts grouped by client with pagination and search
    Query params:
    - page (default=1)
    - page_size (default=20)
    - search (optional) - search by client name or nakladnoy number
    
    Returns grouped archived debts with totals
    """
    try:
        page = max(1, int(request.GET.get('page', 1)))
        page_size = min(max(1, int(request.GET.get('page_size', 20))), 100)
        search = request.GET.get('search', '').strip()
        
        # Base queryset - archived debts only with optimized joins
        debts = Debt.objects.filter(archived=True).select_related('client').prefetch_related(
            Prefetch('payments', queryset=Payment.objects.only('amount', 'debt_id'))
        ).only(
            'id', 'number', 'client_id', 'issued_at', 'total', 'currency', 'archived_at',
            'client__id', 'client__name', 'client__phone', 'client__telegram'
        ).order_by('client_id', '-archived_at')
        
        # Search by client name or debt number
        if search:
            if search.isdigit():
                debts = debts.filter(Q(number=int(search)) | Q(client__name__icontains=search))
            else:
                debts = debts.filter(client__name__icontains=search)
        
        # Group by client
        client_debts = {}
        for debt in debts:
            client_id = debt.client.id
            paid = sum(p.amount for p in debt.payments.all())
            left = debt.total - paid
            
            if client_id not in client_debts:
                client_debts[client_id] = {
                    'client': {
                        'id': debt.client.id,
                        'name': debt.client.name,
                        'phone': debt.client.phone,
                        'telegram': debt.client.telegram,
                    },
                    'debts': [],
                    'count': 0,
                    'total': Decimal('0'),
                    'paid': Decimal('0'),
                    'left': Decimal('0'),
                    'currency': debt.currency,
                }
            
            debt_data = {
                'id': debt.id,
                'number': debt.number,
                'issued_at': debt.issued_at.isoformat(),
                'archived_at': debt.archived_at.isoformat() if debt.archived_at else None,
                'total': str(debt.total),
                'paid': str(paid),
                'left': str(left),
                'currency': debt.currency,
            }
            
            client_debts[client_id]['debts'].append(debt_data)
            client_debts[client_id]['count'] += 1
            client_debts[client_id]['total'] += debt.total
            client_debts[client_id]['paid'] += paid
            client_debts[client_id]['left'] += left
        
        # Convert to list and format
        result = []
        for item in client_debts.values():
            result.append({
                'client': item['client'],
                'debts': item['debts'],
                'count': item['count'],
                'total': str(item['total']),
                'paid': str(item['paid']),
                'left': str(item['left']),
                'currency': item['currency'],
            })
        
        # Sort by most recent archived date
        result.sort(key=lambda x: x['debts'][0]['archived_at'] if x['debts'] else '', reverse=True)
        
        # Pagination
        total = len(result)
        start = (page - 1) * page_size
        end = start + page_size
        result_page = result[start:end]
        
        return JsonResponse({
            'success': True,
            'groups': result_page,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': max(1, (total + page_size - 1) // page_size),
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
        logger.error(f'Archive debts list error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["POST"])
@role_required('super', 'manager')
def api_debt_restore(request, debt_id):
    """
    Restore an archived debt back to active debts
    Only super and manager can restore
    """
    try:
        debt = Debt.objects.get(id=debt_id, archived=True)
    except Debt.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Arxivlangan qarz topilmadi'
        }, status=404)
    
    try:
        with transaction.atomic():
            debt.archived = False
            debt.archived_at = None
            debt.save()
        
        logger.info(f'Debt restored: #{debt.number} by {request.user.email}')
        
        return JsonResponse({
            'success': True,
            'message': 'Qarz qayta tiklandi'
        })
        
    except Exception as e:
        logger.error(f'Debt restore error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["GET"])
@role_required('super', 'manager')
def api_archive_clients_list(request):
    """
    Get list of archived clients with pagination and search
    Query params:
    - page (default=1)
    - page_size (default=20)
    - search (optional)
    
    Only super and manager can view archived clients
    """
    try:
        page = max(1, int(request.GET.get('page', 1)))
        page_size = min(max(1, int(request.GET.get('page_size', 20))), 100)
        search = request.GET.get('search', '').strip()
        
        # Base queryset - archived clients only
        clients = Client.objects.filter(is_archived=True).only(
            'id', 'name', 'phone', 'telegram', 'created_at'
        ).order_by('-created_at')
        
        # Search filter
        if search:
            clients = clients.filter(
                Q(name__icontains=search) |
                Q(phone__icontains=search) |
                Q(telegram__icontains=search)
            )
        
        # Count total
        total = clients.count()
        
        # Pagination
        start = (page - 1) * page_size
        end = start + page_size
        clients_page = list(clients[start:end])
        
        # Serialize
        clients_data = [{
            'id': c.id,
            'name': c.name,
            'phone': c.phone,
            'telegram': c.telegram,
            'created_at': c.created_at.isoformat(),
        } for c in clients_page]
        
        return JsonResponse({
            'success': True,
            'clients': clients_data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': max(1, (total + page_size - 1) // page_size),
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
        logger.error(f'Archive clients list error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["POST"])
@role_required('super', 'manager')
def api_client_restore(request, client_id):
    """
    Restore an archived client back to active clients
    Only super and manager can restore
    """
    try:
        client = Client.objects.get(id=client_id, is_archived=True)
    except Client.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Arxivlangan mijoz topilmadi'
        }, status=404)
    
    try:
        with transaction.atomic():
            client.is_archived = False
            client.save()
        
        logger.info(f'Client restored: {client.name} by {request.user.email}')
        
        return JsonResponse({
            'success': True,
            'message': 'Mijoz qayta tiklandi'
        })
        
    except Exception as e:
        logger.error(f'Client restore error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["GET"])
@role_required('super', 'manager')
def api_archive_products_list(request):
    """
    Get list of archived products with pagination and search
    Query params:
    - page (default=1)
    - page_size (default=20)
    - search (optional)
    
    Only super and manager can view archived products
    """
    try:
        page = max(1, int(request.GET.get('page', 1)))
        page_size = min(max(1, int(request.GET.get('page_size', 20))), 100)
        search = request.GET.get('search', '').strip()
        
        # Base queryset - archived products only
        products = Product.objects.filter(is_archived=True).only(
            'id', 'name', 'created_at'
        ).order_by('-created_at')
        
        # Search filter
        if search:
            products = products.filter(name__icontains=search)
        
        # Count total
        total = products.count()
        
        # Pagination
        start = (page - 1) * page_size
        end = start + page_size
        products_page = list(products[start:end])
        
        # Serialize
        products_data = [{
            'id': p.id,
            'name': p.name,
            'created_at': p.created_at.isoformat(),
        } for p in products_page]
        
        return JsonResponse({
            'success': True,
            'products': products_data,
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total': total,
                'total_pages': max(1, (total + page_size - 1) // page_size),
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
        logger.error(f'Archive products list error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["POST"])
@role_required('super', 'manager')
def api_product_restore(request, product_id):
    """
    Restore an archived product back to active products
    Only super and manager can restore
    """
    try:
        product = Product.objects.get(id=product_id, is_archived=True)
    except Product.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Arxivlangan tovar topilmadi'
        }, status=404)
    
    try:
        with transaction.atomic():
            product.is_archived = False
            product.save()
        
        logger.info(f'Product restored: {product.name} by {request.user.email}')
        
        return JsonResponse({
            'success': True,
            'message': 'Tovar qayta tiklandi'
        })
        
    except Exception as e:
        logger.error(f'Product restore error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)
