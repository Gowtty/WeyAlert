from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class AlertCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=7, default='#3B82F6')  # Color en hex
    
    def __str__(self):
        return self.name

class Alert(models.Model):
    STATUS_CHOICES = [
        ('active', 'Activa'),
        ('resolved', 'Resuelta'),
        ('expired', 'Expirada'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alerts')
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.ForeignKey(AlertCategory, on_delete=models.CASCADE, related_name='alerts')
    latitude = models.FloatField()
    longitude = models.FloatField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.title

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone = models.CharField(max_length=20, blank=True, null=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    alerts_reported = models.IntegerField(default=0)
    alerts_resolved = models.IntegerField(default=0)
    reputation_points = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Perfil de {self.user.username}"
    
    def update_statistics(self):
        """Actualiza las estadísticas del usuario"""
        # Contar alertas reportadas
        self.alerts_reported = Alert.objects.filter(user=self.user).count()
        
        # Contar alertas resueltas
        self.alerts_resolved = Alert.objects.filter(
            user=self.user, 
            status='resolved'
        ).count()
        
        # Calcular puntos de reputación
        self.reputation_points = (
            self.alerts_reported * 10 + 
            self.alerts_resolved * 20
        )
        
        self.save()

# Señal para crear el perfil automáticamente cuando se crea un usuario
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()