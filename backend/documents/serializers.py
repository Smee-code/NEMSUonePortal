from rest_framework import serializers

from .models import DocumentRequest, DocumentType


class DocumentTypeSerializer(serializers.ModelSerializer):
    """The catalog entry — read by students, managed by the admin."""
    class Meta:
        model = DocumentType
        fields = ['id', 'code', 'name', 'description', 'fee',
                  'processing_days', 'is_active', 'sort_order']
        read_only_fields = ['id', 'code']


def _doc_type_display(obj):
    """Friendly name for a request's document type (from the catalog, so admin-
    added types resolve too), falling back to the built-in choice label."""
    dt = DocumentType.objects.filter(code=obj.document_type).first()
    return dt.name if dt else obj.get_document_type_display()


class DocumentRequestStudentSerializer(serializers.ModelSerializer):
    """Read serializer for the student's own request history."""
    document_type_display = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    def get_document_type_display(self, obj):
        return _doc_type_display(obj)

    class Meta:
        model = DocumentRequest
        fields = [
            'id', 'document_type', 'document_type_display',
            'purpose', 'copies',
            'status', 'status_display', 'remarks',
            'submitted_at', 'updated_at',
        ]
        read_only_fields = fields


class DocumentRequestSubmitSerializer(serializers.Serializer):
    """Write serializer for submitting a new document request."""
    document_type = serializers.CharField()
    purpose = serializers.CharField(
        required=False, allow_blank=True, max_length=500
    )
    copies = serializers.IntegerField(default=1, min_value=1, max_value=5)

    def validate_document_type(self, value):
        if not DocumentType.objects.filter(code=value, is_active=True).exists():
            raise serializers.ValidationError('That document is not available for request.')
        return value

    def validate_purpose(self, value):
        return value.strip()


class RegistrarDocumentSerializer(serializers.ModelSerializer):
    """Full read serializer for registrar — includes student PII."""
    student_name       = serializers.CharField(source='student.full_name', read_only=True)
    student_id_no      = serializers.CharField(source='student.student_id', read_only=True)
    student_email      = serializers.CharField(source='student.institutional_email', read_only=True)
    document_type_display = serializers.SerializerMethodField()
    status_display     = serializers.CharField(source='get_status_display', read_only=True)
    processed_by_name  = serializers.SerializerMethodField()
    next_statuses      = serializers.SerializerMethodField()

    def get_document_type_display(self, obj):
        return _doc_type_display(obj)

    class Meta:
        model = DocumentRequest
        fields = [
            'id',
            'student_name', 'student_id_no', 'student_email',
            'document_type', 'document_type_display',
            'purpose', 'copies',
            'status', 'status_display', 'next_statuses',
            'remarks',
            'submitted_at', 'updated_at',
            'processed_by_name', 'processed_at',
        ]

    def get_processed_by_name(self, obj):
        return obj.processed_by.full_name if obj.processed_by else None

    def get_next_statuses(self, obj):
        return DocumentRequest.VALID_TRANSITIONS.get(obj.status, [])


class RegistrarStatusUpdateSerializer(serializers.Serializer):
    """Write serializer for registrar updating a request's status."""
    status  = serializers.ChoiceField(
        choices=[
            DocumentRequest.STATUS_PROCESSING,
            DocumentRequest.STATUS_READY,
            DocumentRequest.STATUS_RELEASED,
            DocumentRequest.STATUS_REJECTED,
        ]
    )
    remarks = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate_remarks(self, value):
        return value.strip()

    def validate(self, data):
        current  = self.context.get('current_status', '')
        new      = data['status']
        allowed  = DocumentRequest.VALID_TRANSITIONS.get(current, [])
        if new not in allowed:
            raise serializers.ValidationError(
                {'status': f'Cannot transition from "{current}" to "{new}".'}
            )
        if new == DocumentRequest.STATUS_REJECTED and not data.get('remarks', '').strip():
            raise serializers.ValidationError(
                {'remarks': 'A reason is required when rejecting a request.'}
            )
        return data
