"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from ledger import views

urlpatterns = [
    # Pages
    path('', views.home, name='home'),
    path('login/', views.login_view, name='login'),
    path('debts/', views.debts_view, name='debts'),
    path('archive/', views.archive_view, name='archive'),
    path('base/', views.base_view, name='base'),
    path('users/', views.users_view, name='users'),
    
    # API endpoints - Authentication
    path('api/login/', views.api_login, name='api_login'),
    path('api/logout/', views.api_logout, name='api_logout'),
    path('api/me/', views.api_me, name='api_me'),
    
    # API endpoints - User Management
    path('api/users/', views.api_users_list, name='api_users_list'),
    path('api/users/create/', views.api_users_create, name='api_users_create'),
    path('api/users/<int:user_id>/update/', views.api_users_update, name='api_users_update'),
    path('api/users/<int:user_id>/delete/', views.api_users_delete, name='api_users_delete'),
    
    # Admin
    path('admin/', admin.site.urls),
]
