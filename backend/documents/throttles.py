from rest_framework.throttling import UserRateThrottle


class DocumentSubmitThrottle(UserRateThrottle):
    scope = 'document_submit'


class DocumentListThrottle(UserRateThrottle):
    scope = 'document_list'


class RegistrarDocumentManageThrottle(UserRateThrottle):
    scope = 'registrar_document_manage'
