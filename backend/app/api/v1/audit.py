"""
Audit Log API

REST endpoints for querying audit logs.
Audit logs are read-only (append-only pattern).
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.core.security import require_permission
from app.repositories.audit_repository import AuditRepository
from app.models.audit import AuditLogSchema, AuditActionType

router = APIRouter()


@router.get("/", response_model=List[AuditLogSchema])
async def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None,
    action_type: Optional[AuditActionType] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(require_permission("audit:read")),
):
    """List audit logs with optional filtering."""
    repository = AuditRepository()
    logs = await repository.list_all(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        user_id=user_id,
        action_type=action_type,
        start_date=start_date,
        end_date=end_date,
    )
    return logs


@router.get("/{log_id}", response_model=AuditLogSchema)
async def get_audit_log(
    log_id: str,
    current_user: dict = Depends(require_permission("audit:read")),
):
    """Get audit log by ID."""
    repository = AuditRepository()
    log = await repository.get_by_id(log_id)
    if not log:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Audit log not found")
    return log
