"""
Billing & Usage API

REST endpoints for billing configuration, usage metrics, and billing events.
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.core.security import require_permission
from app.core.exceptions import NotFoundError
from app.core.validation import validate_object_id, validate_tenant_id
from app.repositories.billing_repository import BillingRepository
from app.models.billing import (
    BillingConfigSchema,
    UsageMetricSchema,
    BillingEventSchema,
    PlanTierSchema,
    UsageMetricType,
    PaymentStatus,
)

router = APIRouter()


# ========================================================================
# Billing Configs
# ========================================================================

@router.get("/configs/{tenant_id}", response_model=BillingConfigSchema)
async def get_billing_config(
    tenant_id: str,
    current_user: dict = Depends(require_permission("billing:read")),
):
    """Get billing configuration for a tenant."""
    # Validate tenant_id format
    validate_tenant_id(tenant_id, required=True)
    
    repository = BillingRepository()
    config = await repository.get_billing_config(tenant_id)
    if not config:
        raise NotFoundError("Billing configuration", tenant_id)
    return config


@router.post("/configs", response_model=BillingConfigSchema, status_code=201)
@router.put("/configs", response_model=BillingConfigSchema)
async def create_or_update_billing_config(
    config_data: BillingConfigSchema,
    current_user: dict = Depends(require_permission("billing:update")),
):
    """Create or update billing configuration."""
    repository = BillingRepository()
    config = await repository.create_or_update_billing_config(config_data.model_dump(exclude_unset=True))
    return config


# ========================================================================
# Usage Metrics
# ========================================================================

@router.post("/usage", response_model=UsageMetricSchema, status_code=201)
async def create_usage_metric(
    metric_data: UsageMetricSchema,
    current_user: dict = Depends(require_permission("billing:create")),
):
    """Create a usage metric record."""
    repository = BillingRepository()
    metric = await repository.create_usage_metric(metric_data.model_dump(exclude_unset=True))
    return metric


@router.get("/usage", response_model=List[UsageMetricSchema])
async def list_usage_metrics(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenant_id: Optional[str] = None,
    metric_type: Optional[UsageMetricType] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(require_permission("billing:read")),
):
    """List usage metrics with optional filtering."""
    repository = BillingRepository()
    metrics = await repository.list_usage_metrics(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        metric_type=metric_type,
        start_date=start_date,
        end_date=end_date,
    )
    return metrics


# ========================================================================
# Billing Events
# ========================================================================

@router.post("/events", response_model=BillingEventSchema, status_code=201)
async def create_billing_event(
    event_data: BillingEventSchema,
    current_user: dict = Depends(require_permission("billing:create")),
):
    """Create a billing event."""
    repository = BillingRepository()
    event = await repository.create_billing_event(event_data.model_dump(exclude_unset=True))
    return event


@router.get("/events", response_model=List[BillingEventSchema])
async def list_billing_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenant_id: Optional[str] = None,
    event_type: Optional[str] = None,
    status: Optional[PaymentStatus] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(require_permission("billing:read")),
):
    """List billing events with optional filtering."""
    repository = BillingRepository()
    events = await repository.list_billing_events(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        event_type=event_type,
        status=status,
        start_date=start_date,
        end_date=end_date,
    )
    return events


# ========================================================================
# Plan Tiers
# ========================================================================

@router.get("/plans", response_model=List[PlanTierSchema])
async def list_plan_tiers(
    current_user: dict = Depends(require_permission("billing:read")),
):
    """List all plan tiers."""
    repository = BillingRepository()
    tiers = await repository.list_plan_tiers()
    return tiers
