from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'alerts', views.AlertViewSet)
router.register(r'profiles', views.UserProfileViewSet)

urlpatterns = [
    # Incluir las rutas del router bajo /api/
    path('', include(router.urls)),
    
    # Categories from dictionary
    path('categories/', views.categories_list, name='categories-list'),
    
    # Rutas de autenticación - CORREGIDAS
    path('auth/register/', views.UserRegisterView.as_view(), name='register'),
    path('auth/login/', views.UserLoginView.as_view(), name='login'),
    path('auth/logout/', views.UserLogoutView.as_view(), name='logout'),
    
    # Perfil de usuario - vistas function-based - CORREGIDAS
    path('user/profile/', views.user_profile, name='user-profile'),
    path('user/change-password/', views.change_password, name='change-password'),
]