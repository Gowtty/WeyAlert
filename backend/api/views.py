from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authtoken.models import Token
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from .models import Alert, UserProfile, AlertReaction, AlertComment
from .serializers import (
    AlertSerializer, AlertCreateSerializer, AlertCommentSerializer,
    UserSerializer, UserRegistrationSerializer, UserProfileSerializer
)
from django.utils import timezone
from .categories import get_all_categories

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def categories_list(request):
    """Returns all available categories from the dictionary configuration"""
    categories = get_all_categories()
    return Response(categories)

class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return AlertCreateSerializer
        return AlertSerializer
    
    def get_serializer_context(self):
        """Pass request context to serializer for user_reaction field"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        alert = serializer.save(user=self.request.user)
        # Actualizar estadísticas del usuario
        if hasattr(self.request.user, 'profile'):
            self.request.user.profile.update_statistics()
    
    def perform_update(self, serializer):
        # Check if user is the owner
        if serializer.instance.user != self.request.user:
            raise permissions.PermissionDenied("Solo el creador puede editar esta alerta")
        serializer.save()
    
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
        serializer = AlertSerializer(alerts, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def react(self, request, pk=None):
        """Handle like/dislike reactions to alerts"""
        alert = self.get_object()
        reaction_type = request.data.get('reaction_type')
        
        if reaction_type not in ['like', 'dislike', 'remove']:
            return Response(
                {"error": "reaction_type debe ser 'like', 'dislike' o 'remove'"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            try:
                # Get existing reaction
                existing_reaction = AlertReaction.objects.get(
                    user=request.user,
                    alert=alert
                )
                
                if reaction_type == 'remove':
                    # Remove the reaction
                    existing_reaction.delete()
                else:
                    # Update existing reaction
                    existing_reaction.reaction_type = reaction_type
                    existing_reaction.save()
                    
            except AlertReaction.DoesNotExist:
                if reaction_type != 'remove':
                    # Create new reaction
                    AlertReaction.objects.create(
                        user=request.user,
                        alert=alert,
                        reaction_type=reaction_type
                    )
            
            # Update alert counts
            alert.update_reaction_counts()
            
            # Update user reputation
            if alert.user.profile:
                alert.user.profile.update_statistics()
        
        # Return updated alert data
        serializer = AlertSerializer(alert, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def close(self, request, pk=None):
        """Mark an alert as resolved (only the owner can close it)"""
        alert = self.get_object()
        
        # Check if the user is the owner of the alert
        if alert.user != request.user:
            return Response(
                {"error": "Solo el creador de la alerta puede cerrarla"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if alert is already closed
        if alert.status == 'resolved':
            return Response(
                {"error": "Esta alerta ya está cerrada"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update alert status
        alert.status = 'resolved'
        alert.closed_at = timezone.now()
        alert.save()
        
        # Update user statistics
        if hasattr(request.user, 'profile'):
            request.user.profile.update_statistics()
        
        serializer = AlertSerializer(alert, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get', 'post'], permission_classes=[permissions.IsAuthenticatedOrReadOnly])
    def comments(self, request, pk=None):
        """Get comments for an alert or add a new comment"""
        alert = self.get_object()
        
        if request.method == 'GET':
            comments = alert.comments.all()
            serializer = AlertCommentSerializer(comments, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # Check if user is authenticated
            if not request.user.is_authenticated:
                return Response(
                    {"error": "Autenticación requerida para comentar"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            text = request.data.get('text')
            if not text:
                return Response(
                    {"error": "El texto del comentario es requerido"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            comment = AlertComment.objects.create(
                user=request.user,
                alert=alert,
                text=text
            )
            
            serializer = AlertCommentSerializer(comment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

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
        serializer = UserProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        # Handle both JSON and multipart/form-data
        data = request.data.copy()
        
        # Handle avatar file upload
        if 'avatar' in request.FILES:
            data['avatar'] = request.FILES['avatar']
        
        serializer = UserProfileSerializer(profile, data=data, partial=True, context={'request': request})
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
            
            # Return with context to get full URLs
            updated_serializer = UserProfileSerializer(profile, context={'request': request})
            return Response(updated_serializer.data)
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