"""
Contracts API

REST endpoints for contract management.
Reads from the Escra App database (shared MongoDB).
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query

from app.core.security import require_permission
from app.core.exceptions import NotFoundError
from app.core.validation import validate_pagination_params
from app.repositories.contract_repository import ContractRepository
from app.models.base import PaginatedResponse
from app.models.contract import ContractSchema, ContractStatus

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[ContractSchema])
async def list_contracts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    tenant_id: Optional[str] = None,
    user_creator_id: Optional[str] = None,
    status: Optional[ContractStatus] = None,
    current_user: dict = Depends(require_permission("contracts:read")),
):
    """List all contracts (paginated) with optional filtering."""
    # Validate pagination parameters
    skip, limit = validate_pagination_params(skip, limit)
    
    repository = ContractRepository()
    contracts, total = await repository.list_all(
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
        items=contracts,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages,
    )


@router.get("/{contract_id}", response_model=ContractSchema)
async def get_contract(
    contract_id: str,
    current_user: dict = Depends(require_permission("contracts:read")),
):
    """Get contract by public contract ID."""
    repository = ContractRepository()
    contract = await repository.get_by_id(contract_id)
    if not contract:
        raise NotFoundError("Contract", contract_id)
    return contract
