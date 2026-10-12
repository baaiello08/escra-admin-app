"""
Signatures API

REST endpoints for signature requests and signature events.
Reads from the Escra App database (shared MongoDB).
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query

from app.core.security import require_permission
from app.core.exceptions import NotFoundError
from app.core.validation import validate_pagination_params
from app.repositories.signature_repository import SignatureRepository
from app.models.base import PaginatedResponse
from app.models.signature import (
    SignatureRequestSchema,
    SignatureEventSchema,
    SignatureRequestStatus,
)

router = APIRouter()


# Signature Requests
@router.get("/requests", response_model=PaginatedResponse[SignatureRequestSchema])
async def list_signature_requests(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenant_id: Optional[str] = None,
    document_id: Optional[str] = None,
    user_creator_id: Optional[str] = None,
    status: Optional[SignatureRequestStatus] = None,
    current_user: dict = Depends(require_permission("signatures:read")),
):
    """List all signature requests (paginated) with optional filtering."""
    # Validate pagination parameters
    skip, limit = validate_pagination_params(skip, limit)
    
    repository = SignatureRepository()
    requests, total = await repository.list_requests(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        document_id=document_id,
        user_creator_id=user_creator_id,
        status=status,
    )
    
    # Calculate page number (1-indexed) from skip and limit
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    
    return PaginatedResponse(
        items=requests,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/requests/{request_id}", response_model=SignatureRequestSchema)
async def get_signature_request(
    request_id: str,
    current_user: dict = Depends(require_permission("signatures:read")),
):
    """Get signature request by public request ID."""
    repository = SignatureRepository()
    request = await repository.get_request_by_id(request_id)
    if not request:
        raise NotFoundError("Signature request", request_id)
    return request


# Signature Events
@router.get("/events", response_model=PaginatedResponse[SignatureEventSchema])
async def list_signature_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenant_id: Optional[str] = None,
    document_id: Optional[str] = None,
    signature_request_id: Optional[str] = None,
    user_id: Optional[str] = None,
    current_user: dict = Depends(require_permission("signatures:read")),
):
    """List all signature events (paginated) with optional filtering."""
    # Validate pagination parameters
    skip, limit = validate_pagination_params(skip, limit)
    
    repository = SignatureRepository()
    events, total = await repository.list_events(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        document_id=document_id,
        signature_request_id=signature_request_id,
        user_id=user_id,
    )
    
    # Calculate page number (1-indexed) from skip and limit
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    
    return PaginatedResponse(
        items=events,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/events/{event_id}", response_model=SignatureEventSchema)
async def get_signature_event(
    event_id: str,
    current_user: dict = Depends(require_permission("signatures:read")),
):
    """Get signature event by public signature ID."""
    repository = SignatureRepository()
    event = await repository.get_event_by_id(event_id)
    if not event:
        raise NotFoundError("Signature event", event_id)
    return event
