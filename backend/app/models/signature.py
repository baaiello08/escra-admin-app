"""
Signature Domain Models

Models for signature requests and signature events stored in the Escra App database.
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import Field
from app.models.base import BaseSchema, PyObjectId


class SignatureRequestStatus(str, Enum):
    """Signature request status enumeration."""
    
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class SignatureEventSchema(BaseSchema):
    """Signature event schema."""
    
    # Escra IDs
    escra_public_signature_id: str = Field(..., description="Public signature ID (e.g., SIG-XXXX)")
    escra_private_signature_id: str = Field(..., description="Private signature ID (UUIDv7)")
    
    # Relationships
    signature_request_id: str = Field(..., description="References escra_public_signature_request_id")
    document_id: str = Field(..., description="References escra_public_document_id")
    tenant_id: str = Field(..., description="References escra_public_org_id")
    user_id: str = Field(..., description="References escra_public_user_id (signer)")
    
    # On-chain
    on_chain_id: Optional[int] = Field(None, description="Algorand App ID")
    tx_id: Optional[str] = Field(None, description="Transaction ID")
    block: Optional[int] = Field(None, description="Block number")
    round: Optional[int] = Field(None, description="Round number")
    
    # Signature data
    signature_data: Optional[Dict[str, Any]] = Field(None, description="Signature metadata")
    
    # Timestamps
    signed_at: datetime = Field(default_factory=datetime.utcnow, description="Signature timestamp")
    created_date: datetime = Field(default_factory=datetime.utcnow, description="Creation date")
    last_update: datetime = Field(default_factory=datetime.utcnow, description="Last update date")
    
    class Config:
        collection_name = "signature_events"
        indexes = [
            [("escra_public_signature_id", 1)],  # Unique index
            [("signature_request_id", 1)],
            [("document_id", 1)],
            [("tenant_id", 1)],
            [("user_id", 1)],
            [("signed_at", -1)],
        ]


class RequiredSignerSchema(BaseSchema):
    """Required signer schema."""
    
    user_id: str = Field(..., description="References escra_public_user_id")
    address: str = Field(..., description="Algorand address (public key)")
    name: Optional[str] = Field(None, description="Optional display name")


class SignatureRequestSchema(BaseSchema):
    """Signature request schema."""
    
    # Escra IDs
    escra_public_signature_request_id: str = Field(..., description="Public signature request ID (e.g., REQ-K4WN)")
    escra_private_signature_request_id: str = Field(..., description="Private signature request ID (UUIDv7)")
    
    # On-chain
    on_chain_id: Optional[int] = Field(None, description="Algorand App ID")
    
    # Relationships
    tenant_id: str = Field(..., description="References escra_public_org_id")
    document_id: str = Field(..., description="References escra_public_document_id")
    user_creator_id: str = Field(..., description="References escra_public_user_id")
    
    # Status
    status: Optional[SignatureRequestStatus] = Field(None, description="Signature request status")
    
    # Signers
    signer_count: int = Field(default=0, description="Total number of signers")
    signed_count: int = Field(default=0, description="Number of completed signatures")
    required_signers: Optional[List[RequiredSignerSchema]] = Field(None, description="List of required signers")
    
    # Metrics
    transaction_count: int = Field(default=0, description="Number of transactions")
    transaction_cost: float = Field(default=0.0, description="Total transaction costs")
    
    # Timestamps
    created_date: datetime = Field(default_factory=datetime.utcnow, description="Creation date")
    last_update: datetime = Field(default_factory=datetime.utcnow, description="Last update date")
    
    class Config:
        collection_name = "signature_requests"
        indexes = [
            [("escra_public_signature_request_id", 1)],  # Unique index
            [("tenant_id", 1)],
            [("document_id", 1)],
            [("user_creator_id", 1)],
            [("status", 1)],
            [("created_date", -1)],
        ]
