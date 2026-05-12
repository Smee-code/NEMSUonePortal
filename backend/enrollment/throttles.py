from rest_framework.throttling import UserRateThrottle


class EnrollmentSubmitThrottle(UserRateThrottle):
    scope = 'enrollment_submit'


class RegistrarReviewThrottle(UserRateThrottle):
    scope = 'registrar_review'


class EnrollmentManageThrottle(UserRateThrottle):
    scope = 'enrollment_manage'
