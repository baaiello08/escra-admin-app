"""
Tenant Repository

MongoDB data access layer for tenant/organization operations.
"""

from typing import Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import structlog

from app.models.tenant import TenantSchema
from app.core.database import get_db

logger = structlog.get_logger()


class TenantRepository:
    """Repository for tenant/organization data access."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_db()
        self.collection = self.db[TenantSchema.Config.collection_name]

    async def create(self, tenant_data: dict) -> TenantSchema:
        """Create a new tenant."""
        result = await self.collection.insert_one(tenant_data)
        tenant = await self.collection.find_one({"_id": result.inserted_id})
        # Convert ObjectId to string for Pydantic
        if tenant and "_id" in tenant:
            tenant["_id"] = str(tenant["_id"])
        return TenantSchema(**tenant)

    async def get_by_id(self, tenant_id: str) -> Optional[TenantSchema]:
        """Get tenant by ID."""
        tenant = await self.collection.find_one({"_id": ObjectId(tenant_id)})
        if tenant:
            # Convert ObjectId to string for Pydantic
            if "_id" in tenant:
                tenant["_id"] = str(tenant["_id"])
            return TenantSchema(**tenant)
        return None

    async def get_by_slug(self, slug: str) -> Optional[TenantSchema]:
        """Get tenant by slug."""
        tenant = await self.collection.find_one({"slug": slug})
        if tenant:
            # Convert ObjectId to string for Pydantic
            if "_id" in tenant:
                tenant["_id"] = str(tenant["_id"])
            return TenantSchema(**tenant)
        return None

    async def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
    ) -> tuple[List[TenantSchema], int]:
        """List all tenants with optional filtering. Returns (items, total_count)."""
        query = {}
        if status:
            query["status"] = status
        
        # Get total count
        total = await self.collection.count_documents(query)
        
        # Get paginated results
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        tenants = await cursor.to_list(length=limit)
        # Convert ObjectId to string for Pydantic
        for tenant in tenants:
            if "_id" in tenant:
                tenant["_id"] = str(tenant["_id"])
        return ([TenantSchema(**t) for t in tenants], total)

    async def update(self, tenant_id: str, updates: dict) -> Optional[TenantSchema]:
        """Update tenant information."""
        updates["updated_at"] = datetime.utcnow()
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(tenant_id)},
            {"$set": updates},
            return_document=True,
        )
        if result:
            # Convert ObjectId to string for Pydantic
            if "_id" in result:
                result["_id"] = str(result["_id"])
            return TenantSchema(**result)
        return None

    async def delete(self, tenant_id: str) -> bool:
        """Delete a tenant (soft delete by setting status)."""
        result = await self.collection.update_one(
            {"_id": ObjectId(tenant_id)},
            {"$set": {"status": "inactive", "updated_at": datetime.utcnow()}},
        )
        return result.modified_count > 0


from datetime import datetime  # Import at module level

