import logging

from django.contrib import admin

from authentication.models import AuditLog
from authentication.permissions import get_client_ip

from .models import AcademicTerm, Department, EnrollmentRequest, EnrollmentSubject, Program, Subject

logger = logging.getLogger('security')


def _audit_admin(request, action, resource, result='success', extra=None):
    try:
        AuditLog.objects.create(
            user=request.user,
            role=getattr(request.user, 'role', ''),
            action=action,
            resource=resource,
            ip_address=get_client_ip(request),
            result=result,
            extra=extra or {},
        )
    except Exception:
        logger.error('Admin audit log write failed', exc_info=True)


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'is_active']
    list_filter = ['is_active']
    search_fields = ['code', 'name']
    ordering = ['name']

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        action = 'department_updated' if change else 'department_created'
        _audit_admin(request, action, f'/admin/enrollment/department/{obj.pk}/',
                     extra={'department': str(obj)})

    def delete_model(self, request, obj):
        _audit_admin(request, 'department_deleted',
                     f'/admin/enrollment/department/{obj.pk}/',
                     extra={'department': str(obj)})
        super().delete_model(request, obj)


class ProgramInline(admin.TabularInline):
    model = Program
    extra = 0
    fields = ['code', 'name', 'is_active']
    show_change_link = True


@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'department', 'is_active']
    list_filter = ['is_active', 'department']
    search_fields = ['code', 'name', 'department__name']
    ordering = ['department__name', 'name']

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        action = 'program_updated' if change else 'program_created'
        _audit_admin(request, action, f'/admin/enrollment/program/{obj.pk}/',
                     extra={'program': str(obj)})

    def delete_model(self, request, obj):
        _audit_admin(request, 'program_deleted',
                     f'/admin/enrollment/program/{obj.pk}/',
                     extra={'program': str(obj)})
        super().delete_model(request, obj)


@admin.register(AcademicTerm)
class AcademicTermAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'is_active', 'enrollment_open', 'start_date', 'end_date']
    list_filter = ['is_active', 'enrollment_open', 'semester']
    search_fields = ['year']
    ordering = ['-year', 'semester']

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        action = 'academic_term_updated' if change else 'academic_term_created'
        _audit_admin(request, action, f'/admin/enrollment/academicterm/{obj.pk}/',
                     extra={'term': str(obj)})

    def delete_model(self, request, obj):
        _audit_admin(request, 'academic_term_deleted',
                     f'/admin/enrollment/academicterm/{obj.pk}/',
                     extra={'term': str(obj)})
        super().delete_model(request, obj)


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'units', 'year_level', 'program', 'is_active']
    list_filter = ['is_active', 'year_level', 'program__department']
    search_fields = ['code', 'name', 'program__name']
    ordering = ['code']
    autocomplete_fields = ['program']

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        action = 'subject_updated' if change else 'subject_created'
        _audit_admin(request, action, f'/admin/enrollment/subject/{obj.pk}/',
                     extra={'subject': str(obj)})

    def delete_model(self, request, obj):
        _audit_admin(request, 'subject_deleted',
                     f'/admin/enrollment/subject/{obj.pk}/',
                     extra={'subject': str(obj)})
        super().delete_model(request, obj)


class EnrollmentSubjectInline(admin.TabularInline):
    model = EnrollmentSubject
    extra = 0
    readonly_fields = ['subject']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(EnrollmentRequest)
class EnrollmentRequestAdmin(admin.ModelAdmin):
    list_display = ['student', 'academic_term', 'status', 'submitted_at', 'processed_by']
    list_filter = ['status', 'academic_term']
    search_fields = [
        'student__full_name', 'student__student_id', 'student__institutional_email',
    ]
    readonly_fields = ['id', 'student', 'academic_term', 'submitted_at', 'processed_at', 'processed_by']
    inlines = [EnrollmentSubjectInline]
    ordering = ['-submitted_at']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
