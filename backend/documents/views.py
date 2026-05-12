import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models import AuditLog
from authentication.permissions import IsRegistrarOrAdmin, IsStudent, get_client_ip

from .models import DocumentRequest
from .serializers import (
    DocumentRequestStudentSerializer,
    DocumentRequestSubmitSerializer,
    RegistrarDocumentSerializer,
    RegistrarStatusUpdateSerializer,
)
from .throttles import (
    DocumentListThrottle,
    DocumentSubmitThrottle,
    RegistrarDocumentManageThrottle,
)

logger = logging.getLogger('security')


def _audit(user, role, action, resource, ip, result='success', extra=None):
    try:
        AuditLog.objects.create(
            user=user, role=role or '', action=action, resource=resource,
            ip_address=ip, result=result, extra=extra or {},
        )
    except Exception:
        logger.error('Audit log write failed', exc_info=True)


def _send_status_email(doc_req):
    """Notify the student when their document request status changes."""
    try:
        status_label = doc_req.get_status_display()
        doc_label    = doc_req.get_document_type_display()
        subject = f'[NEMSUonePortal] Document Request Update — {doc_label}'

        body_lines = [
            f'Hello {doc_req.student.full_name},',
            '',
            f'Your request for {doc_label} has been updated.',
            f'Status: {status_label}',
        ]
        if doc_req.remarks:
            body_lines.append(f'Remarks: {doc_req.remarks}')

        if doc_req.status == DocumentRequest.STATUS_READY:
            body_lines += [
                '',
                'Your document is ready for release.',
                'Please visit the Registrar\'s Office to claim it.',
            ]
        elif doc_req.status == DocumentRequest.STATUS_REJECTED:
            body_lines += [
                '',
                'Your request has been rejected.',
                'Please contact the Registrar\'s Office for more information.',
            ]

        body_lines += [
            '',
            f'Track your request at: {settings.FRONTEND_URL}',
        ]

        send_mail(
            subject,
            '\n'.join(body_lines),
            settings.DEFAULT_FROM_EMAIL,
            [doc_req.student.institutional_email],
            fail_silently=True,
        )
    except Exception:
        logger.error('Failed to send document status email', exc_info=True)


class DocumentRequestPagination(LimitOffsetPagination):
    default_limit = 20
    max_limit = 100


# ── Student views ──────────────────────────────────────────────────────────────

class StudentDocumentSubmitView(APIView):
    """POST /api/documents/request/ — student submits a new document request."""
    permission_classes = [IsAuthenticated, IsStudent]
    throttle_classes   = [DocumentSubmitThrottle]

    def post(self, request):
        serializer = DocumentRequestSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        ip   = get_client_ip(request)

        # D-01: prevent duplicate active requests for the same document type
        if DocumentRequest.objects.filter(
            student=request.user,
            document_type=data['document_type'],
            status__in=[
                DocumentRequest.STATUS_SUBMITTED,
                DocumentRequest.STATUS_PROCESSING,
                DocumentRequest.STATUS_READY,
            ],
        ).exists():
            _audit(
                request.user, request.user.role,
                'document_request_duplicate', request.path, ip, 'failure',
                {'document_type': data['document_type']},
            )
            return Response(
                {'error': 'You already have an active request for this document type. '
                          'Wait for it to be processed before submitting another.'},
                status=status.HTTP_409_CONFLICT,
            )

        doc = DocumentRequest.objects.create(
            student=request.user,
            document_type=data['document_type'],
            purpose=data.get('purpose', ''),
            copies=data.get('copies', 1),
        )
        _audit(
            request.user, request.user.role,
            'document_request_submitted', f'document:{doc.id}', ip, 'success',
            {'type': doc.document_type, 'copies': doc.copies},
        )
        return Response(
            DocumentRequestStudentSerializer(doc).data,
            status=status.HTTP_201_CREATED,
        )


class StudentDocumentListView(generics.ListAPIView):
    """GET /api/documents/my/ — student views their own request history."""
    serializer_class   = DocumentRequestStudentSerializer
    permission_classes = [IsAuthenticated, IsStudent]
    throttle_classes   = [DocumentListThrottle]

    def get_queryset(self):
        # A01 + IDOR: scoped to authenticated student only
        return DocumentRequest.objects.filter(student=self.request.user)


# ── Registrar / Admin views ────────────────────────────────────────────────────

class RegistrarDocumentListView(generics.ListAPIView):
    """GET /api/documents/all/ — paginated list with filters (registrar/admin)."""
    serializer_class   = RegistrarDocumentSerializer
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    throttle_classes   = [DocumentListThrottle]
    pagination_class   = DocumentRequestPagination

    def get_queryset(self):
        qs = DocumentRequest.objects.select_related('student', 'processed_by')
        p  = self.request.query_params

        if p.get('status'):
            qs = qs.filter(status=p['status'])
        if p.get('document_type'):
            qs = qs.filter(document_type=p['document_type'])

        # D-02: truncate search to prevent slow queries
        q = (p.get('student') or '')[:100].strip()
        if q:
            qs = (
                qs.filter(student__full_name__icontains=q) |
                qs.filter(student__student_id__icontains=q)
            ).distinct()
        return qs.order_by('-submitted_at')

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        # D-03: audit bulk PII access (RA 10173)
        _audit(
            request.user, request.user.role,
            'document_list_accessed', request.path,
            get_client_ip(request), 'success',
            {'filters': dict(request.query_params)},
        )
        return response


class RegistrarDocumentStatusView(APIView):
    """PATCH /api/documents/all/<uuid>/status/
    Registrar updates the status of a document request with optional remarks."""
    permission_classes = [IsAuthenticated, IsRegistrarOrAdmin]
    throttle_classes   = [RegistrarDocumentManageThrottle]

    def patch(self, request, pk):
        ip = get_client_ip(request)

        try:
            doc = DocumentRequest.objects.select_related('student').get(pk=pk)
        except DocumentRequest.DoesNotExist:
            return Response({'error': 'Document request not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = RegistrarStatusUpdateSerializer(
            data=request.data,
            context={'current_status': doc.status},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        old_status  = doc.status
        doc.status  = data['status']
        doc.remarks = data.get('remarks', doc.remarks)
        doc.processed_by = request.user
        doc.processed_at = timezone.now()
        doc.save()

        _audit(
            request.user, request.user.role,
            'document_status_updated', f'document:{doc.id}', ip, 'success',
            {
                'student': str(doc.student.id),
                'type': doc.document_type,
                'old_status': old_status,
                'new_status': doc.status,
            },
        )
        _send_status_email(doc)

        return Response(RegistrarDocumentSerializer(doc).data)
