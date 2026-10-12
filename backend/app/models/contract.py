"""
Contract Domain Models

Models for smart contract instances stored in the Escra App database.
"""

from enum import Enum
from typing import Optional
from datetime import datetime
from pydantic import Field
from app.models.base import BaseSchema, PyObjectId


class ContractStatus(str, Enum):
    """Contract status enumeration."""
    
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class ContractSchema(BaseSchema):
    """Contract document schema."""
    
    # Escra IDs
    escra_public_contract_id: str = Field(..., description="Public contract ID (e.g., CON-9D4Q)")
    escra_private_contract_id: str = Field(..., description="Private contract ID (UUIDv7)")
    
    # On-chain
    on_chain_id: Optional[int] = Field(None, description="Algorand App ID")
    
    # Relationships
    tenant_id: str = Field(..., description="References escra_public_org_id")
    user_creator_id: str = Field(..., description="References escra_public_user_id")
    
    # Status
    status: Optional[ContractStatus] = Field(None, description="Contract status")
    
    # Metrics
    collaborator_count: int = Field(default=0, description="Number of collaborators")
    document_count: int = Field(default=0, description="Number of documents")
    transaction_count: int = Field(default=0, description="Number of transactions")
    
    # Financial
    lockup: float = Field(default=0.0, description="ALGO locked in contract")
    transaction_cost: float = Field(default=0.0, description="Total transaction costs")
    
    # Timestamps
    created_date: datetime = Field(default_factory=datetime.utcnow, description="Creation date")
    last_update: datetime = Field(default_factory=datetime.utcnow, description="Last update date")
    
    class Config:
        collection_name = "contracts"
        indexes = [
            [("escra_public_contract_id", 1)],  # Unique index
            [("tenant_id", 1)],
            [("user_creator_id", 1)],
            [("on_chain_id", 1)],
            [("status", 1)],
            [("created_date", -1)],
        ]
