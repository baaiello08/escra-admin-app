"""
Document Domain Models

Models for document records stored in the Escra App database.
"""

from enum import Enum
from typing import Optional
from datetime import datetime
from pydantic import Field
from app.models.base import BaseSchema, PyObjectId


class DocumentStatus(str, Enum):
    """Document status enumeration."""
    
    DRAFT = "draft"
    ACTIVE = "active"
    SIGNED = "signed"
    ARCHIVED = "archived"
    DELETED = "deleted"


class DocumentSchema(BaseSchema):
    """Document record schema."""
    
    # Escra IDs
    escra_public_document_id: str = Field(..., description="Public document ID (e.g., DOC-T7QJ)")
    escra_private_document_id: str = Field(..., description="Private document ID (UUIDv7)")
    
    # On-chain
    on_chain_id: Optional[int] = Field(None, description="Algorand App ID")
    
    # Relationships
    tenant_id: str = Field(..., description="References escra_public_org_id")
    user_creator_id: str = Field(..., description="References escra_public_user_id")
    
    # Status
    status: Optional[DocumentStatus] = Field(None, description="Document status")
    
    # File metadata
    file_type: str = Field(..., description="File MIME type")
    file_size: int = Field(..., description="File size in bytes")
    
    # Metrics
    transaction_count: int = Field(default=0, description="Number of transactions")
    
    # Financial
    lockup: float = Field(default=0.0, description="ALGO locked in document")
    transaction_cost: float = Field(default=0.0, description="Total transaction costs")
    
    # Timestamps
    created_date: datetime = Field(default_factory=datetime.utcnow, description="Creation date")
    last_update: datetime = Field(default_factory=datetime.utcnow, description="Last update date")
    
    class Config:
        collection_name = "documents"
        indexes = [
            [("escra_public_document_id", 1)],  # Unique index
            [("tenant_id", 1)],
            [("user_creator_id", 1)],
            [("on_chain_id", 1)],
            [("status", 1)],
            [("created_date", -1)],
        ]
