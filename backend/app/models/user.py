"""
User & Identity Domain Models

MongoDB collections and Pydantic schemas for user management, identity verification, and Persona integration.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import Field, EmailStr
from app.models.base import BaseSchema, PyObjectId


class UserStatus(str, Enum):
    """User account status."""

    ACTIVE = "active"
    SUSPENDED = "suspended"
    PENDING_VERIFICATION = "pending_verification"
    INACTIVE = "inactive"


class VerificationLevel(str, Enum):
    """Identity verification level."""

    NONE = "none"
    BASIC = "basic"
    STANDARD = "standard"
    ENHANCED = "enhanced"
    ENTERPRISE = "enterprise"


class PersonaVerificationStatus(str, Enum):
    """Persona verification status."""

    PENDING = "pending"
    APPROVED = "approved"
    DECLINED = "declined"
    EXPIRED = "expired"
    CANCELED = "canceled"
    PROCESSING = "processing"


class UserSchema(BaseSchema):
    """User document schema."""

    tenant_id: PyObjectId = Field(..., description="Tenant this user belongs to")
    email: EmailStr = Field(..., description="User email address")
    first_name: Optional[str] = Field(None, description="First name")
    last_name: Optional[str] = Field(None, description="Last name")
    status: UserStatus = Field(default=UserStatus.PENDING_VERIFICATION, description="User status")
    
    # Authentication
    password_hash: Optional[str] = Field(None, description="Bcrypt password hash (if using password auth)")
    email_verified: bool = Field(default=False, description="Email verification status")
    
    # Identity verification
    verification_level: VerificationLevel = Field(default=VerificationLevel.NONE, description="Identity verification level")
    persona_inquiry_id: Optional[str] = Field(None, description="Persona inquiry/investigation ID")
    persona_verification_status: Optional[PersonaVerificationStatus] = Field(
        None, description="Persona verification status"
    )
    persona_risk_signals: List[str] = Field(default_factory=list, description="Persona risk signals")
    
    # Roles and permissions
    roles: List[str] = Field(default_factory=list, description="User roles (org_admin, contract_owner, etc.)")
    system_roles: List[str] = Field(default_factory=list, description="System-wide roles (super_admin, support, etc.)")
    permissions: List[str] = Field(default_factory=list, description="Fine-grained permissions")
    
    # Linked identities
    linked_identities: Dict[str, Any] = Field(
        default_factory=dict, description="Linked identity providers (SSO, HRIS, etc.)"
    )
    
    # Sessions
    last_login_at: Optional[datetime] = Field(None, description="Last login timestamp")
    last_login_ip: Optional[str] = Field(None, description="Last login IP address")
    
    # PII classification and compliance
    pii_classification: Optional[str] = Field(None, description="PII data classification level")
    data_subject_requests: List[str] = Field(default_factory=list, description="Data subject request IDs (GDPR/CCPA)")

    class Config:
        collection_name = "users"
        indexes = [
            [("tenant_id", 1), ("email", 1)],  # Compound index for tenant + email uniqueness
            [("persona_inquiry_id", 1)],
        ]


class UserCreateSchema(BaseSchema):
    """Schema for creating a new user."""

    tenant_id: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None  # Will be hashed
    roles: List[str] = []


class UserUpdateSchema(BaseSchema):
    """Schema for updating user information."""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    status: Optional[UserStatus] = None
    roles: Optional[List[str]] = None
    verification_level: Optional[VerificationLevel] = None


class PersonaInquirySchema(BaseSchema):
    """Persona inquiry/investigation document for tracking identity verification."""

    tenant_id: PyObjectId = Field(..., description="Tenant ID")
    user_id: PyObjectId = Field(..., description="User ID")
    persona_inquiry_id: str = Field(..., description="Persona API inquiry ID")
    
    status: PersonaVerificationStatus = Field(..., description="Current verification status")
    verification_level: VerificationLevel = Field(..., description="Verification level")
    
    # Persona webhook data
    persona_data: Dict[str, Any] = Field(default_factory=dict, description="Raw Persona API response")
    risk_signals: List[str] = Field(default_factory=list, description="Risk signals from Persona")
    
    # Timeline
    created_at_persona: Optional[datetime] = Field(None, description="Persona inquiry creation time")
    completed_at: Optional[datetime] = Field(None, description="Verification completion time")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    class Config:
        collection_name = "persona_inquiries"
        indexes = [
            [("persona_inquiry_id", 1)],
            [("tenant_id", 1), ("user_id", 1)],
        ]

