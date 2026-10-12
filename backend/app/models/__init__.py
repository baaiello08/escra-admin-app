"""
Domain models: Pydantic schemas and MongoDB document models
"""

from app.models.base import BaseSchema, PyObjectId
from app.models.tenant import TenantSchema, TenantCreateSchema, TenantUpdateSchema, TenantStatus, TenantPlan
from app.models.user import (
    UserSchema,
    UserCreateSchema,
    UserUpdateSchema,
    UserStatus,
    VerificationLevel,
    PersonaVerificationStatus,
    PersonaInquirySchema,
)
from app.models.role import RoleSchema, RoleType
from app.models.indexer import (
    OnChainEventSchema,
    ContractExecutionTraceSchema,
    SignatureEventSchema,
    StateTransitionSchema,
    ReconciliationStatusSchema,
    IndexerConfigurationSchema,
    IndexerJobRunSchema,
)
from app.models.key import (
    KeySchema,
    KeyCreateSchema,
    KeyUpdateSchema,
    KeyType,
    KeyStatus,
    KeyLifecycleEventSchema,
)
from app.models.billing import (
    PlanTierSchema,
    BillingConfigSchema,
    UsageMetricSchema,
    BillingEventSchema,
    PlanTier,
    BillingCycle,
    PaymentStatus,
    UsageMetricType,
)
from app.models.security import (
    SecuritySettingSchema,
    SecurityEventSchema,
    AbuseCaseSchema,
    FraudCaseSchema,
    RiskLevel,
    SecurityEventType,
    AbuseCaseStatus,
    FraudCaseStatus,
)
from app.models.support import (
    SupportCaseSchema,
    ImpersonationSessionSchema,
    AnnouncementSchema,
    SupportCaseStatus,
    SupportCasePriority,
    ImpersonationStatus,
    AnnouncementType,
)
from app.models.audit import AuditLogSchema, AuditActionType
from app.models.contract import ContractSchema, ContractStatus
from app.models.document import DocumentSchema, DocumentStatus
from app.models.signature import (
    SignatureRequestSchema,
    SignatureEventSchema,
    SignatureRequestStatus,
    RequiredSignerSchema,
)

__all__ = [
    # Base
    "BaseSchema",
    "PyObjectId",
    # Tenant
    "TenantSchema",
    "TenantCreateSchema",
    "TenantUpdateSchema",
    "TenantStatus",
    "TenantPlan",
    # User
    "UserSchema",
    "UserCreateSchema",
    "UserUpdateSchema",
    "UserStatus",
    "VerificationLevel",
    "PersonaVerificationStatus",
    "PersonaInquirySchema",
    # Role
    "RoleSchema",
    "RoleType",
    # Indexer
    "OnChainEventSchema",
    "ContractExecutionTraceSchema",
    "SignatureEventSchema",
    "StateTransitionSchema",
    "ReconciliationStatusSchema",
    "IndexerConfigurationSchema",
    "IndexerJobRunSchema",
    # Key
    "KeySchema",
    "KeyCreateSchema",
    "KeyUpdateSchema",
    "KeyType",
    "KeyStatus",
    "KeyLifecycleEventSchema",
    # Billing
    "PlanTierSchema",
    "BillingConfigSchema",
    "UsageMetricSchema",
    "BillingEventSchema",
    "PlanTier",
    "BillingCycle",
    "PaymentStatus",
    "UsageMetricType",
    # Security
    "SecuritySettingSchema",
    "SecurityEventSchema",
    "AbuseCaseSchema",
    "FraudCaseSchema",
    "RiskLevel",
    "SecurityEventType",
    "AbuseCaseStatus",
    "FraudCaseStatus",
    # Support
    "SupportCaseSchema",
    "ImpersonationSessionSchema",
    "AnnouncementSchema",
    "SupportCaseStatus",
    "SupportCasePriority",
    "ImpersonationStatus",
    "AnnouncementType",
    # Audit
    "AuditLogSchema",
    "AuditActionType",
    # Contract
    "ContractSchema",
    "ContractStatus",
    # Document
    "DocumentSchema",
    "DocumentStatus",
    # Signature
    "SignatureRequestSchema",
    "SignatureEventSchema",
    "SignatureRequestStatus",
    "RequiredSignerSchema",
]
