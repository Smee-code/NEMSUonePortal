from django.contrib import admin

from authentication.models import AuditLog

from .models import ClassSchedule


@admin.register(ClassSchedule)
class ClassScheduleAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'day_of_week', 'start_time', 'end_time', 'room']
    list_filter = ['day_of_week', 'teaching_assignment__academic_term']
    search_fields = [
        'teaching_assignment__subject__code',
        'teaching_assignment__faculty__full_name',
        'room',
    ]

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        AuditLog.objects.create(
            user=request.user,
            role=request.user.role,
            action='admin_update_schedule' if change else 'admin_create_schedule',
            resource=f'schedule:{obj.id}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
            result='success',
            extra={},
        )

    def delete_model(self, request, obj):
        AuditLog.objects.create(
            user=request.user,
            role=request.user.role,
            action='admin_delete_schedule',
            resource=f'schedule:{obj.id}',
            ip_address=request.META.get('REMOTE_ADDR', ''),
            result='success',
            extra={},
        )
        super().delete_model(request, obj)
