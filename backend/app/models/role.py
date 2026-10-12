"""
Roles, Permissions & Policy Domain Models

RBAC system with system roles, tenant roles, custom roles, and permission matrices.
"""

from typing import Optional, List, Dict, Any
from pydantic import Field
from app.models.base import BaseSchema, PyObjectId


from enum import Enum


class RoleType(str, Enum):
    """Role type enumeration."""

    SYSTEM = "system"  # Global system roles (super_admin, support, compliance, ops)
    TENANT = "tenant"  # Tenant-scoped roles (org_admin, contract_owner, signer, viewer, auditor)
    CUSTOM = "custom"  # Custom tenant-defined roles


class RoleSchema(BaseSchema):
    """Role document schema."""

    name: str = Field(..., description="Role name (e.g., 'org_admin', 'super_admin')")
    type: RoleType = Field(..., description="Role type: system, tenant, or custom")
    tenant_id: Optional[PyObjectId] = Field(None, description="Tenant ID (for tenant/custom roles)")
    
    # Permissions
    permissions: List[str] = Field(default_factory=list, description="List of permission strings")
    permission_scopes: Dict[str, List[str]] = Field(
        default_factory=dict, description="Resource-scoped permissions (resource_type: [actions])"
    )
    
    # Metadata
    description: Optional[str] = Field(None, description="Role description")
    is_default: bool = Field(default=False, description="Is this a default role (non-deletable)?")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom metadata")

    class Config:
        collection_name = "roles"
        indexes = [
            [("name", 1), ("type", 1), ("tenant_id", 1)],  # Compound unique index
            [("tenant_id", 1)],
        ]


class PermissionSchema(BaseSchema):
    """Permission definition schema (for permission matrix)."""

    name: str = Field(..., description="Permission identifier (e.g., 'users:create', 'contracts:sign')")
    resource_type: str = Field(..., description="Resource type (e.g., 'users', 'contracts', 'ledger')")
    action: str = Field(..., description="Action (e.g., 'create', 'read', 'update', 'delete', 'sign')")
    description: Optional[str] = Field(None, description="Permission description")
    
    # Scope
    tenant_scoped: bool = Field(default=True, description="Is this permission tenant-scoped?")
    system_only: bool = Field(default=False, description="Is this permission only for system roles?")

    class Config:
        collection_name = "permissions"
        indexes = [
            [("resource_type", 1), ("action", 1)],  # Compound index
        ]

