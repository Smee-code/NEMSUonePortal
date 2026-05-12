import logging

from django.contrib import admin

from authentication.models import AuditLog
from authentication.permissions import get_client_ip

from .models import GradeRecord, TeachingAssignment

logger = logging.getLogger('security')


def _audit_admin(request, action, resource, extra=None):
    try:
        AuditLog.objects.create(
            user=request.user,
            role=getattr(request.user, 'role', ''),
            action=action,
            resource=resource,
            ip_address=get_client_ip(request),
            result='success',
            extra=extra or {},
        )
    except Exception:
        logger.error('Admin audit log write failed', exc_info=True)


@admin.register(TeachingAssignment)
class TeachingAssignmentAdmin(admin.ModelAdmin):
    list_display = ['faculty', 'subject', 'academic_term', 'assigned_by', 'assigned_at']
    list_filter = ['academic_term', 'subject']
    search_fields = ['faculty__full_name', 'subject__code']
    ordering = ['-academic_term__year', 'subject__code']
    readonly_fields = ['assigned_at', 'assigned_by']

    def save_model(self, request, obj, form, change):
        if not change:
            obj.assigned_by = request.user
        super().save_model(request, obj, form, change)
        action = 'teaching_assignment_updated' if change else 'teaching_assignment_created'
        _audit_admin(request, action, f'/admin/grades/teachingassignment/{obj.pk}/',
                     extra={'assignment': str(obj)})

    def delete_model(self, request, obj):
        _audit_admin(request, 'teaching_assignment_deleted',
                     f'/admin/grades/teachingassignment/{obj.pk}/',
                     extra={'assignment': str(obj)})
        super().delete_model(request, obj)


@admin.register(GradeRecord)
class GradeRecordAdmin(admin.ModelAdmin):
    list_display = ['student', 'subject', 'academic_term', 'grade', 'is_submitted', 'encoded_by']
    list_filter = ['is_submitted', 'academic_term', 'grade']
    search_fields = [
        'student__full_name', 'student__student_id',
        'subject__code', 'encoded_by__full_name',
    ]
    readonly_fields = [
        'id', 'student', 'subject', 'academic_term', 'teaching_assignment',
        'encoded_by', 'encoded_at', 'submitted_at',
    ]
    ordering = ['-academic_term__year', 'student__full_name']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
