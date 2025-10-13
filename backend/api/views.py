from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
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
        serializer.save(user=self.request.user)
    
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
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        profile = UserProfile.objects.get(user=request.user)
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

class UserRegisterView(APIView):
    permission_classes = [permissions.AllowAny] # Anyone can register

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Generate and return token immediately on registration
            token, created = Token.objects.get_or_create(user=user) 
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserLoginView(APIView):
    permission_classes = [permissions.AllowAny] # Allow anonymous access for login

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        # Use Django's authenticate to verify credentials
        user = authenticate(username=username, password=password)
        
        if user:
            # Get or create token for the user
            token, created = Token.objects.get_or_create(user=user) 
            return Response({
                'user': UserSerializer(user).data,
                'token': token.key
            })
        
        # Return generic error for invalid credentials
        return Response(
            {"error": "Credenciales inválidas"},
            status=status.HTTP_401_UNAUTHORIZED
        )

class UserLogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        # Simply delete the user's token, forcing the frontend to re-authenticate
        # This is the correct way to "log out" in a token-based API
        request.user.auth_token.delete() 
        return Response({"message": "Sesión cerrada exitosamente"}, status=status.HTTP_200_OK)

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        profile = UserProfile.objects.get(user=request.user)
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)