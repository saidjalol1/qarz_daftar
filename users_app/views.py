"""
User Management views
"""
import json
import logging

from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.decorators import login_required
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.views.decorators.http import require_http_methods

from auth_app.decorators import api_login_required, role_required
from ledger.models import User

logger = logging.getLogger(__name__)


def translate_password_errors(validation_error):
    """Translate Django password validation errors to Uzbek"""
    error_messages = {
        'This password is too short.': 'Parol juda qisqa.',
        'This password is too common.': 'Bu parol juda oddiy va keng tarqalgan.',
        'This password is entirely numeric.': 'Parol faqat raqamlardan iborat bo\'lmasin.',
        'The password is too similar to the': 'Parol shaxsiy ma\'lumotlaringizga juda o\'xshash.',
        'password is too short': 'Parol juda qisqa',
        'password is too common': 'Bu parol juda oddiy',
        'entirely numeric': 'Parol faqat raqamlardan iborat',
        'too similar': 'Parol ma\'lumotlaringizga o\'xshash',
    }
    
    uzbek_errors = []
    for error in validation_error.messages:
        error_lower = error.lower()
        translated = False
        
        # Try exact match first
        for eng_key, uz_value in error_messages.items():
            if eng_key.lower() in error_lower:
                uzbek_errors.append(uz_value)
                translated = True
                break
        
        # If not translated, use original
        if not translated:
            uzbek_errors.append(error)
    
    return uzbek_errors


@login_required
def users_view(request):
    """Users page view - only for managers and super users"""
    if request.user.role not in ['super', 'manager']:
        return redirect('/debts/')
    return render(request, 'users.html')


@require_http_methods(["GET"])
@role_required('super', 'manager')
def api_users_list(request):
    """
    Get list of all active users - only for super and manager roles
    """
    users = User.objects.filter(is_active=True).order_by('name').values(
        'id', 'email', 'name', 'phone', 'telegram', 'role', 'is_staff'
    )
    
    return JsonResponse({
        'success': True,
        'users': list(users)
    })


@require_http_methods(["POST"])
@role_required('super', 'manager')
def api_users_create(request):
    """
    Create a new user - only for super and manager roles
    Expects JSON: {"name": "...", "email": "...", "phone": "...", "telegram": "...", "password": "...", "role": "..."}
    """
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        phone = data.get('phone', '').strip()
        telegram = data.get('telegram', '').strip().lstrip('@')
        password = data.get('password', '').strip()
        role = data.get('role', 'cashier')
        
        # Validation
        if not name:
            return JsonResponse({
                'success': False,
                'error': 'Ism kiritilishi shart'
            }, status=400)
        
        if not email or '@' not in email:
            return JsonResponse({
                'success': False,
                'error': 'To\'g\'ri email kiritilishi shart'
            }, status=400)
        
        if not phone or len(phone) < 4:
            return JsonResponse({
                'success': False,
                'error': 'Telefon raqam kiritilishi shart'
            }, status=400)
        
        if not password:
            return JsonResponse({
                'success': False,
                'error': 'Parol kiritilishi shart'
            }, status=400)
        
        if role not in ['super', 'manager', 'cashier']:
            return JsonResponse({
                'success': False,
                'error': 'Noto\'g\'ri rol'
            }, status=400)
        
        # Check if email already exists
        if User.objects.filter(email=email).exists():
            return JsonResponse({
                'success': False,
                'error': 'Bu email allaqachon ro\'yxatdan o\'tgan'
            }, status=400)
        
        # Validate password strength
        try:
            validate_password(password)
        except ValidationError as e:
            return JsonResponse({
                'success': False,
                'error': '; '.join(translate_password_errors(e))
            }, status=400)
        
        # Create user
        with transaction.atomic():
            user = User.objects.create_user(
                email=email,
                password=password,
                name=name,
                phone=phone,
                telegram=telegram,
                role=role,
                is_staff=(role == 'super')
            )
        
        logger.info(f'User created: {email} by {request.user.email}')
        
        return JsonResponse({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'phone': user.phone,
                'telegram': user.telegram,
                'role': user.role,
                'is_staff': user.is_staff,
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Noto\'g\'ri ma\'lumot formati'
        }, status=400)
    except Exception as e:
        logger.error(f'User creation error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["PUT", "POST"])
@role_required('super', 'manager')
def api_users_update(request, user_id):
    """
    Update an existing user - only for super and manager roles
    Cannot downgrade super role
    Password is optional - only updates if provided
    """
    try:
        user = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Foydalanuvchi topilmadi'
        }, status=404)
    
    try:
        data = json.loads(request.body)
        name = data.get('name', '').strip()
        phone = data.get('phone', '').strip()
        telegram = data.get('telegram', '').strip().lstrip('@')
        password = data.get('password', '').strip()
        role = data.get('role', user.role)
        
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
        
        if role not in ['super', 'manager', 'cashier']:
            return JsonResponse({
                'success': False,
                'error': 'Noto\'g\'ri rol'
            }, status=400)
        
        # Cannot change role of super user
        if user.role == 'super' and role != 'super':
            return JsonResponse({
                'success': False,
                'error': 'Super admin rolini o\'zgartirib bo\'lmaydi'
            }, status=400)
        
        # If password provided, validate it
        if password and len(password) >= 6:
            try:
                validate_password(password, user=user)
            except ValidationError as e:
                return JsonResponse({
                    'success': False,
                    'error': '; '.join(translate_password_errors(e))
                }, status=400)
        
        # Update user
        with transaction.atomic():
            user.name = name
            user.phone = phone
            user.telegram = telegram
            if user.role != 'super':
                user.role = role
                user.is_staff = (role == 'super')
            if password and len(password) >= 6:
                user.set_password(password)
                # If user is updating their own password, update session to prevent logout
                if user.id == request.user.id:
                    update_session_auth_hash(request, user)
            user.save()
        
        logger.info(f'User updated: {user.email} by {request.user.email}')
        
        return JsonResponse({
            'success': True,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.name,
                'phone': user.phone,
                'telegram': user.telegram,
                'role': user.role,
                'is_staff': user.is_staff,
            }
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Noto\'g\'ri ma\'lumot formati'
        }, status=400)
    except Exception as e:
        logger.error(f'User update error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["DELETE", "POST"])
@role_required('super', 'manager')
def api_users_delete(request, user_id):
    """
    Delete a user (soft delete) - only for super and manager roles
    Cannot delete super users or yourself
    """
    try:
        user = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Foydalanuvchi topilmadi'
        }, status=404)
    
    # Cannot delete super users
    if user.role == 'super':
        return JsonResponse({
            'success': False,
            'error': 'Super admin foydalanuvchisini o\'chirib bo\'lmaydi'
        }, status=400)
    
    # Cannot delete yourself
    if user.id == request.user.id:
        return JsonResponse({
            'success': False,
            'error': 'O\'zingizni o\'chira olmaysiz'
        }, status=400)
    
    try:
        # Soft delete
        with transaction.atomic():
            user.is_active = False
            user.save()
        
        logger.info(f'User deleted: {user.email} by {request.user.email}')
        
        return JsonResponse({
            'success': True,
            'message': 'Foydalanuvchi o\'chirildi'
        })
        
    except Exception as e:
        logger.error(f'User deletion error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)
