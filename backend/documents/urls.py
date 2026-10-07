from django.urls import path

from .views import (
    AdminDocumentReportView,
    AdminDocumentTypeDetailView,
    AdminDocumentTypeListCreateView,
    DocumentTypeListView,
    RegistrarDocumentCountsView,
    RegistrarDocumentListView,
    RegistrarDocumentStatusView,
    StudentDocumentListView,
    StudentDocumentSubmitView,
)

urlpatterns = [
    # Catalog (document types)
    path('types/',             DocumentTypeListView.as_view(),      name='document-types'),
    # Student
    path('request/',            StudentDocumentSubmitView.as_view(), name='document-submit'),
    path('my/',                 StudentDocumentListView.as_view(),   name='document-my'),
    # Registrar / Admin
    path('all/',                RegistrarDocumentListView.as_view(), name='document-all'),
    path('counts/',             RegistrarDocumentCountsView.as_view(), name='document-counts'),
    path('all/<uuid:pk>/status/', RegistrarDocumentStatusView.as_view(), name='document-status'),
    # Admin — reports + catalog management
    path('admin/reports/',      AdminDocumentReportView.as_view(),   name='admin-document-report'),
    path('admin/types/',        AdminDocumentTypeListCreateView.as_view(), name='admin-document-types'),
    path('admin/types/<int:pk>/', AdminDocumentTypeDetailView.as_view(), name='admin-document-type-detail'),
]
