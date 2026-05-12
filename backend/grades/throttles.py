from rest_framework.throttling import UserRateThrottle


class GradeEncodeThrottle(UserRateThrottle):
    scope = 'grade_encode'


class GradeSubmitThrottle(UserRateThrottle):
    scope = 'grade_submit'


class RegistrarGradeReadThrottle(UserRateThrottle):
    scope = 'registrar_grade_read'


class FacultyStudentGradeReadThrottle(UserRateThrottle):
    scope = 'faculty_grade_read'
