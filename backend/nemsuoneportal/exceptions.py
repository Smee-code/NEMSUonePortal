import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger('errors')


def custom_exception_handler(exc, context):
    """
    Global DRF exception handler (OWASP A10).
    Catches all unhandled exceptions, logs full detail server-side,
    and returns a generic message to the client — no stack traces exposed.
    """
    response = exception_handler(exc, context)

    if response is None:
        request = context.get('request')
        logger.error(
            'Unhandled server exception',
            exc_info=exc,
            extra={
                'path': request.path if request else None,
                'method': request.method if request else None,
                'user_id': (
                    str(request.user.id)
                    if request and request.user.is_authenticated
                    else None
                ),
            },
        )
        return Response(
            {'error': 'An unexpected error occurred. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return response
