from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import AuditLog, EmailVerificationToken, PasswordResetToken, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = [
        'institutional_email', 'full_name', 'student_id',
        'role', 'is_active', 'is_verified', 'date_joined',
    ]
    list_filter = ['role', 'is_active', 'is_verified']
    search_fields = ['institutional_email', 'full_name', 'student_id']
    ordering = ['-date_joined']
    readonly_fields = ['date_joined', 'last_login', 'failed_login_attempts', 'locked_until']

    fieldsets = (
        (None, {'fields': ('institutional_email', 'password')}),
        ('Personal Info', {'fields': ('full_name', 'student_id', 'contact_number')}),
        ('Role & Status', {'fields': ('role', 'is_active', 'is_verified', 'is_staff', 'is_superuser')}),
        ('Groups & Permissions', {'fields': ('groups', 'user_permissions')}),
        ('Security', {'fields': ('failed_login_attempts', 'locked_until')}),
        ('Timestamps', {'fields': ('date_joined', 'last_login')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'institutional_email', 'student_id', 'full_name',
                'role', 'password1', 'password2',
            ),
        }),
    )


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Audit logs are read-only — no insert/edit/delete via admin UI."""
    list_display = ['timestamp', 'user', 'role', 'action', 'resource', 'ip_address', 'result']
    list_filter = ['result', 'role', 'action']
    search_fields = ['user__institutional_email', 'action', 'resource', 'ip_address']
    readonly_fields = ['user', 'role', 'action', 'resource', 'ip_address', 'timestamp', 'result', 'extra']
    ordering = ['-timestamp']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'created_at', 'expires_at']
    readonly_fields = ['user', 'token', 'created_at', 'expires_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'created_at', 'expires_at', 'used']
    readonly_fields = ['user', 'token', 'created_at', 'expires_at', 'used']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
