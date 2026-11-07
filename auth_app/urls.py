"""
URL configuration for auth_app
"""
from django.urls import path
from . import views

app_name = 'auth_app'

urlpatterns = [
    # Pages
    path('', views.home, name='home'),
    path('login/', views.login_view, name='login'),
    
    # API endpoints
    path('api/login/', views.api_login, name='api_login'),
    path('api/logout/', views.api_logout, name='api_logout'),
    path('api/me/', views.api_me, name='api_me'),
]
