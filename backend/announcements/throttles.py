from rest_framework.throttling import UserRateThrottle


class AnnouncementListThrottle(UserRateThrottle):
    scope = 'announcement_list'


class AnnouncementCreateThrottle(UserRateThrottle):
    scope = 'announcement_create'


class AnnouncementManageThrottle(UserRateThrottle):
    scope = 'announcement_manage'
