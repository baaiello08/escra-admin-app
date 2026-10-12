"""
Keys & Vault API

REST endpoints for cryptographic key management.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.core.security import require_permission
from app.core.exceptions import NotFoundError
from app.core.validation import validate_object_id, validate_pagination_params, validate_user_id, validate_tenant_id
from app.repositories.key_repository import KeyRepository
from app.models.base import PaginatedResponse
from app.models.key import (
    KeySchema,
    KeyCreateSchema,
    KeyUpdateSchema,
    KeyType,
    KeyStatus,
)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[KeySchema])
async def list_keys(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None,
    key_type: Optional[KeyType] = None,
    status: Optional[KeyStatus] = None,
    current_user: dict = Depends(require_permission("keys:read")),
):
    """List all keys (paginated) with optional filtering."""
    # Validate pagination parameters
    skip, limit = validate_pagination_params(skip, limit)
    
    repository = KeyRepository()
    keys, total = await repository.list_all(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        user_id=user_id,
        key_type=key_type,
        status=status,
    )
    
    # Calculate page number (1-indexed) from skip and limit
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    
    return PaginatedResponse(
        items=keys,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/{key_id}", response_model=KeySchema)
async def get_key(
    key_id: str,
    current_user: dict = Depends(require_permission("keys:read")),
):
    """Get a key by ID."""
    # Validate key_id format
    validate_object_id(key_id, "Key")
    
    repository = KeyRepository()
    key = await repository.get_by_id(key_id)
    if not key:
        raise NotFoundError("Key", key_id)
    return key


@router.post("/", response_model=KeySchema, status_code=201)
async def create_key(
    key_data: KeyCreateSchema,
    current_user: dict = Depends(require_permission("keys:create")),
):
    """Create a new key."""
    # Validate required IDs
    validate_object_id(key_data.user_id, "User")
    validate_object_id(key_data.tenant_id, "Tenant")
    
    repository = KeyRepository()
    key = await repository.create(key_data.model_dump())
    return key


@router.patch("/{key_id}", response_model=KeySchema)
async def update_key(
    key_id: str,
    update_data: KeyUpdateSchema,
    current_user: dict = Depends(require_permission("keys:update")),
):
    """Update a key."""
    # Validate key_id format
    validate_object_id(key_id, "Key")
    
    repository = KeyRepository()
    # Only include fields that are not None
    update_dict = update_data.model_dump(exclude_unset=True)
    key = await repository.update(key_id, update_dict)
    if not key:
        raise NotFoundError("Key", key_id)
    return key


@router.delete("/{key_id}", status_code=204)
async def delete_key(
    key_id: str,
    current_user: dict = Depends(require_permission("keys:delete")),
):
    """Revoke (soft delete) a key."""
    # Validate key_id format
    validate_object_id(key_id, "Key")
    
    repository = KeyRepository()
    success = await repository.delete(key_id)
    if not success:
        raise NotFoundError("Key", key_id)
    return None
