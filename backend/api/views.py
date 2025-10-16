from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .models import Alert, AlertCategory, UserProfile
from .serializers import (
    AlertSerializer, AlertCreateSerializer, AlertCategorySerializer,
    UserSerializer, UserRegistrationSerializer, UserProfileSerializer
)

class AlertCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AlertCategory.objects.all()
    serializer_class = AlertCategorySerializer

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AlertCreateSerializer
        return AlertSerializer
    
    def perform_create(self, serializer):
        alert = serializer.save(user=self.request.user)
        # Actualizar estadísticas del usuario
        if hasattr(self.request.user, 'profile'):
            self.request.user.profile.update_statistics()
    
    def perform_destroy(self, instance):
        # Actualizar estadísticas antes de eliminar
        user_profile = instance.user.profile
        super().perform_destroy(instance)
        user_profile.update_statistics()
    
    @action(detail=False, methods=['get'])
    def nearby(self, request):
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        radius = request.query_params.get('radius', 5)
        
        if not lat or not lng:
            return Response(
                {"error": "Latitud y longitud son requeridas"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Aquí puedes implementar la lógica de búsqueda por cercanía
        # Por ahora retornamos todas las alertas activas
        alerts = Alert.objects.filter(status='active')
        serializer = AlertSerializer(alerts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_alerts(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"error": "Autenticación requerida"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        alerts = Alert.objects.filter(user=request.user)
        serializer = AlertSerializer(alerts, many=True)
        return Response(serializer.data)

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Usuarios solo pueden ver su propio perfil
        return UserProfile.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        try:
            profile = UserProfile.objects.get(user=request.user)
        except UserProfile.DoesNotExist:
            # Crear perfil si no existe
            profile = UserProfile.objects.create(user=request.user)
        
        if request.method == 'GET':
            serializer = UserProfileSerializer(profile)
            return Response(serializer.data)
        
        elif request.method == 'PATCH':
            serializer = UserProfileSerializer(profile, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                
                # Actualizar también el usuario si se envían datos
                user_data = {}
                if 'email' in request.data:
                    user_data['email'] = request.data['email']
                if 'first_name' in request.data:
                    user_data['first_name'] = request.data['first_name']
                if 'last_name' in request.data:
                    user_data['last_name'] = request.data['last_name']
                
                if user_data:
                    User.objects.filter(pk=request.user.pk).update(**user_data)
                    # Actualizar el objeto user en la solicitud
                    request.user.refresh_from_db()
                
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        
        if not user.check_password(current_password):
            return Response(
                {"error": "Contraseña actual incorrecta"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(new_password)
        user.save()
        
        return Response({"message": "Contraseña cambiada correctamente"})

class UserRegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        print("Datos recibidos:", request.data)  # Debug
        print("Headers:", request.headers)  # Debug
        
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token, created = Token.objects.get_or_create(user=user) 
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key
            }, status=status.HTTP_201_CREATED)
        else:
            print("Errores del serializer:", serializer.errors)  # Debug
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserLoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # Añade esta línea

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(username=username, password=password)
        
        if user:
            token, created = Token.objects.get_or_create(user=user) 
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key
            })
        
        return Response(
            {"error": "Credenciales inválidas"},
            status=status.HTTP_401_UNAUTHORIZED
        )

class UserLogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        request.user.auth_token.delete() 
        return Response({"message": "Sesión cerrada exitosamente"}, status=status.HTTP_200_OK)

# Vistas function-based para compatibilidad
@api_view(['GET', 'PATCH'])
@permission_classes([permissions.IsAuthenticated])
def user_profile(request):
    """Vista function-based para el perfil de usuario"""
    try:
        profile = UserProfile.objects.get(user=request.user)
    except UserProfile.DoesNotExist:
        profile = UserProfile.objects.create(user=request.user)
    
    if request.method == 'GET':
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            
            # Actualizar datos del usuario
            user_data = {}
            if 'email' in request.data:
                user_data['email'] = request.data['email']
            if 'first_name' in request.data:
                user_data['first_name'] = request.data['first_name']
            if 'last_name' in request.data:
                user_data['last_name'] = request.data['last_name']
            
            if user_data:
                User.objects.filter(pk=request.user.pk).update(**user_data)
                request.user.refresh_from_db()
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """Vista function-based para cambiar contraseña"""
    user = request.user
    current_password = request.data.get('current_password')
    new_password = request.data.get('new_password')
    
    if not user.check_password(current_password):
        return Response(
            {"error": "Contraseña actual incorrecta"}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user.set_password(new_password)
    user.save()
    
    return Response({"message": "Contraseña cambiada correctamente"})