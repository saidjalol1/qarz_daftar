"""
Base (Clients & Products) Management views
"""
import json
import logging

from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods

from auth_app.decorators import api_login_required, role_required
from ledger.models import Client, Product

logger = logging.getLogger(__name__)


@login_required
def base_view(request):
    """Base/products page view"""
    return render(request, 'baza.html')


# ============================================================================
# CLIENT ENDPOINTS
# ============================================================================

@require_http_methods(["GET"])
@api_login_required
def api_clients_list(request):
    """
    Get paginated list of clients with search
    Query params: page (default=1), page_size (default=20), search (optional)
    Only shows non-archived clients
    """
    try:
        page = int(request.GET.get('page', 1))
        page_size = min(int(request.GET.get('page_size', 20)), 100)  # Max 100 per page
        search = request.GET.get('search', '').strip()
        
        # Base queryset - exclude archived clients, use select_related for optimization
        clients = Client.objects.filter(is_archived=False).only(
            'id', 'name', 'phone', 'telegram', 'created_at'
        )
        
        # Search filter
        if search:
            clients = clients.filter(
                Q(name__icontains=search) |
                Q(phone__icontains=search) |
                Q(telegram__icontains=search)
            )
        
        # Count total before pagination
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
        logger.error(f'Clients list error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["GET"])
@api_login_required
def api_clients_all(request):
    """
    Get all non-archived clients for select inputs (no pagination)
    Returns only id and name for efficiency
    """
    try:
        clients = Client.objects.filter(is_archived=False).only('id', 'name').order_by('name')
        
        clients_data = [{
            'id': c.id,
            'name': c.name,
        } for c in clients]
        
        return JsonResponse({
            'success': True,
            'clients': clients_data
        })
        
    except Exception as e:
        logger.error(f'Clients all error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["POST"])
@role_required('super', 'manager')
def api_clients_create(request):
    """
    Create a new client
    Requires: name, phone (telegram optional)
    """
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        phone = data.get('phone', '').strip()
        telegram = data.get('telegram', '').strip().lstrip('@')
        
        # Validation
        if not name:
            return JsonResponse({
                'success': False,
                'error': 'Ism kiritilishi shart'
            }, status=400)
        
        if not phone or len(phone) < 4:
            return JsonResponse({
                'success': False,
                'error': 'Telefon raqam kiritilishi shart'
            }, status=400)
        
        # Check for duplicate phone
        if Client.objects.filter(phone=phone).exists():
            return JsonResponse({
                'success': False,
                'error': 'Bu telefon raqam allaqachon mavjud'
            }, status=400)
        
        # Create client
        with transaction.atomic():
            client = Client.objects.create(
                name=name,
                phone=phone,
                telegram=telegram
            )
        
        logger.info(f'Client created: {client.name} by {request.user.email}')
        
        return JsonResponse({
            'success': True,
            'client': {
                'id': client.id,
                'name': client.name,
                'phone': client.phone,
                'telegram': client.telegram,
                'created_at': client.created_at.isoformat(),
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Noto\'g\'ri ma\'lumot formati'
        }, status=400)
    except Exception as e:
        logger.error(f'Client creation error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["PUT", "POST"])
@role_required('super', 'manager')
def api_clients_update(request, client_id):
    """Update an existing client"""
    try:
        client = Client.objects.get(id=client_id)
    except Client.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Klient topilmadi'
        }, status=404)
    
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        phone = data.get('phone', '').strip()
        telegram = data.get('telegram', '').strip().lstrip('@')
        
        # Validation
        if not name:
            return JsonResponse({
                'success': False,
                'error': 'Ism kiritilishi shart'
            }, status=400)
        
        if not phone or len(phone) < 4:
            return JsonResponse({
                'success': False,
                'error': 'Telefon raqam kiritilishi shart'
            }, status=400)
        
        # Check for duplicate phone (excluding current client)
        if Client.objects.filter(phone=phone).exclude(id=client_id).exists():
            return JsonResponse({
                'success': False,
                'error': 'Bu telefon raqam allaqachon mavjud'
            }, status=400)
        
        # Update client
        with transaction.atomic():
            client.name = name
            client.phone = phone
            client.telegram = telegram
            client.save()
        
        logger.info(f'Client updated: {client.name} by {request.user.email}')
        
        return JsonResponse({
            'success': True,
            'client': {
                'id': client.id,
                'name': client.name,
                'phone': client.phone,
                'telegram': client.telegram,
                'created_at': client.created_at.isoformat(),
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Noto\'g\'ri ma\'lumot formati'
        }, status=400)
    except Exception as e:
        logger.error(f'Client update error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["DELETE", "POST"])
@role_required('super', 'manager')
def api_clients_delete(request, client_id):
    """
    Delete a client - if has debts, archive it instead
    """
    try:
        client = Client.objects.get(id=client_id)
    except Client.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Klient topilmadi'
        }, status=404)
    
    try:
        # Check if client has any debts (optimized query)
        has_debts = client.debts.exists()
        
        client_name = client.name
        
        if has_debts:
            # Archive instead of delete
            with transaction.atomic():
                client.is_archived = True
                client.save()
            
            logger.info(f'Client archived (has debts): {client_name} by {request.user.email}')
            
            return JsonResponse({
                'success': True,
                'message': 'Mijoz arxivlandi (qarzlari mavjud)',
                'archived': True
            })
        else:
            # Actually delete if no debts
            client.delete()
            
            logger.info(f'Client deleted: {client_name} by {request.user.email}')
            
            return JsonResponse({
                'success': True,
                'message': 'Mijoz o\'chirildi',
                'archived': False
            })
        
    except Exception as e:
        logger.error(f'Client deletion error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


# ============================================================================
# PRODUCT ENDPOINTS
# ============================================================================

@require_http_methods(["GET"])
@api_login_required
def api_products_list(request):
    """
    Get paginated list of products with search
    Query params: page (default=1), page_size (default=20), search (optional)
    Only shows non-archived products
    """
    try:
        page = int(request.GET.get('page', 1))
        page_size = min(int(request.GET.get('page_size', 20)), 100)
        search = request.GET.get('search', '').strip()
        
        # Base queryset - exclude archived products
        products = Product.objects.filter(is_archived=False).only('id', 'name', 'created_at')
        
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
        logger.error(f'Products list error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["GET"])
@api_login_required
def api_products_all(request):
    """
    Get all non-archived products for select inputs (no pagination)
    Returns only id and name for efficiency
    """
    try:
        products = Product.objects.filter(is_archived=False).only('id', 'name').order_by('name')
        
        products_data = [{
            'id': p.id,
            'name': p.name,
        } for p in products]
        
        return JsonResponse({
            'success': True,
            'products': products_data
        })
        
    except Exception as e:
        logger.error(f'Products all error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["POST"])
@role_required('super', 'manager')
def api_products_create(request):
    """Create a new product"""
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        
        if not name:
            return JsonResponse({
                'success': False,
                'error': 'Tovar nomi kiritilishi shart'
            }, status=400)
        
        # Check for duplicate
        if Product.objects.filter(name__iexact=name).exists():
            return JsonResponse({
                'success': False,
                'error': 'Bu nomdagi tovar allaqachon mavjud'
            }, status=400)
        
        # Create product
        with transaction.atomic():
            product = Product.objects.create(name=name)
        
        logger.info(f'Product created: {product.name} by {request.user.email}')
        
        return JsonResponse({
            'success': True,
            'product': {
                'id': product.id,
                'name': product.name,
                'created_at': product.created_at.isoformat(),
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Noto\'g\'ri ma\'lumot formati'
        }, status=400)
    except Exception as e:
        logger.error(f'Product creation error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["PUT", "POST"])
@role_required('super', 'manager')
def api_products_update(request, product_id):
    """Update an existing product"""
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Tovar topilmadi'
        }, status=404)
    
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        
        if not name:
            return JsonResponse({
                'success': False,
                'error': 'Tovar nomi kiritilishi shart'
            }, status=400)
        
        # Check for duplicate (excluding current product)
        if Product.objects.filter(name__iexact=name).exclude(id=product_id).exists():
            return JsonResponse({
                'success': False,
                'error': 'Bu nomdagi tovar allaqachon mavjud'
            }, status=400)
        
        # Update product
        with transaction.atomic():
            product.name = name
            product.save()
        
        logger.info(f'Product updated: {product.name} by {request.user.email}')
        
        return JsonResponse({
            'success': True,
            'product': {
                'id': product.id,
                'name': product.name,
                'created_at': product.created_at.isoformat(),
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Noto\'g\'ri ma\'lumot formati'
        }, status=400)
    except Exception as e:
        logger.error(f'Product update error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["DELETE", "POST"])
@role_required('super', 'manager')
def api_products_delete(request, product_id):
    """
    Delete a product - if used in debts, archive it instead
    """
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Tovar topilmadi'
        }, status=404)
    
    try:
        # Check if product is used in any debt items (optimized query)
        has_debts = product.debt_items.exists()
        
        product_name = product.name
        
        if has_debts:
            # Archive instead of delete
            with transaction.atomic():
                product.is_archived = True
                product.save()
            
            logger.info(f'Product archived (has debts): {product_name} by {request.user.email}')
            
            return JsonResponse({
                'success': True,
                'message': 'Tovar arxivlandi (qarzlarda ishlatilgan)',
                'archived': True
            })
        else:
            # Actually delete if not used
            product.delete()
            
            logger.info(f'Product deleted: {product_name} by {request.user.email}')
            
            return JsonResponse({
                'success': True,
                'message': 'Tovar o\'chirildi',
                'archived': False
            })
        
    except Exception as e:
        logger.error(f'Product deletion error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)
