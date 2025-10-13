from django.db import models
from django.contrib.auth.models import User

# Categorías de alertas
class AlertCategory(models.Model):
    name = models.CharField(max_length=50)
    icon = models.CharField(max_length=50)  # Nombre del icono para el mapa
    color = models.CharField(max_length=7)  # Color hexadecimal
    
    class Meta:
        verbose_name_plural = "Alert Categories"
    
    def __str__(self):
        return self.name

# Modelo de Alerta
class Alert(models.Model):
    STATUS_CHOICES = [
        ('active', 'Activa'),
        ('resolved', 'Resuelta'),
        ('expired', 'Expirada'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alerts')
    category = models.ForeignKey(AlertCategory, on_delete=models.SET_NULL, null=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    address = models.CharField(max_length=255, blank=True)
    image = models.ImageField(upload_to='alerts/', null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.user.username}"

# Perfil de usuario extendido
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=15, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    alerts_reported = models.IntegerField(default=0)
    alerts_resolved = models.IntegerField(default=0)
    reputation_points = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Profile of {self.user.username}"