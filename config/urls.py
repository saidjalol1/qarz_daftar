"""
URL configuration for config project.

Refactored structure with separate apps for each feature:
- auth_app: Authentication (login, logout, me)
- users_app: User management
- base_app: Clients & Products management
- debts_app: Debts management
- archive_app: Archive management
"""
from django.contrib import admin
from django.urls import path, include
from django.views.generic.base import RedirectView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Favicon
    path('favicon.ico', RedirectView.as_view(url=settings.STATIC_URL + 'favicon.ico', permanent=True)),
    
    # Authentication & Home
    path('', include('auth_app.urls')),
    
    # Feature apps
    path('users/', include('users_app.urls')),
    path('base/', include('base_app.urls')),
    path('debts/', include('debts_app.urls')),
    path('archive/', include('archive_app.urls')),
    
    # Admin
    path('admin/', admin.site.urls),
]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
