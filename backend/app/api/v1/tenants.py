"""
Tenant Management API

REST endpoints for tenant/organization management.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel

from app.core.security import get_current_user, require_permission
from app.core.validation import validate_pagination_params
from app.repositories.tenant_repository import TenantRepository
from app.models.base import PaginatedResponse
from app.models.tenant import TenantSchema, TenantCreateSchema, TenantUpdateSchema

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[TenantSchema])
async def list_tenants(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = None,
    current_user: dict = Depends(require_permission("tenants:read")),
):
    """List all tenants (paginated)."""
    # Validate pagination parameters
    skip, limit = validate_pagination_params(skip, limit)
    
    repository = TenantRepository()
    tenants, total = await repository.list_all(skip=skip, limit=limit, status=status)
    
    # Calculate page number (1-indexed) from skip and limit
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    
    return PaginatedResponse(
        items=tenants,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/{tenant_id}", response_model=TenantSchema)
async def get_tenant(
    tenant_id: str,
    current_user: dict = Depends(require_permission("tenants:read")),
):
    """Get tenant by ID."""
    repository = TenantRepository()
    tenant = await repository.get_by_id(tenant_id)
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant


@router.post("/", response_model=TenantSchema, status_code=status.HTTP_201_CREATED)
async def create_tenant(
    tenant_data: TenantCreateSchema,
    current_user: dict = Depends(require_permission("tenants:create")),
):
    """Create a new tenant."""
    repository = TenantRepository()
    tenant = await repository.create(tenant_data.model_dump(exclude={"id"}))
    return tenant


@router.patch("/{tenant_id}", response_model=TenantSchema)
async def update_tenant(
    tenant_id: str,
    updates: TenantUpdateSchema,
    current_user: dict = Depends(require_permission("tenants:update")),
):
    """Update tenant information."""
    repository = TenantRepository()
    tenant = await repository.update(tenant_id, updates.model_dump(exclude_unset=True))
    if not tenant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return tenant

