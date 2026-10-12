"""
Support & Internal Tools Domain Models

MongoDB collections and Pydantic schemas for support cases, impersonation sessions, and announcements.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import Field, EmailStr
from app.models.base import BaseSchema, PyObjectId


class SupportCaseStatus(str, Enum):
    """Support case status."""

    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_CUSTOMER = "waiting_customer"
    RESOLVED = "resolved"
    CLOSED = "closed"


class SupportCasePriority(str, Enum):
    """Support case priority."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"


class ImpersonationStatus(str, Enum):
    """Impersonation session status."""

    ACTIVE = "active"
    ENDED = "ended"
    EXPIRED = "expired"


class AnnouncementType(str, Enum):
    """Announcement type."""

    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    MAINTENANCE = "maintenance"
    FEATURE = "feature"


class SupportCaseSchema(BaseSchema):
    """Support case/ticket schema."""

    tenant_id: Optional[PyObjectId] = Field(None, description="Tenant ID")
    user_id: Optional[PyObjectId] = Field(None, description="User ID (if user-reported)")
    
    # Case details
    subject: str = Field(..., description="Case subject")
    description: str = Field(..., description="Case description")
    status: SupportCaseStatus = Field(default=SupportCaseStatus.OPEN, description="Case status")
    priority: SupportCasePriority = Field(default=SupportCasePriority.MEDIUM, description="Priority")
    
    # Assignment
    assigned_to: Optional[str] = Field(None, description="Assigned support agent")
    created_by: str = Field(..., description="User who created the case")
    
    # External references
    jira_ticket_id: Optional[str] = Field(None, description="Linked JIRA ticket ID")
    jira_ticket_status: Optional[str] = Field(None, description="JIRA ticket status")
    
    # Communication
    customer_email: Optional[EmailStr] = Field(None, description="Customer email")
    internal_notes: List[str] = Field(default_factory=list, description="Internal notes")
    
    # Resolution
    resolution: Optional[str] = Field(None, description="Resolution details")
    resolved_at: Optional[datetime] = Field(None, description="Resolution timestamp")
    resolved_by: Optional[str] = Field(None, description="User who resolved the case")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    tags: List[str] = Field(default_factory=list, description="Case tags")

    class Config:
        collection_name = "support_cases"
        indexes = [
            [("tenant_id", 1), ("status", 1)],
            [("user_id", 1)],
            [("assigned_to", 1)],
            [("priority", 1)],
            [("created_at", -1)],
        ]


class ImpersonationSessionSchema(BaseSchema):
    """Impersonation session schema (for support/admin access)."""

    admin_user_id: PyObjectId = Field(..., description="Admin user performing impersonation")
    target_user_id: PyObjectId = Field(..., description="User being impersonated")
    tenant_id: Optional[PyObjectId] = Field(None, description="Tenant context")
    
    # Session details
    status: ImpersonationStatus = Field(default=ImpersonationStatus.ACTIVE, description="Session status")
    reason: str = Field(..., description="Reason for impersonation")
    ip_address: Optional[str] = Field(None, description="IP address")
    
    # Lifecycle
    started_at: datetime = Field(default_factory=datetime.utcnow, description="Session start time")
    ended_at: Optional[datetime] = Field(None, description="Session end time")
    expires_at: Optional[datetime] = Field(None, description="Session expiration time")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    class Config:
        collection_name = "impersonation_sessions"
        indexes = [
            [("admin_user_id", 1)],
            [("target_user_id", 1)],
            [("status", 1)],
            [("started_at", -1)],
        ]


class AnnouncementSchema(BaseSchema):
    """Announcement/banner schema."""

    title: str = Field(..., description="Announcement title")
    message: str = Field(..., description="Announcement message")
    type: AnnouncementType = Field(..., description="Announcement type")
    
    # Targeting
    tenant_id: Optional[PyObjectId] = Field(None, description="Tenant ID (None for global)")
    user_id: Optional[PyObjectId] = Field(None, description="User ID (None for all users)")
    
    # Visibility
    is_active: bool = Field(default=True, description="Whether announcement is active")
    start_at: Optional[datetime] = Field(None, description="Start time")
    end_at: Optional[datetime] = Field(None, description="End time")
    
    # Display
    dismissible: bool = Field(default=True, description="Whether user can dismiss")
    priority: int = Field(default=0, description="Display priority (higher = more prominent)")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    action_url: Optional[str] = Field(None, description="Optional action URL")

    class Config:
        collection_name = "announcements"
        indexes = [
            [("tenant_id", 1), ("is_active", 1)],
            [("is_active", 1), ("start_at", 1), ("end_at", 1)],
        ]
