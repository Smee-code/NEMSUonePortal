from django.urls import path

from .views import (
    FacultyScheduleSlotCreateView,
    FacultyScheduleSlotDeleteView,
    FacultyScheduleView,
    ScheduleDetailView,
    ScheduleListCreateView,
    StudentScheduleView,
)

urlpatterns = [
    path('student/', StudentScheduleView.as_view(), name='student-schedule'),
    path('faculty/', FacultyScheduleView.as_view(), name='faculty-schedule'),
    path('faculty/slots/', FacultyScheduleSlotCreateView.as_view(), name='faculty-slot-create'),
    path('faculty/slots/<int:pk>/', FacultyScheduleSlotDeleteView.as_view(), name='faculty-slot-delete'),
    path('', ScheduleListCreateView.as_view(), name='schedule-list-create'),
    path('<int:pk>/', ScheduleDetailView.as_view(), name='schedule-detail'),
]
