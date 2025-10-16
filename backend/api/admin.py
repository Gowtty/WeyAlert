from django.contrib import admin # type: ignore
from .models import Alert, AlertCategory, UserProfile

@admin.register(AlertCategory)
class AlertCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'color']
    list_editable = ['icon', 'color']
    
def create_default_categories():
    default_categories = [
        {'name': 'Baches', 'icon': 'commute', 'color': '#FF6B35'},
        {'name': 'Inundaciones', 'icon': 'water_damage', 'color': '#1E88E5'},
        {'name': 'Accidentes', 'icon': 'local_hospital', 'color': '#D32F2F'},
        {'name': 'Problemas de Alumbrado', 'icon': 'lightbulb', 'color': '#FFD600'},
        {'name': 'Construcción', 'icon': 'construction', 'color': '#795548'},
        {'name': 'Tráfico', 'icon': 'traffic', 'color': '#FF9800'},
        {'name': 'Seguridad', 'icon': 'security', 'color': '#4CAF50'},
        {'name': 'Emergencia Médica', 'icon': 'ambulance', 'color': '#F44336'},
        {'name': 'Incendio', 'icon': 'fire_truck', 'color': '#FF5722'},
        {'name': 'Policía', 'icon': 'local_police', 'color': '#2196F3'},
        {'name': 'Problemas Eléctricos', 'icon': 'offline_bolt', 'color': '#9C27B0'},
        {'name': 'Clima', 'icon': 'opacity', 'color': '#03A9F4'},
        {'name': 'Otros', 'icon': 'warning', 'color': '#607D8B'}
    ]
    
    for category_data in default_categories:
        AlertCategory.objects.get_or_create(
            name=category_data['name'],
            defaults={'icon': category_data['icon'], 'color': category_data['color']}
        )    

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'category', 'status', 'created_at']
    list_filter = ['status', 'category', 'created_at']
    search_fields = ['title', 'description', 'user__username']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'updated_at']

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'alerts_reported', 'reputation_points', 'created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at']