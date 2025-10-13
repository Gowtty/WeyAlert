from django.contrib import admin
from .models import Alert, AlertCategory, UserProfile

@admin.register(AlertCategory)
class AlertCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'icon', 'color']
    search_fields = ['name']

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