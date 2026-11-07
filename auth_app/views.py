"""
Authentication views - Login, Logout, Me endpoint
"""
import json
import logging
from functools import wraps

from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods
from django_ratelimit.decorators import ratelimit

logger = logging.getLogger(__name__)


def api_login_required(view_func):
    """Custom login_required decorator that returns JSON for API endpoints"""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({
                'success': False,
                'error': 'Tizimga kirish talab qilinadi'
            }, status=401)
        return view_func(request, *args, **kwargs)
    return wrapper


def home(request):
    """Home page view - redirects based on authentication"""
    if request.user.is_authenticated:
        return redirect('/debts/')
    return redirect('/login/')


@ensure_csrf_cookie
def login_view(request):
    """Login page view"""
    if request.user.is_authenticated:
        return redirect('/debts/')
    return render(request, 'login.html')


@require_http_methods(["POST"])
@ratelimit(key='ip', rate='5/m', method='POST')
def api_login(request):
    """
    API endpoint for user login
    Rate limited to 5 attempts per minute per IP
    Expects JSON: {"email": "...", "password": "..."}
    Returns JSON with user data or error
    """
    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        # Input validation
        if not email or not password:
            logger.warning(f'Login attempt with missing credentials from IP: {request.META.get("REMOTE_ADDR")}')
            return JsonResponse({
                'success': False,
                'error': 'Email va parol kiritilishi shart'
            }, status=400)
        
        # Authenticate user
        user = authenticate(request, username=email, password=password)
        
        if user is not None:
            if not user.is_active:
                logger.warning(f'Login attempt for inactive user: {email}')
                return JsonResponse({
                    'success': False,
                    'error': 'Hisobingiz faol emas'
                }, status=403)
            
            # Login user
            login(request, user)
            logger.info(f'Successful login: {email}')
            
            # Return user data
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
        else:
            logger.warning(f'Failed login attempt for: {email} from IP: {request.META.get("REMOTE_ADDR")}')
            return JsonResponse({
                'success': False,
                'error': 'Email yoki parol noto\'g\'ri'
            }, status=401)
            
    except json.JSONDecodeError:
        logger.error(f'Invalid JSON in login request from IP: {request.META.get("REMOTE_ADDR")}')
        return JsonResponse({
            'success': False,
            'error': 'Noto\'g\'ri ma\'lumot formati'
        }, status=400)
    except Exception as e:
        logger.error(f'Login error: {str(e)}')
        return JsonResponse({
            'success': False,
            'error': 'Xatolik yuz berdi'
        }, status=500)


@require_http_methods(["POST"])
@api_login_required
def api_logout(request):
    """API endpoint for user logout"""
    logger.info(f'User logged out: {request.user.email}')
    logout(request)
    return JsonResponse({'success': True})


@require_http_methods(["GET"])
@api_login_required
def api_me(request):
    """Get current user information"""
    user = request.user
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
