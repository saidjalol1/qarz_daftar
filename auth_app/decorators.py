"""
Common decorators for authentication and authorization
"""
from functools import wraps
from django.http import JsonResponse


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


def role_required(*allowed_roles):
    """Decorator to check if user has one of the allowed roles"""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse({
                    'success': False,
                    'error': 'Tizimga kirish talab qilinadi'
                }, status=401)
            
            if request.user.role not in allowed_roles:
                return JsonResponse({
                    'success': False,
                    'error': 'Ruxsat yo\'q'
                }, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
