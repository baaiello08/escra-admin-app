"""
Billing, Plans & Usage Domain Models

MongoDB collections and Pydantic schemas for subscription management, billing, and usage tracking.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import Field, EmailStr
from app.models.base import BaseSchema, PyObjectId


class PlanTier(str, Enum):
    """Subscription plan tiers."""

    FREE = "free"
    ESSENTIAL = "essential"
    PRO = "pro"
    GROWTH = "growth"
    ENTERPRISE = "enterprise"


class BillingCycle(str, Enum):
    """Billing cycle."""

    MONTHLY = "monthly"
    YEARLY = "yearly"
    ANNUAL = "annual"


class PaymentStatus(str, Enum):
    """Payment status."""

    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class UsageMetricType(str, Enum):
    """Usage metric types."""

    ON_CHAIN_FEES = "on_chain_fees"
    ALGO_LOCKED = "algo_locked"
    STORAGE_OBJECT = "storage_object"
    STORAGE_DB = "storage_db"
    API_CALLS = "api_calls"
    CONTRACTS = "contracts"
    DOCUMENTS = "documents"
    SIGNATURES = "signatures"


class PlanTierSchema(BaseSchema):
    """Plan tier definition schema."""

    name: PlanTier = Field(..., description="Plan tier name")
    display_name: str = Field(..., description="Display name")
    description: Optional[str] = Field(None, description="Plan description")
    
    # Pricing
    monthly_price: float = Field(..., description="Monthly price (USD)")
    yearly_price: Optional[float] = Field(None, description="Yearly price (USD)")
    
    # Limits
    max_users: Optional[int] = Field(None, description="Maximum users")
    max_contracts: Optional[int] = Field(None, description="Maximum contracts per month")
    max_storage_gb: Optional[float] = Field(None, description="Maximum storage (GB)")
    max_api_calls: Optional[int] = Field(None, description="Maximum API calls per month")
    
    # Features
    features: List[str] = Field(default_factory=list, description="Included features")
    is_custom: bool = Field(default=False, description="Custom enterprise tier")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    class Config:
        collection_name = "plan_tiers"


class BillingConfigSchema(BaseSchema):
    """Tenant billing configuration schema."""

    tenant_id: PyObjectId = Field(..., description="Tenant ID")
    plan_tier: PlanTier = Field(..., description="Current plan tier")
    billing_cycle: BillingCycle = Field(default=BillingCycle.MONTHLY, description="Billing cycle")
    
    # Payment information
    payment_method_id: Optional[str] = Field(None, description="Payment method ID (Stripe, etc.)")
    billing_email: Optional[EmailStr] = Field(None, description="Billing contact email")
    
    # Subscription
    subscription_id: Optional[str] = Field(None, description="Subscription ID (Stripe, etc.)")
    subscription_status: str = Field(default="active", description="Subscription status")
    current_period_start: Optional[datetime] = Field(None, description="Current billing period start")
    current_period_end: Optional[datetime] = Field(None, description="Current billing period end")
    cancel_at_period_end: bool = Field(default=False, description="Cancel at period end")
    
    # Custom pricing (for Enterprise)
    custom_monthly_rate: Optional[float] = Field(None, description="Custom monthly rate")
    custom_yearly_rate: Optional[float] = Field(None, description="Custom yearly rate")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    class Config:
        collection_name = "billing_configs"
        indexes = [
            [("tenant_id", 1)],
            [("subscription_id", 1)],
        ]


class UsageMetricSchema(BaseSchema):
    """Usage metric snapshot schema."""

    tenant_id: PyObjectId = Field(..., description="Tenant ID")
    metric_type: UsageMetricType = Field(..., description="Metric type")
    period_start: datetime = Field(..., description="Period start")
    period_end: datetime = Field(..., description="Period end")
    
    # Values
    value: float = Field(..., description="Metric value")
    unit: str = Field(..., description="Unit (USD, GB, count, etc.)")
    cost: Optional[float] = Field(None, description="Associated cost (USD)")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    class Config:
        collection_name = "usage_metrics"
        indexes = [
            [("tenant_id", 1), ("metric_type", 1), ("period_start", -1)],
            [("period_start", -1)],
        ]


class BillingEventSchema(BaseSchema):
    """Billing event (invoice, payment, etc.)."""

    tenant_id: PyObjectId = Field(..., description="Tenant ID")
    event_type: str = Field(..., description="Event type (invoice, payment, refund, etc.)")
    amount: float = Field(..., description="Amount (USD)")
    currency: str = Field(default="USD", description="Currency")
    status: PaymentStatus = Field(..., description="Payment status")
    
    # External references
    invoice_id: Optional[str] = Field(None, description="Invoice ID")
    payment_intent_id: Optional[str] = Field(None, description="Payment intent ID (Stripe, etc.)")
    transaction_id: Optional[str] = Field(None, description="Transaction ID")
    
    # Period
    period_start: Optional[datetime] = Field(None, description="Billing period start")
    period_end: Optional[datetime] = Field(None, description="Billing period end")
    
    # Metadata
    description: Optional[str] = Field(None, description="Event description")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

    class Config:
        collection_name = "billing_events"
        indexes = [
            [("tenant_id", 1), ("event_type", 1)],
            [("status", 1)],
            [("created_at", -1)],
        ]
