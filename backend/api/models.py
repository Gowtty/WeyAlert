from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from .categories import get_category_choices, get_category

class Alert(models.Model):
    STATUS_CHOICES = [
        ('active', 'Activa'),
        ('resolved', 'Resuelta'),
        ('expired', 'Expirada'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alerts')
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=get_category_choices())
    latitude = models.FloatField()
    longitude = models.FloatField()
    image = models.ImageField(upload_to='alerts/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    likes_count = models.IntegerField(default=0)
    dislikes_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    closed_at = models.DateTimeField(blank=True, null=True)
    
    def get_category_detail(self):
        """Returns the full category data from the dictionary"""
        return get_category(self.category)
    
    def update_reaction_counts(self):
        """Update the cached like/dislike counts"""
        self.likes_count = self.reactions.filter(reaction_type='like').count()
        self.dislikes_count = self.reactions.filter(reaction_type='dislike').count()
        self.save(update_fields=['likes_count', 'dislikes_count'])
    
    def __str__(self):
        return self.title

class AlertReaction(models.Model):
    """Model to track user reactions (likes/dislikes) on alerts"""
    REACTION_CHOICES = [
        ('like', 'Like'),
        ('dislike', 'Dislike'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alert_reactions')
    alert = models.ForeignKey(Alert, on_delete=models.CASCADE, related_name='reactions')
    reaction_type = models.CharField(max_length=10, choices=REACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'alert')  # One reaction per user per alert
    
    def __str__(self):
        return f"{self.user.username} - {self.reaction_type} - {self.alert.title}"

class AlertComment(models.Model):
    """Model to track user comments on alerts"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='alert_comments')
    alert = models.ForeignKey(Alert, on_delete=models.CASCADE, related_name='comments')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} on {self.alert.title}: {self.text[:50]}..."

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
        
        # Calcular puntos de reputación basado en likes/dislikes
        user_alerts = Alert.objects.filter(user=self.user)
        total_likes = sum(alert.likes_count for alert in user_alerts)
        total_dislikes = sum(alert.dislikes_count for alert in user_alerts)
        
        self.reputation_points = (
            self.alerts_reported * 10 + 
            self.alerts_resolved * 20 +
            total_likes * 5 -  # +5 points per like
            total_dislikes * 3  # -3 points per dislike
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