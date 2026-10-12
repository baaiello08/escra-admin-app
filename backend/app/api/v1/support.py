"""
Support API

REST endpoints for support cases, impersonation sessions, and announcements.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.core.security import require_permission
from app.core.exceptions import NotFoundError
from app.core.validation import validate_object_id, validate_pagination_params
from app.repositories.support_repository import SupportRepository
from app.models.base import PaginatedResponse
from app.models.support import (
    SupportCaseSchema,
    ImpersonationSessionSchema,
    AnnouncementSchema,
    SupportCaseStatus,
    SupportCasePriority,
    ImpersonationStatus,
    AnnouncementType,
)

router = APIRouter()


# ========================================================================
# Support Cases
# ========================================================================

@router.post("/cases", response_model=SupportCaseSchema, status_code=201)
async def create_support_case(
    case_data: SupportCaseSchema,
    current_user: dict = Depends(require_permission("support:create")),
):
    """Create a support case."""
    # Validate IDs if provided
    if hasattr(case_data, 'tenant_id') and case_data.tenant_id:
        validate_object_id(case_data.tenant_id, "Tenant")
    if hasattr(case_data, 'user_id') and case_data.user_id:
        validate_object_id(case_data.user_id, "User")
    
    repository = SupportRepository()
    case = await repository.create_support_case(case_data.model_dump(exclude_unset=True))
    return case


@router.get("/cases", response_model=PaginatedResponse[SupportCaseSchema])
async def list_support_cases(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None,
    status: Optional[SupportCaseStatus] = None,
    priority: Optional[SupportCasePriority] = None,
    assigned_to: Optional[str] = None,
    current_user: dict = Depends(require_permission("support:read")),
):
    """List support cases with optional filtering."""
    # Validate pagination parameters
    skip, limit = validate_pagination_params(skip, limit)
    
    repository = SupportRepository()
    cases, total = await repository.list_support_cases(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        user_id=user_id,
        status=status,
        priority=priority,
        assigned_to=assigned_to,
    )
    
    # Calculate page number (1-indexed) from skip and limit
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    
    return PaginatedResponse(
        items=cases,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/cases/{case_id}", response_model=SupportCaseSchema)
async def get_support_case(
    case_id: str,
    current_user: dict = Depends(require_permission("support:read")),
):
    """Get a support case by ID."""
    # Validate case_id format
    validate_object_id(case_id, "Support case")
    
    repository = SupportRepository()
    case = await repository.get_support_case(case_id)
    if not case:
        raise NotFoundError("Support case", case_id)
    return case


@router.patch("/cases/{case_id}", response_model=SupportCaseSchema)
async def update_support_case(
    case_id: str,
    update_data: SupportCaseSchema,
    current_user: dict = Depends(require_permission("support:update")),
):
    """Update a support case."""
    # Validate case_id format
    validate_object_id(case_id, "Support case")
    
    repository = SupportRepository()
    case = await repository.update_support_case(case_id, update_data.model_dump(exclude_unset=True))
    if not case:
        raise NotFoundError("Support case", case_id)
    return case


# ========================================================================
# Impersonation Sessions
# ========================================================================

@router.post("/impersonations", response_model=ImpersonationSessionSchema, status_code=201)
async def create_impersonation_session(
    session_data: ImpersonationSessionSchema,
    current_user: dict = Depends(require_permission("support:impersonate")),
):
    """Create an impersonation session."""
    repository = SupportRepository()
    session = await repository.create_impersonation_session(session_data.model_dump(exclude_unset=True))
    return session


@router.get("/impersonations", response_model=List[ImpersonationSessionSchema])
async def list_impersonation_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    admin_user_id: Optional[str] = None,
    target_user_id: Optional[str] = None,
    status: Optional[ImpersonationStatus] = None,
    current_user: dict = Depends(require_permission("support:read")),
):
    """List impersonation sessions with optional filtering."""
    repository = SupportRepository()
    sessions = await repository.list_impersonation_sessions(
        skip=skip,
        limit=limit,
        admin_user_id=admin_user_id,
        target_user_id=target_user_id,
        status=status,
    )
    return sessions


@router.get("/impersonations/{session_id}", response_model=ImpersonationSessionSchema)
async def get_impersonation_session(
    session_id: str,
    current_user: dict = Depends(require_permission("support:read")),
):
    """Get an impersonation session by ID."""
    # Validate session_id format
    validate_object_id(session_id, "Impersonation session")
    
    repository = SupportRepository()
    session = await repository.get_impersonation_session(session_id)
    if not session:
        raise NotFoundError("Impersonation session", session_id)
    return session


@router.patch("/impersonations/{session_id}", response_model=ImpersonationSessionSchema)
async def update_impersonation_session(
    session_id: str,
    update_data: ImpersonationSessionSchema,
    current_user: dict = Depends(require_permission("support:update")),
):
    """Update an impersonation session."""
    # Validate session_id format
    validate_object_id(session_id, "Impersonation session")
    
    repository = SupportRepository()
    session = await repository.update_impersonation_session(session_id, update_data.model_dump(exclude_unset=True))
    if not session:
        raise NotFoundError("Impersonation session", session_id)
    return session


# ========================================================================
# Announcements
# ========================================================================

@router.post("/announcements", response_model=AnnouncementSchema, status_code=201)
async def create_announcement(
    announcement_data: AnnouncementSchema,
    current_user: dict = Depends(require_permission("support:create")),
):
    """Create an announcement."""
    repository = SupportRepository()
    announcement = await repository.create_announcement(announcement_data.model_dump(exclude_unset=True))
    return announcement


@router.get("/announcements", response_model=List[AnnouncementSchema])
async def list_announcements(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenant_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    announcement_type: Optional[AnnouncementType] = None,
    current_user: dict = Depends(require_permission("support:read")),
):
    """List announcements with optional filtering."""
    repository = SupportRepository()
    announcements = await repository.list_announcements(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        is_active=is_active,
        announcement_type=announcement_type,
    )
    return announcements


@router.get("/announcements/{announcement_id}", response_model=AnnouncementSchema)
async def get_announcement(
    announcement_id: str,
    current_user: dict = Depends(require_permission("support:read")),
):
    """Get an announcement by ID."""
    # Validate announcement_id format
    validate_object_id(announcement_id, "Announcement")
    
    repository = SupportRepository()
    announcement = await repository.get_announcement(announcement_id)
    if not announcement:
        raise NotFoundError("Announcement", announcement_id)
    return announcement


@router.patch("/announcements/{announcement_id}", response_model=AnnouncementSchema)
async def update_announcement(
    announcement_id: str,
    update_data: AnnouncementSchema,
    current_user: dict = Depends(require_permission("support:update")),
):
    """Update an announcement."""
    # Validate announcement_id format
    validate_object_id(announcement_id, "Announcement")
    
    repository = SupportRepository()
    announcement = await repository.update_announcement(announcement_id, update_data.model_dump(exclude_unset=True))
    if not announcement:
        raise NotFoundError("Announcement", announcement_id)
    return announcement
