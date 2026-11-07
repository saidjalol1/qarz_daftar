"""
URL configuration for users_app
"""
from django.urls import path
from . import views

app_name = 'users_app'

urlpatterns = [
    # Page
    path('', views.users_view, name='users'),
    
    # API endpoints
    path('api/', views.api_users_list, name='api_list'),
    path('api/create/', views.api_users_create, name='api_create'),
    path('api/<int:user_id>/update/', views.api_users_update, name='api_update'),
    path('api/<int:user_id>/delete/', views.api_users_delete, name='api_delete'),
]
