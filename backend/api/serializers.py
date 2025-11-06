from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Alert, UserProfile, AlertReaction, AlertComment
from .categories import get_category

class UserSerializer(serializers.ModelSerializer):
    reputation_points = serializers.IntegerField(source='profile.reputation_points', read_only=True, default=0)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'reputation_points']
        read_only_fields = ['id', 'reputation_points']

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'first_name', 'last_name']
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Las contraseñas no coinciden")
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    avatar_url = serializers.SerializerMethodField()
    avatar = serializers.ImageField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = UserProfile
        fields = ['user', 'phone', 'avatar', 'avatar_url', 'alerts_reported', 'alerts_resolved', 'reputation_points', 'created_at']
        read_only_fields = ['alerts_reported', 'alerts_resolved', 'reputation_points', 'created_at']
    
    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

class AlertCommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = AlertComment
        fields = ['id', 'user', 'text', 'created_at', 'updated_at']
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

class AlertSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    category_detail = serializers.SerializerMethodField()
    image = serializers.ImageField(required=False, allow_null=True)
    user_reaction = serializers.SerializerMethodField()
    comments = AlertCommentSerializer(many=True, read_only=True)
    comments_count = serializers.IntegerField(source='comments.count', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Alert
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at', 'likes_count', 'dislikes_count', 'closed_at']
    
    def get_category_detail(self, obj):
        """Returns the full category data from the dictionary"""
        category_data = get_category(obj.category)
        if category_data:
            return {
                'key': obj.category,
                **category_data
            }
        return None
    
    def get_user_reaction(self, obj):
        """Returns the current user's reaction to this alert"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            try:
                reaction = obj.reactions.get(user=request.user)
                return reaction.reaction_type
            except:
                return None
        return None

class AlertCreateSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = Alert
        fields = ['category', 'title', 'description', 'latitude', 'longitude', 'image']