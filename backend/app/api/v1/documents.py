"""
Documents API

REST endpoints for document management.
Reads from the Escra App database (shared MongoDB).
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query

from app.core.security import require_permission
from app.core.exceptions import NotFoundError
from app.core.validation import validate_pagination_params
from app.repositories.document_repository import DocumentRepository
from app.models.base import PaginatedResponse
from app.models.document import DocumentSchema, DocumentStatus

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[DocumentSchema])
async def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenant_id: Optional[str] = None,
    user_creator_id: Optional[str] = None,
    status: Optional[DocumentStatus] = None,
    current_user: dict = Depends(require_permission("documents:read")),
):
    """List all documents (paginated) with optional filtering."""
    # Validate pagination parameters
    skip, limit = validate_pagination_params(skip, limit)
    
    repository = DocumentRepository()
    documents, total = await repository.list_all(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        user_creator_id=user_creator_id,
        status=status,
    )
    
    # Calculate page number (1-indexed) from skip and limit
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    
    return PaginatedResponse(
        items=documents,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/{document_id}", response_model=DocumentSchema)
async def get_document(
    document_id: str,
    current_user: dict = Depends(require_permission("documents:read")),
):
    """Get document by public document ID."""
    repository = DocumentRepository()
    document = await repository.get_by_id(document_id)
    if not document:
        raise NotFoundError("Document", document_id)
    return document
