"""
Custom Exceptions and Error Handling

Standardized error responses and exception handlers for the API.
"""

from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from bson.errors import InvalidId
import structlog

logger = structlog.get_logger()


class ApiError(HTTPException):
    """Base API error with standardized format."""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        errors: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.errors = errors or {}


class NotFoundError(ApiError):
    """Resource not found error."""
    
    def __init__(self, resource: str, resource_id: Optional[str] = None):
        detail = f"{resource} not found"
        if resource_id:
            detail += f" (id: {resource_id})"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="NOT_FOUND",
        )


class ConflictError(ApiError):
    """Resource conflict error (e.g., duplicate)."""
    
    def __init__(self, detail: str, error_code: str = "CONFLICT"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail,
            error_code=error_code,
        )


class ValidationErrorException(ApiError):
    """Input validation error."""
    
    def __init__(self, detail: str, errors: Optional[Dict[str, Any]] = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="VALIDATION_ERROR",
            errors=errors,
        )


class UnauthorizedError(ApiError):
    """Authentication/authorization error."""
    
    def __init__(self, detail: str = "Unauthorized"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="UNAUTHORIZED",
        )


class ForbiddenError(ApiError):
    """Permission denied error."""
    
    def __init__(self, detail: str = "Forbidden"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="FORBIDDEN",
        )


def create_error_response(
    status_code: int,
    detail: str,
    error_code: Optional[str] = None,
    errors: Optional[Dict[str, Any]] = None,
) -> JSONResponse:
    """Create a standardized error response."""
    content = {
        "error": {
            "message": detail,
            "code": error_code or "UNKNOWN_ERROR",
        }
    }
    
    if errors:
        content["error"]["errors"] = errors
    
    return JSONResponse(
        status_code=status_code,
        content=content,
    )


async def validation_exception_handler(request, exc: RequestValidationError):
    """Handle Pydantic validation errors."""
    errors = {}
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"] if loc != "body")
        errors[field] = error["msg"]
    
    logger.warning(
        "Validation error",
        path=request.url.path,
        errors=errors,
    )
    
    return create_error_response(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail="Validation failed",
        error_code="VALIDATION_ERROR",
        errors=errors,
    )


async def http_exception_handler(request, exc: HTTPException):
    """Handle HTTP exceptions with standardized format."""
    error_code = getattr(exc, "error_code", None) or "HTTP_ERROR"
    errors = getattr(exc, "errors", None)
    
    logger.warning(
        "HTTP error",
        path=request.url.path,
        status_code=exc.status_code,
        detail=exc.detail,
    )
    
    return create_error_response(
        status_code=exc.status_code,
        detail=exc.detail,
        error_code=error_code,
        errors=errors,
    )


async def invalid_id_exception_handler(request, exc: InvalidId):
    """Handle invalid MongoDB ObjectId errors."""
    logger.warning(
        "Invalid ObjectId",
        path=request.url.path,
        error=str(exc),
    )
    
    return create_error_response(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid ID format",
        error_code="INVALID_ID",
    )


async def general_exception_handler(request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.error(
        "Unhandled exception",
        path=request.url.path,
        error=str(exc),
        exc_info=True,
    )
    
    return create_error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="An unexpected error occurred",
        error_code="INTERNAL_ERROR",
    )

