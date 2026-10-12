"""
Seed Initial Data

Script to seed initial roles, permissions, and a super admin user.
Run with: python -m scripts.seed_data
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import init_db, get_db
from app.repositories.tenant_repository import TenantRepository
from app.repositories.user_repository import UserRepository
from app.models.tenant import TenantCreateSchema, TenantPlan, TenantStatus
from app.models.user import UserStatus, VerificationLevel
from app.core.security import get_password_hash
import structlog

logger = structlog.get_logger()


# System roles and their permissions
SYSTEM_ROLES = {
    "super_admin": [
        "*",  # All permissions
    ],
    "support": [
        "users:read",
        "users:update",
        "tenants:read",
        "tenants:update",
        "support:read",
        "support:create",
        "support:update",
    ],
    "compliance": [
        "users:read",
        "tenants:read",
        "security:read",
        "security:update",
        "persona:read_inquiry",
        "persona:list_inquiries",
    ],
    "ops": [
        "indexer:read",
        "indexer:control",
        "indexer:backfill",
        "ops:read",
        "ops:update",
    ],
}

# Tenant roles and their permissions
TENANT_ROLES = {
    "org_admin": [
        "users:read",
        "users:create",
        "users:update",
        "tenants:read",
        "tenants:update",
        "contracts:read",
        "contracts:create",
        "contracts:update",
        "billing:read",
    ],
    "contract_owner": [
        "contracts:read",
        "contracts:create",
        "contracts:update",
        "contracts:delete",
        "documents:read",
        "documents:create",
    ],
    "signer": [
        "contracts:read",
        "documents:read",
        "documents:sign",
    ],
    "viewer": [
        "contracts:read",
        "documents:read",
    ],
    "auditor": [
        "ledger:read",
        "audit:read",
        "contracts:read",
    ],
}


async def seed_initial_data():
    """Seed initial roles, permissions, and super admin user."""
    await init_db()
    
    # Create a default tenant for the super admin
    tenant_repo = TenantRepository()
    
    # Check if default tenant exists
    default_tenant = await tenant_repo.get_by_slug("escra-admin")
    
    if not default_tenant:
        logger.info("Creating default admin tenant")
        tenant_data = TenantCreateSchema(
            name="Escra Admin",
            slug="escra-admin",
            plan=TenantPlan.ENTERPRISE,
            region="us-east-1",
        )
        default_tenant = await tenant_repo.create(tenant_data.model_dump())
        logger.info("Default tenant created", tenant_id=str(default_tenant.id))
    else:
        logger.info("Default tenant already exists", tenant_id=str(default_tenant.id))
    
    # Create super admin user
    user_repo = UserRepository()
    
    # Check if super admin exists
    super_admin = await user_repo.get_by_email("admin@escra.io", str(default_tenant.id))
    
    if not super_admin:
        logger.info("Creating super admin user")
        super_admin_data = {
            "tenant_id": str(default_tenant.id),
            "email": "admin@escra.io",
            "first_name": "Super",
            "last_name": "Admin",
            "password_hash": get_password_hash("admin123"),  # Change in production!
            "status": UserStatus.ACTIVE,
            "email_verified": True,
            "verification_level": VerificationLevel.ENTERPRISE,
            "system_roles": ["super_admin"],
            "roles": [],
            "permissions": ["*"],  # All permissions
        }
        super_admin = await user_repo.create(super_admin_data)
        logger.info("Super admin user created", user_id=str(super_admin.id), email=super_admin.email)
    else:
        logger.info("Super admin user already exists", user_id=str(super_admin.id))
    
    logger.info("Seed data completed successfully")
    print("\n✅ Seed data completed!")
    print(f"   Super Admin: admin@escra.io")
    print(f"   Password: admin123 (CHANGE IN PRODUCTION!)")
    print(f"   Tenant: {default_tenant.name} ({default_tenant.slug})")


if __name__ == "__main__":
    asyncio.run(seed_initial_data())
