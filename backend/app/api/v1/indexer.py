"""
Escra Indexer API

REST endpoints for managing the Escra Indexer subsystem:
- Configuration
- Start/stop indexing
- Backfill operations
- Health and status monitoring
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from pydantic import BaseModel

from app.core.security import require_permission
from app.core.validation import validate_pagination_params
from app.indexer.indexer_service import get_indexer_service
from app.repositories.onchain_event_repository import OnChainEventRepository
from app.models.base import PaginatedResponse
from app.models.indexer import OnChainEventSchema, EventType

router = APIRouter()


class IndexerConfigUpdate(BaseModel):
    """Schema for updating indexer configuration."""

    enabled: Optional[bool] = None
    poll_interval_seconds: Optional[int] = None
    batch_size: Optional[int] = None
    max_lag_blocks: Optional[int] = None
    target_app_ids: Optional[List[int]] = None


class IndexerBackfillRequest(BaseModel):
    """Schema for backfill request."""

    min_round: Optional[int] = None
    max_round: Optional[int] = None
    app_ids: Optional[List[int]] = None


@router.get("/status", response_model=dict)
async def get_indexer_status(
    current_user: dict = Depends(require_permission("indexer:read")),
):
    """Get current indexer status and health metrics."""
    service = get_indexer_service()
    status_data = await service.get_current_status()
    return status_data


@router.get("/config", response_model=dict)
async def get_indexer_config(
    current_user: dict = Depends(require_permission("indexer:read")),
):
    """Get indexer configuration."""
    service = get_indexer_service()
    config = await service.get_configuration()
    return config


@router.patch("/config", response_model=dict)
async def update_indexer_config(
    updates: IndexerConfigUpdate,
    current_user: dict = Depends(require_permission("indexer:update")),
):
    """Update indexer configuration."""
    service = get_indexer_service()
    config = await service.update_configuration(updates.model_dump(exclude_unset=True))
    return config


@router.post("/start")
async def start_indexer(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_permission("indexer:control")),
):
    """Start the indexer polling process (background task)."""
    service = get_indexer_service()
    background_tasks.add_task(service.start_polling)
    return {"status": "started", "message": "Indexer polling started in background"}


@router.post("/stop")
async def stop_indexer(
    current_user: dict = Depends(require_permission("indexer:control")),
):
    """Stop the indexer polling process."""
    service = get_indexer_service()
    await service.stop_polling()
    return {"status": "stopped", "message": "Indexer polling stopped"}


@router.post("/backfill", response_model=dict)
async def backfill_indexer(
    request: IndexerBackfillRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_permission("indexer:backfill")),
):
    """
    Trigger a backfill operation to index historical transactions.
    This is a potentially long-running operation.
    """
    service = get_indexer_service()
    
    # Run backfill in background
    background_tasks.add_task(
        service.index_transactions,
        min_round=request.min_round,
        max_round=request.max_round,
        app_ids=request.app_ids,
    )
    
    return {
        "status": "started",
        "message": "Backfill operation started in background",
        "min_round": request.min_round,
        "max_round": request.max_round,
    }


@router.post("/index-now", response_model=dict)
async def index_now(
    min_round: Optional[int] = None,
    max_round: Optional[int] = None,
    app_ids: Optional[List[int]] = None,
    current_user: dict = Depends(require_permission("indexer:control")),
):
    """Trigger an immediate indexing run (synchronous)."""
    service = get_indexer_service()
    try:
        result = await service.index_transactions(
            min_round=min_round,
            max_round=max_round,
            app_ids=app_ids,
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Indexing failed: {str(e)}",
        )


@router.get("/events", response_model=PaginatedResponse[OnChainEventSchema])
async def list_on_chain_events(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenant_id: Optional[str] = None,
    contract_id: Optional[str] = None,
    document_id: Optional[str] = None,
    event_type: Optional[EventType] = None,
    app_id: Optional[int] = None,
    current_user: dict = Depends(require_permission("indexer:read")),
):
    """List all on-chain events (paginated) with optional filtering."""
    # Validate pagination parameters
    skip, limit = validate_pagination_params(skip, limit)
    
    repository = OnChainEventRepository()
    events, total = await repository.list_all(
        skip=skip,
        limit=limit,
        tenant_id=tenant_id,
        contract_id=contract_id,
        document_id=document_id,
        event_type=event_type,
        app_id=app_id,
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


@router.get("/jobs", response_model=PaginatedResponse[dict])
async def list_indexer_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: dict = Depends(require_permission("indexer:read")),
):
    """List all indexer job runs (paginated)."""
    # Validate pagination parameters
    skip, limit = validate_pagination_params(skip, limit)
    
    service = get_indexer_service()
    db = service.db
    jobs_collection = db["indexer_job_runs"]
    
    # Get total count
    total = await jobs_collection.count_documents({})
    
    # Get paginated results
    cursor = jobs_collection.find({}).skip(skip).limit(limit).sort("started_at", -1)
    jobs = await cursor.to_list(length=limit)
    
    # Convert ObjectIds to strings
    for job in jobs:
        if "_id" in job:
            job["_id"] = str(job["_id"])
    
    # Calculate page number (1-indexed) from skip and limit
    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    
    return PaginatedResponse(
        items=jobs,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
    )

