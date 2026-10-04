from django.urls import path

from .views import (
    FacilityBuildingDetailView,
    FacilityBuildingListCreateView,
    FacilityRoomCreateView,
    FacilityRoomDetailView,
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
    # Facilities — buildings & rooms
    path('facilities/buildings/', FacilityBuildingListCreateView.as_view(), name='facility-buildings'),
    path('facilities/buildings/<int:pk>/', FacilityBuildingDetailView.as_view(), name='facility-building-detail'),
    path('facilities/buildings/<int:building_id>/rooms/', FacilityRoomCreateView.as_view(), name='facility-room-create'),
    path('facilities/rooms/<int:pk>/', FacilityRoomDetailView.as_view(), name='facility-room-detail'),
    path('', ScheduleListCreateView.as_view(), name='schedule-list-create'),
    path('<int:pk>/', ScheduleDetailView.as_view(), name='schedule-detail'),
]
