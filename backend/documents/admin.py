from django.contrib import admin

from authentication.models import AuditLog

from .models import DocumentRequest


@admin.register(DocumentRequest)
class DocumentRequestAdmin(admin.ModelAdmin):
    list_display  = ['__str__', 'document_type', 'status', 'copies', 'submitted_at', 'processed_by']
    list_filter   = ['status', 'document_type']
    search_fields = ['student__full_name', 'student__student_id']
    readonly_fields = ['id', 'submitted_at', 'updated_at', 'processed_at']

    def has_add_permission(self, request):
        return False  # requests come from students only

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if change:
            AuditLog.objects.create(
                user=request.user,
                role=request.user.role,
                action='admin_update_document_request',
                resource=f'document:{obj.id}',
                ip_address=request.META.get('REMOTE_ADDR', ''),
                result='success',
                extra={'status': obj.status},
            )
