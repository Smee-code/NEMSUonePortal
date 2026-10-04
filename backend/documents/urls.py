from django.urls import path

from .views import (
    AdminDocumentReportView,
    RegistrarDocumentCountsView,
    RegistrarDocumentListView,
    RegistrarDocumentStatusView,
    StudentDocumentListView,
    StudentDocumentSubmitView,
)

urlpatterns = [
    # Student
    path('request/',            StudentDocumentSubmitView.as_view(), name='document-submit'),
    path('my/',                 StudentDocumentListView.as_view(),   name='document-my'),
    # Registrar / Admin
    path('all/',                RegistrarDocumentListView.as_view(), name='document-all'),
    path('counts/',             RegistrarDocumentCountsView.as_view(), name='document-counts'),
    path('all/<uuid:pk>/status/', RegistrarDocumentStatusView.as_view(), name='document-status'),
    # Admin — reports
    path('admin/reports/',      AdminDocumentReportView.as_view(),   name='admin-document-report'),
]
