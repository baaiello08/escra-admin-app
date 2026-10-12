"""
User Management API

REST endpoints for user management and identity operations.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user, require_permission
from app.core.exceptions import NotFoundError, ConflictError
from app.core.validation import validate_object_id, validate_pagination_params
from app.repositories.user_repository import UserRepository
from app.models.base import PaginatedResponse
from app.models.user import UserSchema, UserCreateSchema, UserUpdateSchema

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[UserSchema])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    role: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_permission("users:read")),
):
    """List all users (paginated) with optional filtering."""
    # Validate pagination parameters
    skip, limit = validate_pagination_params(skip, limit)
    
    repository = UserRepository()
    users, total = await repository.list_all(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        status=status,
        role=role,
        search=search,
    )
    
    # Calculate page number (1-indexed) from skip and limit
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    
    return PaginatedResponse(
        items=users,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/{user_id}", response_model=UserSchema)
async def get_user(
    user_id: str,
    current_user: dict = Depends(require_permission("users:read")),
):
    """Get user by ID."""
    # Validate user_id format
    validate_object_id(user_id, "User")
    
    repository = UserRepository()
    user = await repository.get_by_id(user_id)
    if not user:
        raise NotFoundError("User", user_id)
    return user


@router.post("/", response_model=UserSchema, status_code=201)
async def create_user(
    user_data: UserCreateSchema,
    current_user: dict = Depends(require_permission("users:create")),
):
    """Create a new user."""
    # Validate tenant_id if provided
    if user_data.tenant_id:
        validate_object_id(user_data.tenant_id, "Tenant")
    
    repository = UserRepository()
    
    # Check if user with email already exists in tenant
    existing_user = await repository.get_by_email(user_data.email, user_data.tenant_id)
    if existing_user:
        raise ConflictError("User with this email already exists in tenant", "DUPLICATE_EMAIL")
    
    user = await repository.create(user_data.model_dump())
    return user


@router.patch("/{user_id}", response_model=UserSchema)
async def update_user(
    user_id: str,
    updates: UserUpdateSchema,
    current_user: dict = Depends(require_permission("users:update")),
):
    """Update user information."""
    # Validate user_id format
    validate_object_id(user_id, "User")
    
    # Validate tenant_id if being updated
    if updates.tenant_id:
        validate_object_id(updates.tenant_id, "Tenant")
    
    repository = UserRepository()
    user = await repository.update(user_id, updates.model_dump(exclude_unset=True))
    if not user:
        raise NotFoundError("User", user_id)
    return user


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_permission("users:delete")),
):
    """Soft delete a user (sets status to inactive)."""
    # Validate user_id format
    validate_object_id(user_id, "User")
    
    repository = UserRepository()
    deleted = await repository.delete(user_id)
    if not deleted:
        raise NotFoundError("User", user_id)
    return None

