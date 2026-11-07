"""
URL configuration for debts_app
"""
from django.urls import path
from . import views

app_name = 'debts_app'

urlpatterns = [
    # Page
    path('', views.debts_view, name='debts'),
    
    # API endpoints
    path('api/', views.api_debts_list, name='api_list'),
    path('api/<int:debt_id>/', views.api_debt_detail, name='api_detail'),
    path('api/create/', views.api_debt_create, name='api_create'),
    path('api/<int:debt_id>/delete/', views.api_debt_delete, name='api_delete'),
    path('api/<int:debt_id>/permanent-delete/', views.api_debt_permanent_delete, name='api_permanent_delete'),
    path('api/<int:debt_id>/payment/', views.api_payment_create, name='api_payment_create'),
    path('api/<int:debt_id>/update-items/', views.api_debt_update_items, name='api_update_items'),
]
