"""
Audit Log Domain Models

MongoDB collections and Pydantic schemas for tamper-evident audit logging.
Audit logs are append-only and immutable.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum
from pydantic import Field
from app.models.base import BaseSchema, PyObjectId


class AuditActionType(str, Enum):
    """Audit action type."""

    # Authentication
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILURE = "login_failure"
    
    # User management
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    USER_SUSPEND = "user_suspend"
    
    # Tenant management
    TENANT_CREATE = "tenant_create"
    TENANT_UPDATE = "tenant_update"
    TENANT_DELETE = "tenant_delete"
    TENANT_SUSPEND = "tenant_suspend"
    
    # Access control
    ROLE_ASSIGN = "role_assign"
    ROLE_REVOKE = "role_revoke"
    PERMISSION_GRANT = "permission_grant"
    PERMISSION_REVOKE = "permission_revoke"
    
    # Keys & Vault
    KEY_CREATE = "key_create"
    KEY_REVOKE = "key_revoke"
    KEY_ROTATE = "key_rotate"
    
    # Data access
    PII_ACCESS = "pii_access"
    DATA_EXPORT = "data_export"
    DATA_DELETE = "data_delete"
    
    # System
    CONFIG_CHANGE = "config_change"
    FEATURE_FLAG_TOGGLE = "feature_flag_toggle"
    IMPERSONATION_START = "impersonation_start"
    IMPERSONATION_END = "impersonation_end"


class AuditLogSchema(BaseSchema):
    """Audit log entry schema (append-only, immutable)."""

    # Actor (who performed the action)
    actor_user_id: Optional[PyObjectId] = Field(None, description="User who performed the action")
    actor_email: Optional[str] = Field(None, description="Actor email (for audit trail)")
    actor_ip: Optional[str] = Field(None, description="Actor IP address")
    actor_user_agent: Optional[str] = Field(None, description="Actor user agent")
    
    # Action
    action_type: AuditActionType = Field(..., description="Action type")
    action_description: str = Field(..., description="Human-readable action description")
    
    # Target (what was acted upon)
    target_type: Optional[str] = Field(None, description="Target type (user, tenant, key, etc.)")
    target_id: Optional[str] = Field(None, description="Target ID")
    target_tenant_id: Optional[PyObjectId] = Field(None, description="Target tenant ID")
    
    # Context
    tenant_id: Optional[PyObjectId] = Field(None, description="Tenant context")
    request_id: Optional[str] = Field(None, description="Request ID (for tracing)")
    session_id: Optional[str] = Field(None, description="Session ID")
    
    # Result
    success: bool = Field(..., description="Whether action succeeded")
    error_message: Optional[str] = Field(None, description="Error message (if failed)")
    
    # Changes (for update actions)
    changes: Dict[str, Any] = Field(default_factory=dict, description="Field changes (before/after)")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    # Tamper-evident fields
    hash: Optional[str] = Field(None, description="Hash of previous entry (for chain integrity)")
    previous_entry_id: Optional[PyObjectId] = Field(None, description="Previous entry ID")

    class Config:
        collection_name = "audit_logs"
        indexes = [
            [("actor_user_id", 1), ("created_at", -1)],
            [("tenant_id", 1), ("created_at", -1)],
            [("target_type", 1), ("target_id", 1)],
            [("action_type", 1), ("created_at", -1)],
            [("created_at", -1)],  # For time-based queries
        ]
