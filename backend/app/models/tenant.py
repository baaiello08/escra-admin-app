"""
Tenant & Organization Domain Models

MongoDB collections and Pydantic schemas for multi-tenant organization management.
"""

from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum
from pydantic import Field, EmailStr
from app.models.base import BaseSchema, PyObjectId


class TenantStatus(str, Enum):
    """Tenant lifecycle status."""

    ACTIVE = "active"
    SUSPENDED = "suspended"
    TRIAL = "trial"
    INACTIVE = "inactive"
    OFFBOARDING = "offboarding"


class TenantPlan(str, Enum):
    """Tenant subscription plan tiers."""

    FREE = "free"
    BASIC = "basic"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


class TenantSchema(BaseSchema):
    """Tenant/Organization document schema."""

    name: str = Field(..., description="Tenant organization name")
    slug: str = Field(..., description="URL-friendly tenant identifier")
    status: TenantStatus = Field(default=TenantStatus.TRIAL, description="Tenant status")
    plan: TenantPlan = Field(default=TenantPlan.FREE, description="Subscription plan")
    
    # Organization details
    legal_entity_name: Optional[str] = Field(None, description="Legal entity name")
    billing_entity_name: Optional[str] = Field(None, description="Billing entity name")
    tax_id: Optional[str] = Field(None, description="Tax ID / EIN")
    
    # Contact information
    primary_contact_email: Optional[EmailStr] = Field(None, description="Primary contact email")
    billing_email: Optional[EmailStr] = Field(None, description="Billing contact email")
    support_email: Optional[EmailStr] = Field(None, description="Support contact email")
    
    # Region and data residency
    region: str = Field(default="us-east-1", description="AWS region / data residency")
    timezone: str = Field(default="UTC", description="Organization timezone")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom metadata")
    
    # Lifecycle timestamps
    trial_ends_at: Optional[datetime] = Field(None, description="Trial expiration date")
    suspended_at: Optional[datetime] = Field(None, description="Suspension timestamp")
    offboarded_at: Optional[datetime] = Field(None, description="Offboarding completion timestamp")

    class Config:
        collection_name = "tenants"
        json_schema_extra = {
            "example": {
                "name": "Acme Corporation",
                "slug": "acme-corp",
                "status": "active",
                "plan": "enterprise",
                "region": "us-east-1",
            }
        }


class TenantCreateSchema(BaseSchema):
    """Schema for creating a new tenant."""

    name: str
    slug: str
    plan: TenantPlan = TenantPlan.FREE
    region: str = "us-east-1"
    primary_contact_email: Optional[EmailStr] = None


class TenantUpdateSchema(BaseSchema):
    """Schema for updating tenant information."""

    name: Optional[str] = None
    status: Optional[TenantStatus] = None
    plan: Optional[TenantPlan] = None
    legal_entity_name: Optional[str] = None
    billing_email: Optional[EmailStr] = None
    metadata: Optional[Dict[str, Any]] = None

