"""
Security & Risk API

REST endpoints for security events, abuse cases, and fraud cases.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query

from app.core.security import require_permission
from app.core.exceptions import NotFoundError
from app.core.validation import validate_object_id, validate_pagination_params
from app.repositories.security_repository import SecurityRepository
from app.models.base import PaginatedResponse
from app.models.security import (
    SecuritySettingSchema,
    SecurityEventSchema,
    AbuseCaseSchema,
    FraudCaseSchema,
    SecurityEventType,
    RiskLevel,
    AbuseCaseStatus,
    FraudCaseStatus,
)

router = APIRouter()


# ========================================================================
# Security Settings
# ========================================================================

@router.get("/settings", response_model=SecuritySettingSchema)
async def get_security_settings(
    tenant_id: Optional[str] = None,
    current_user: dict = Depends(require_permission("security:read")),
):
    """Get security settings (global or tenant-scoped)."""
    repository = SecurityRepository()
    settings = await repository.get_security_settings(tenant_id=tenant_id)
    if not settings:
        raise NotFoundError("Security settings")
    return settings


@router.post("/settings", response_model=SecuritySettingSchema, status_code=201)
@router.put("/settings", response_model=SecuritySettingSchema)
async def create_or_update_security_settings(
    settings_data: SecuritySettingSchema,
    current_user: dict = Depends(require_permission("security:update")),
):
    """Create or update security settings."""
    repository = SecurityRepository()
    settings = await repository.create_or_update_security_settings(settings_data.model_dump(exclude_unset=True))
    return settings


# ========================================================================
# Security Events
# ========================================================================

@router.post("/events", response_model=SecurityEventSchema, status_code=201)
async def create_security_event(
    event_data: SecurityEventSchema,
    current_user: dict = Depends(require_permission("security:create")),
):
    """Create a security event."""
    repository = SecurityRepository()
    event = await repository.create_security_event(event_data.model_dump(exclude_unset=True))
    return event


@router.get("/events", response_model=PaginatedResponse[SecurityEventSchema])
async def list_security_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None,
    event_type: Optional[SecurityEventType] = None,
    risk_level: Optional[RiskLevel] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(require_permission("security:read")),
):
    """List security events with optional filtering."""
    # Validate pagination parameters
    skip, limit = validate_pagination_params(skip, limit)
    
    repository = SecurityRepository()
    events, total = await repository.list_security_events(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        user_id=user_id,
        event_type=event_type,
        risk_level=risk_level,
        start_date=start_date,
        end_date=end_date,
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


@router.get("/events/{event_id}", response_model=SecurityEventSchema)
async def get_security_event(
    event_id: str,
    current_user: dict = Depends(require_permission("security:read")),
):
    """Get a security event by ID."""
    # Validate event_id format
    validate_object_id(event_id, "Security event")
    
    repository = SecurityRepository()
    event = await repository.get_security_event(event_id)
    if not event:
        raise NotFoundError("Security event", event_id)
    return event


@router.patch("/events/{event_id}", response_model=SecurityEventSchema)
async def update_security_event(
    event_id: str,
    update_data: SecurityEventSchema,
    current_user: dict = Depends(require_permission("security:update")),
):
    """Update a security event."""
    # Validate event_id format
    validate_object_id(event_id, "Security event")
    
    repository = SecurityRepository()
    event = await repository.update_security_event(event_id, update_data.model_dump(exclude_unset=True))
    if not event:
        raise NotFoundError("Security event", event_id)
    return event


# ========================================================================
# Abuse Cases
# ========================================================================

@router.post("/abuse-cases", response_model=AbuseCaseSchema, status_code=201)
async def create_abuse_case(
    case_data: AbuseCaseSchema,
    current_user: dict = Depends(require_permission("security:create")),
):
    """Create an abuse case."""
    repository = SecurityRepository()
    case = await repository.create_abuse_case(case_data.model_dump(exclude_unset=True))
    return case


@router.get("/abuse-cases", response_model=List[AbuseCaseSchema])
async def list_abuse_cases(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None,
    status: Optional[AbuseCaseStatus] = None,
    risk_level: Optional[RiskLevel] = None,
    current_user: dict = Depends(require_permission("security:read")),
):
    """List abuse cases with optional filtering."""
    repository = SecurityRepository()
    cases = await repository.list_abuse_cases(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        user_id=user_id,
        status=status,
        risk_level=risk_level,
    )
    return cases


@router.get("/abuse-cases/{case_id}", response_model=AbuseCaseSchema)
async def get_abuse_case(
    case_id: str,
    current_user: dict = Depends(require_permission("security:read")),
):
    """Get an abuse case by ID."""
    # Validate case_id format
    validate_object_id(case_id, "Abuse case")
    
    repository = SecurityRepository()
    case = await repository.get_abuse_case(case_id)
    if not case:
        raise NotFoundError("Abuse case", case_id)
    return case


@router.patch("/abuse-cases/{case_id}", response_model=AbuseCaseSchema)
async def update_abuse_case(
    case_id: str,
    update_data: AbuseCaseSchema,
    current_user: dict = Depends(require_permission("security:update")),
):
    """Update an abuse case."""
    # Validate case_id format
    validate_object_id(case_id, "Abuse case")
    
    repository = SecurityRepository()
    case = await repository.update_abuse_case(case_id, update_data.model_dump(exclude_unset=True))
    if not case:
        raise NotFoundError("Abuse case", case_id)
    return case


# ========================================================================
# Fraud Cases
# ========================================================================

@router.post("/fraud-cases", response_model=FraudCaseSchema, status_code=201)
async def create_fraud_case(
    case_data: FraudCaseSchema,
    current_user: dict = Depends(require_permission("security:create")),
):
    """Create a fraud case."""
    repository = SecurityRepository()
    case = await repository.create_fraud_case(case_data.model_dump(exclude_unset=True))
    return case


@router.get("/fraud-cases", response_model=List[FraudCaseSchema])
async def list_fraud_cases(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None,
    status: Optional[FraudCaseStatus] = None,
    risk_level: Optional[RiskLevel] = None,
    current_user: dict = Depends(require_permission("security:read")),
):
    """List fraud cases with optional filtering."""
    repository = SecurityRepository()
    cases = await repository.list_fraud_cases(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        user_id=user_id,
        status=status,
        risk_level=risk_level,
    )
    return cases


@router.get("/fraud-cases/{case_id}", response_model=FraudCaseSchema)
async def get_fraud_case(
    case_id: str,
    current_user: dict = Depends(require_permission("security:read")),
):
    """Get a fraud case by ID."""
    # Validate case_id format
    validate_object_id(case_id, "Fraud case")
    
    repository = SecurityRepository()
    case = await repository.get_fraud_case(case_id)
    if not case:
        raise NotFoundError("Fraud case", case_id)
    return case


@router.patch("/fraud-cases/{case_id}", response_model=FraudCaseSchema)
async def update_fraud_case(
    case_id: str,
    update_data: FraudCaseSchema,
    current_user: dict = Depends(require_permission("security:update")),
):
    """Update a fraud case."""
    # Validate case_id format
    validate_object_id(case_id, "Fraud case")
    
    repository = SecurityRepository()
    case = await repository.update_fraud_case(case_id, update_data.model_dump(exclude_unset=True))
    if not case:
        raise NotFoundError("Fraud case", case_id)
    return case
