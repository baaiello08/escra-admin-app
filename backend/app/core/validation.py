"""
Validation Helpers

Common validation functions for API endpoints.
"""

from typing import Optional
from bson import ObjectId  # type: ignore
from bson.errors import InvalidId  # type: ignore

from app.core.exceptions import ValidationErrorException, NotFoundError


def validate_object_id(id_str: str, resource_name: str = "Resource") -> ObjectId:
    """
    Validate and convert a string to MongoDB ObjectId.
    
    Args:
        id_str: String to validate
        resource_name: Name of the resource for error messages
        
    Returns:
        ObjectId instance
        
    Raises:
        ValidationErrorException: If ID format is invalid
    """
    if not id_str:
        raise ValidationErrorException(f"{resource_name} ID is required")
    
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError):
        raise ValidationErrorException(f"Invalid {resource_name} ID format: {id_str}")


def validate_pagination_params(skip: int, limit: int) -> tuple[int, int]:
    """
    Validate and normalize pagination parameters.
    
    Args:
        skip: Number of items to skip
        limit: Number of items per page
        
    Returns:
        Tuple of (skip, limit) normalized values
        
    Raises:
        ValidationErrorException: If parameters are invalid
    """
    if skip < 0:
        raise ValidationErrorException("skip must be >= 0")
    
    if limit < 1:
        raise ValidationErrorException("limit must be >= 1")
    
    if limit > 1000:
        raise ValidationErrorException("limit cannot exceed 1000")
    
    return skip, limit


def validate_tenant_id(tenant_id: Optional[str], required: bool = False) -> Optional[ObjectId]:
    """
    Validate tenant ID if provided.
    
    Args:
        tenant_id: Tenant ID string (optional)
        required: Whether tenant_id is required
        
    Returns:
        ObjectId if provided, None otherwise
        
    Raises:
        ValidationErrorException: If required but not provided or invalid format
    """
    if required and not tenant_id:
        raise ValidationErrorException("tenant_id is required")
    
    if tenant_id:
        return validate_object_id(tenant_id, "Tenant")
    
    return None


def validate_user_id(user_id: Optional[str], required: bool = False) -> Optional[ObjectId]:
    """
    Validate user ID if provided.
    
    Args:
        user_id: User ID string (optional)
        required: Whether user_id is required
        
    Returns:
        ObjectId if provided, None otherwise
        
    Raises:
        ValidationErrorException: If required but not provided or invalid format
    """
    if required and not user_id:
        raise ValidationErrorException("user_id is required")
    
    if user_id:
        return validate_object_id(user_id, "User")
    
    return None

