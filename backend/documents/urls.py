from django.urls import path

from .views import (
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
    path('all/<uuid:pk>/status/', RegistrarDocumentStatusView.as_view(), name='document-status'),
]
