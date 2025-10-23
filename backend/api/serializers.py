from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Alert, UserProfile
from .categories import get_category

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']

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
    
    class Meta:
        model = UserProfile
        fields = ['user', 'phone', 'avatar', 'alerts_reported', 'alerts_resolved', 'reputation_points', 'created_at']
        read_only_fields = ['alerts_reported', 'alerts_resolved', 'reputation_points', 'created_at']

class AlertSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    category_detail = serializers.SerializerMethodField()
    
    class Meta:
        model = Alert
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at']
    
    def get_category_detail(self, obj):
        """Returns the full category data from the dictionary"""
        category_data = get_category(obj.category)
        if category_data:
            return {
                'key': obj.category,
                **category_data
            }
        return None

class AlertCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = ['category', 'title', 'description', 'latitude', 'longitude']