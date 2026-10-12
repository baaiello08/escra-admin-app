"""
Security, Compliance & Risk Domain Models

MongoDB collections and Pydantic schemas for security events, compliance, abuse cases, and fraud detection.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import Field
from app.models.base import BaseSchema, PyObjectId


class RiskLevel(str, Enum):
    """Risk level enumeration."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SecurityEventType(str, Enum):
    """Security event type."""

    LOGIN_FAILURE = "login_failure"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    DATA_BREACH = "data_breach"
    POLICY_VIOLATION = "policy_violation"
    ACCOUNT_COMPROMISE = "account_compromise"
    FRAUD_DETECTED = "fraud_detected"


class AbuseCaseStatus(str, Enum):
    """Abuse case status."""

    OPEN = "open"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    CLOSED = "closed"
    ESCALATED = "escalated"


class FraudCaseStatus(str, Enum):
    """Fraud case status."""

    DETECTED = "detected"
    INVESTIGATING = "investigating"
    CONFIRMED = "confirmed"
    FALSE_POSITIVE = "false_positive"
    RESOLVED = "resolved"


class SecuritySettingSchema(BaseSchema):
    """Security settings schema (global or tenant-scoped)."""

    tenant_id: Optional[PyObjectId] = Field(None, description="Tenant ID (None for global settings)")
    
    # Authentication
    require_mfa: bool = Field(default=False, description="Require MFA")
    password_min_length: int = Field(default=8, description="Minimum password length")
    password_require_complexity: bool = Field(default=True, description="Require password complexity")
    session_timeout_minutes: int = Field(default=60, description="Session timeout (minutes)")
    
    # Access control
    ip_whitelist: List[str] = Field(default_factory=list, description="IP whitelist")
    ip_blacklist: List[str] = Field(default_factory=list, description="IP blacklist")
    
    # Compliance
    data_retention_days: Optional[int] = Field(None, description="Data retention period (days)")
    require_audit_logging: bool = Field(default=True, description="Require audit logging")
    
    # Risk management
    risk_threshold_high: float = Field(default=0.7, description="High risk threshold")
    risk_threshold_critical: float = Field(default=0.9, description="Critical risk threshold")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    class Config:
        collection_name = "security_settings"
        indexes = [
            [("tenant_id", 1)],
        ]


class SecurityEventSchema(BaseSchema):
    """Security event schema."""

    tenant_id: Optional[PyObjectId] = Field(None, description="Tenant ID (if tenant-scoped)")
    user_id: Optional[PyObjectId] = Field(None, description="User ID (if user-related)")
    event_type: SecurityEventType = Field(..., description="Event type")
    risk_level: RiskLevel = Field(..., description="Risk level")
    
    # Event details
    description: str = Field(..., description="Event description")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    location: Optional[str] = Field(None, description="Geographic location")
    
    # Investigation
    investigated: bool = Field(default=False, description="Whether event was investigated")
    investigation_notes: Optional[str] = Field(None, description="Investigation notes")
    resolved: bool = Field(default=False, description="Whether event is resolved")
    resolved_at: Optional[datetime] = Field(None, description="Resolution timestamp")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    related_events: List[PyObjectId] = Field(default_factory=list, description="Related event IDs")

    class Config:
        collection_name = "security_events"
        indexes = [
            [("tenant_id", 1), ("event_type", 1)],
            [("user_id", 1)],
            [("risk_level", 1)],
            [("created_at", -1)],
        ]


class AbuseCaseSchema(BaseSchema):
    """Abuse case schema."""

    tenant_id: Optional[PyObjectId] = Field(None, description="Tenant ID (if tenant-related)")
    user_id: Optional[PyObjectId] = Field(None, description="User ID (if user-related)")
    status: AbuseCaseStatus = Field(default=AbuseCaseStatus.OPEN, description="Case status")
    risk_level: RiskLevel = Field(..., description="Risk level")
    
    # Case details
    title: str = Field(..., description="Case title")
    description: str = Field(..., description="Case description")
    category: str = Field(..., description="Abuse category")
    
    # Investigation
    assigned_to: Optional[str] = Field(None, description="Assigned investigator")
    investigation_notes: List[str] = Field(default_factory=list, description="Investigation notes")
    evidence: List[str] = Field(default_factory=list, description="Evidence references")
    
    # Resolution
    resolution: Optional[str] = Field(None, description="Resolution details")
    resolved_at: Optional[datetime] = Field(None, description="Resolution timestamp")
    resolved_by: Optional[str] = Field(None, description="User who resolved the case")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    related_cases: List[PyObjectId] = Field(default_factory=list, description="Related case IDs")

    class Config:
        collection_name = "abuse_cases"
        indexes = [
            [("tenant_id", 1), ("status", 1)],
            [("user_id", 1)],
            [("risk_level", 1)],
            [("created_at", -1)],
        ]


class FraudCaseSchema(BaseSchema):
    """Fraud case schema."""

    tenant_id: Optional[PyObjectId] = Field(None, description="Tenant ID")
    user_id: Optional[PyObjectId] = Field(None, description="User ID")
    status: FraudCaseStatus = Field(..., description="Case status")
    risk_level: RiskLevel = Field(..., description="Risk level")
    
    # Case details
    title: str = Field(..., description="Case title")
    description: str = Field(..., description="Case description")
    fraud_type: str = Field(..., description="Type of fraud")
    amount_involved: Optional[float] = Field(None, description="Amount involved (if applicable)")
    
    # Detection
    detected_by: str = Field(..., description="Detection method/system")
    detection_confidence: float = Field(..., description="Detection confidence (0-1)")
    
    # Investigation
    assigned_to: Optional[str] = Field(None, description="Assigned investigator")
    investigation_notes: List[str] = Field(default_factory=list, description="Investigation notes")
    evidence: List[str] = Field(default_factory=list, description="Evidence references")
    
    # Resolution
    resolution: Optional[str] = Field(None, description="Resolution details")
    resolved_at: Optional[datetime] = Field(None, description="Resolution timestamp")
    resolved_by: Optional[str] = Field(None, description="User who resolved the case")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    related_cases: List[PyObjectId] = Field(default_factory=list, description="Related case IDs")

    class Config:
        collection_name = "fraud_cases"
        indexes = [
            [("tenant_id", 1), ("status", 1)],
            [("user_id", 1)],
            [("risk_level", 1)],
            [("created_at", -1)],
        ]
