from django.contrib import admin

from authentication.models import AuditLog

from .models import Announcement


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ['title', 'target_audience', 'posted_by', 'is_pinned', 'is_active', 'created_at']
    list_filter = ['target_audience', 'is_pinned', 'is_active']
    search_fields = ['title', 'body', 'posted_by__full_name']
    readonly_fields = ['created_at', 'updated_at']

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        AuditLog.objects.create(
            user=request.user,
            role=request.user.role,
            action='admin_update_announcement' if change else 'admin_create_announcement',
            resource=f'announcement:{obj.id}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
            result='success',
            extra={},
        )

    def delete_model(self, request, obj):
        AuditLog.objects.create(
            user=request.user,
            role=request.user.role,
            action='admin_delete_announcement',
            resource=f'announcement:{obj.id}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
            result='success',
            extra={},
        )
        super().delete_model(request, obj)
