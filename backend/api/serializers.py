from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Alert, AlertCategory, UserProfile

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
        UserProfile.objects.create(user=user)
        return user

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = '__all__'

class AlertCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AlertCategory
        fields = '__all__'

class AlertSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    category_detail = AlertCategorySerializer(source='category', read_only=True)
    
    class Meta:
        model = Alert
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at']

class AlertCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alert
        fields = ['category', 'title', 'description', 'latitude', 'longitude', 'address', 'image']