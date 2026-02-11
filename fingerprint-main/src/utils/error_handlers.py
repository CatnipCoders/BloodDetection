"""
Centralized error handling for Flask application.
Provides consistent error responses and logging.
"""
from flask import jsonify
from werkzeug.exceptions import HTTPException
import logging
import traceback

logger = logging.getLogger(__name__)


class APIError(Exception):
    """Base class for API errors."""
    
    def __init__(self, message: str, status_code: int = 400, payload: dict = None):
        super().__init__()
        self.message = message
        self.status_code = status_code
        self.payload = payload or {}
    
    def to_dict(self):
        """Convert error to dictionary for JSON response."""
        rv = dict(self.payload)
        rv['error'] = self.message
        rv['status_code'] = self.status_code
        return rv


class ValidationError(APIError):
    """Validation error (400)."""
    def __init__(self, message: str, payload: dict = None):
        super().__init__(message, 400, payload)


class NotFoundError(APIError):
    """Resource not found error (404)."""
    def __init__(self, message: str = "Resource not found", payload: dict = None):
        super().__init__(message, 404, payload)


class UnauthorizedError(APIError):
    """Unauthorized access error (401)."""
    def __init__(self, message: str = "Unauthorized", payload: dict = None):
        super().__init__(message, 401, payload)


class ForbiddenError(APIError):
    """Forbidden access error (403)."""
    def __init__(self, message: str = "Forbidden", payload: dict = None):
        super().__init__(message, 403, payload)


class ServerError(APIError):
    """Internal server error (500)."""
    def __init__(self, message: str = "Internal server error", payload: dict = None):
        super().__init__(message, 500, payload)


def register_error_handlers(app):
    """
    Register error handlers with Flask app.
    
    Args:
        app: Flask application instance
    """
    
    @app.errorhandler(APIError)
    def handle_api_error(error):
        """Handle custom API errors."""
        response = jsonify(error.to_dict())
        response.status_code = error.status_code
        logger.warning(f"API Error {error.status_code}: {error.message}")
        return response
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        """Handle Werkzeug HTTP exceptions."""
        response = jsonify({
            'error': error.description,
            'status_code': error.code
        })
        response.status_code = error.code
        logger.warning(f"HTTP Error {error.code}: {error.description}")
        return response
    
    @app.errorhandler(404)
    def handle_not_found(error):
        """Handle 404 errors."""
        return jsonify({
            'error': 'Endpoint not found',
            'status_code': 404
        }), 404
    
    @app.errorhandler(405)
    def handle_method_not_allowed(error):
        """Handle 405 errors."""
        return jsonify({
            'error': 'Method not allowed',
            'status_code': 405
        }), 405
    
    @app.errorhandler(413)
    def handle_request_entity_too_large(error):
        """Handle file upload size errors."""
        return jsonify({
            'error': 'File too large. Maximum upload size exceeded.',
            'status_code': 413
        }), 413
    
    @app.errorhandler(500)
    def handle_internal_error(error):
        """Handle internal server errors."""
        # Log full traceback for debugging
        logger.error(f"Internal Server Error: {str(error)}")
        logger.error(traceback.format_exc())
        
        # Return generic error message to client (don't expose internals)
        return jsonify({
            'error': 'An internal server error occurred. Please try again later.',
            'status_code': 500
        }), 500
    
    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        """Handle any unexpected errors."""
        # Log full traceback
        logger.error(f"Unexpected Error: {str(error)}")
        logger.error(traceback.format_exc())
        
        # Return generic error message
        return jsonify({
            'error': 'An unexpected error occurred. Please try again later.',
            'status_code': 500
        }), 500


def log_request_info(request):
    """
    Log information about incoming request.
    
    Args:
        request: Flask request object
    """
    logger.info(f"Request: {request.method} {request.path}")
    logger.debug(f"Headers: {dict(request.headers)}")
    logger.debug(f"Args: {dict(request.args)}")
    if request.is_json:
        logger.debug(f"JSON: {request.get_json()}")
