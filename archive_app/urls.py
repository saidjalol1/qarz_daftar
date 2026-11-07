"""
URL configuration for archive_app
"""
from django.urls import path
from . import views

app_name = 'archive_app'

urlpatterns = [
    # Page
    path('', views.archive_view, name='archive'),
    
    # Archived Debts API endpoints
    path('api/debts/', views.api_archive_debts_list, name='api_debts_list'),
    path('api/debts/<int:debt_id>/restore/', views.api_debt_restore, name='api_debt_restore'),
    
    # Archived Clients API endpoints
    path('api/clients/', views.api_archive_clients_list, name='api_clients_list'),
    path('api/clients/<int:client_id>/restore/', views.api_client_restore, name='api_client_restore'),
    
    # Archived Products API endpoints
    path('api/products/', views.api_archive_products_list, name='api_products_list'),
    path('api/products/<int:product_id>/restore/', views.api_product_restore, name='api_product_restore'),
]
