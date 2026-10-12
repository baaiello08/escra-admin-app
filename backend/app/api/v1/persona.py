"""
Persona Identity Verification API

REST endpoints for managing Persona inquiries and webhooks.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Header, Query
from pydantic import BaseModel

from app.core.security import require_permission
from app.core.validation import validate_pagination_params
from app.services.persona_service import get_persona_service
from app.models.base import PaginatedResponse

router = APIRouter()


class PersonaInquiryCreate(BaseModel):
    """Schema for creating a Persona inquiry."""

    template_id: str = None
    reference_id: str = None
    fields: Dict[str, Any] = None


@router.post("/inquiries", response_model=Dict[str, Any])
async def create_inquiry(
    inquiry_data: PersonaInquiryCreate,
    current_user: dict = Depends(require_permission("persona:create_inquiry")),
):
    """Create a new Persona inquiry/investigation."""
    persona_service = get_persona_service()
    inquiry = await persona_service.create_inquiry(
        template_id=inquiry_data.template_id,
        reference_id=inquiry_data.reference_id,
        fields=inquiry_data.fields,
    )
    return inquiry


@router.get("/inquiries/{inquiry_id}", response_model=Dict[str, Any])
async def get_inquiry(
    inquiry_id: str,
    current_user: dict = Depends(require_permission("persona:read_inquiry")),
):
    """Get Persona inquiry details."""
    persona_service = get_persona_service()
    try:
        inquiry = await persona_service.get_inquiry(inquiry_id)
        return inquiry
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inquiry not found: {str(e)}",
        )


@router.get("/inquiries", response_model=Dict[str, Any])
async def list_inquiries(
    limit: int = 20,
    offset: int = 0,
    filter_status: str = None,
    current_user: dict = Depends(require_permission("persona:list_inquiries")),
):
    """List Persona inquiries."""
    persona_service = get_persona_service()
    inquiries = await persona_service.list_inquiries(
        limit=limit,
        offset=offset,
        filter_status=filter_status,
    )
    return inquiries


@router.post("/webhooks")
async def persona_webhook(
    request: Request,
    x_persona_signature: str = Header(None, alias="X-Persona-Signature"),
):
    """
    Persona webhook endpoint.
    Receives webhook events from Persona for verification status updates.
    """
    # Get raw payload
    payload_bytes = await request.body()
    
    # Verify signature
    persona_service = get_persona_service()
    if not await persona_service.verify_webhook_signature(payload_bytes, x_persona_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )
    
    # Parse payload
    import json
    payload = json.loads(payload_bytes)
    
    # Process webhook
    result = await persona_service.process_webhook(payload)
    
    return result

