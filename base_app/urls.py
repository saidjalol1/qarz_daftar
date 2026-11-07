"""
URL configuration for base_app (Clients & Products)
"""
from django.urls import path
from . import views

app_name = 'base_app'

urlpatterns = [
    # Page
    path('', views.base_view, name='base'),
    
    # Client API endpoints
    path('api/clients/', views.api_clients_list, name='api_clients_list'),
    path('api/clients/all/', views.api_clients_all, name='api_clients_all'),
    path('api/clients/create/', views.api_clients_create, name='api_clients_create'),
    path('api/clients/<int:client_id>/update/', views.api_clients_update, name='api_clients_update'),
    path('api/clients/<int:client_id>/delete/', views.api_clients_delete, name='api_clients_delete'),
    
    # Product API endpoints
    path('api/products/', views.api_products_list, name='api_products_list'),
    path('api/products/all/', views.api_products_all, name='api_products_all'),
    path('api/products/create/', views.api_products_create, name='api_products_create'),
    path('api/products/<int:product_id>/update/', views.api_products_update, name='api_products_update'),
    path('api/products/<int:product_id>/delete/', views.api_products_delete, name='api_products_delete'),
]
