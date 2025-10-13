from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AlertViewSet, AlertCategoryViewSet, UserProfileViewSet,
    UserRegisterView, UserLoginView, UserLogoutView
)

router = DefaultRouter()
router.register(r'alerts', AlertViewSet)
router.register(r'categories', AlertCategoryViewSet)
router.register(r'profiles', UserProfileViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', UserRegisterView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('logout/', UserLogoutView.as_view(), name='logout'),
]