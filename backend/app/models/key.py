"""
Keys & Vault Domain Models

MongoDB collections and Pydantic schemas for cryptographic key management and Vault integration.
Keys are user-only (not organization-level).
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import Field
from app.models.base import BaseSchema, PyObjectId


class KeyType(str, Enum):
    """Key type enumeration."""

    SIGNING = "signing"  # For document/contract signing
    WALLET = "wallet"  # Algorand wallet key
    API = "api"  # API access key
    ENCRYPTION = "encryption"  # Data encryption key


class KeyStatus(str, Enum):
    """Key lifecycle status."""

    ACTIVE = "active"
    INACTIVE = "inactive"
    REVOKED = "revoked"
    ROTATED = "rotated"
    PENDING = "pending"


class KeySchema(BaseSchema):
    """Key document schema."""

    user_id: PyObjectId = Field(..., description="User who owns this key")
    tenant_id: PyObjectId = Field(..., description="Tenant this key belongs to")
    key_type: KeyType = Field(..., description="Type of key")
    status: KeyStatus = Field(default=KeyStatus.PENDING, description="Key status")
    
    # Key metadata
    public_key: Optional[str] = Field(None, description="Public key (if applicable)")
    key_fingerprint: Optional[str] = Field(None, description="Key fingerprint/hash")
    algorithm: Optional[str] = Field(None, description="Cryptographic algorithm")
    
    # Vault integration
    vault_path: Optional[str] = Field(None, description="HashiCorp Vault path")
    vault_policy: Optional[str] = Field(None, description="Vault policy name")
    
    # Usage tracking
    last_used_at: Optional[datetime] = Field(None, description="Last usage timestamp")
    usage_count: int = Field(default=0, description="Total usage count")
    
    # Lifecycle
    created_by: Optional[str] = Field(None, description="User/system that created the key")
    revoked_at: Optional[datetime] = Field(None, description="Revocation timestamp")
    revoked_by: Optional[str] = Field(None, description="User/system that revoked the key")
    rotated_from: Optional[PyObjectId] = Field(None, description="Previous key ID if rotated")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    description: Optional[str] = Field(None, description="Key description/purpose")

    class Config:
        collection_name = "keys"
        indexes = [
            [("user_id", 1)],
            [("tenant_id", 1)],
            [("key_type", 1)],
            [("status", 1)],
            [("vault_path", 1)],
        ]


class KeyCreateSchema(BaseSchema):
    """Schema for creating a new key."""

    user_id: str
    tenant_id: str
    key_type: KeyType
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class KeyUpdateSchema(BaseSchema):
    """Schema for updating key information."""

    status: Optional[KeyStatus] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class KeyLifecycleEventSchema(BaseSchema):
    """Key lifecycle event (rotation, revocation, etc.)."""

    key_id: PyObjectId = Field(..., description="Key ID")
    event_type: str = Field(..., description="Event type (rotate, revoke, activate, etc.)")
    performed_by: str = Field(..., description="User/system that performed the action")
    reason: Optional[str] = Field(None, description="Reason for the event")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Event metadata")

    class Config:
        collection_name = "key_lifecycle_events"
        indexes = [
            [("key_id", 1)],
            [("event_type", 1)],
        ]
