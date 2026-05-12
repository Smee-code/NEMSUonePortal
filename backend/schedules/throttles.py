from rest_framework.throttling import UserRateThrottle


class StudentScheduleReadThrottle(UserRateThrottle):
    scope = 'student_schedule_read'


class FacultyScheduleReadThrottle(UserRateThrottle):
    scope = 'faculty_schedule_read'


class FacultyScheduleWriteThrottle(UserRateThrottle):
    scope = 'faculty_schedule_write'


class RegistrarScheduleManageThrottle(UserRateThrottle):
    scope = 'registrar_schedule_manage'
