"""
Key Repository

MongoDB data access layer for key management operations.
"""

from typing import Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import structlog

from app.models.key import (
    KeySchema,
    KeyCreateSchema,
    KeyUpdateSchema,
    KeyType,
    KeyStatus,
)
from app.core.database import get_db

logger = structlog.get_logger()


class KeyRepository:
    """Repository for key data access."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_db()
        self.collection = self.db[KeySchema.Config.collection_name]

    async def create(self, key_data: dict) -> KeySchema:
        """Create a new key."""
        # Convert IDs to ObjectId
        if "user_id" in key_data and isinstance(key_data["user_id"], str):
            key_data["user_id"] = ObjectId(key_data["user_id"])
        if "tenant_id" in key_data and isinstance(key_data["tenant_id"], str):
            key_data["tenant_id"] = ObjectId(key_data["tenant_id"])
        if "rotated_from" in key_data and isinstance(key_data["rotated_from"], str):
            key_data["rotated_from"] = ObjectId(key_data["rotated_from"])
        
        key_data["created_at"] = datetime.utcnow()
        key_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.insert_one(key_data)
        key = await self.collection.find_one({"_id": result.inserted_id})
        
        # Convert ObjectId to string for Pydantic
        if key:
            key = self._convert_objectids_to_strings(key)
        
        return KeySchema(**key)

    async def get_by_id(self, key_id: str) -> Optional[KeySchema]:
        """Get key by ID."""
        try:
            key = await self.collection.find_one({"_id": ObjectId(key_id)})
            if key:
                key = self._convert_objectids_to_strings(key)
                return KeySchema(**key)
        except Exception as e:
            logger.warning("Error fetching key by ID", key_id=key_id, error=str(e))
        return None

    async def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        key_type: Optional[KeyType] = None,
        status: Optional[KeyStatus] = None,
    ) -> tuple[List[KeySchema], int]:
        """List all keys with optional filtering. Returns (items, total_count)."""
        query = {}
        
        if tenant_id:
            query["tenant_id"] = ObjectId(tenant_id)
        if user_id:
            query["user_id"] = ObjectId(user_id)
        if key_type:
            query["key_type"] = key_type.value
        if status:
            query["status"] = status.value
        
        # Get total count
        total = await self.collection.count_documents(query)
        
        # Get paginated results
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        keys = await cursor.to_list(length=limit)
        
        # Convert ObjectIds to strings
        for key in keys:
            key = self._convert_objectids_to_strings(key)
        
        return ([KeySchema(**key) for key in keys], total)

    async def update(self, key_id: str, update_data: dict) -> Optional[KeySchema]:
        """Update a key."""
        # Convert IDs to ObjectId if present
        if "user_id" in update_data and isinstance(update_data["user_id"], str):
            update_data["user_id"] = ObjectId(update_data["user_id"])
        if "tenant_id" in update_data and isinstance(update_data["tenant_id"], str):
            update_data["tenant_id"] = ObjectId(update_data["tenant_id"])
        if "rotated_from" in update_data and isinstance(update_data["rotated_from"], str):
            update_data["rotated_from"] = ObjectId(update_data["rotated_from"])
        
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {"_id": ObjectId(key_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            key = await self.collection.find_one({"_id": ObjectId(key_id)})
            if key:
                key = self._convert_objectids_to_strings(key)
                return KeySchema(**key)
        return None

    async def delete(self, key_id: str) -> bool:
        """Soft delete a key (update status to revoked)."""
        result = await self.collection.update_one(
            {"_id": ObjectId(key_id)},
            {
                "$set": {
                    "status": KeyStatus.REVOKED.value,
                    "revoked_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        return result.modified_count > 0

    async def update_last_used(self, key_id: str) -> None:
        """Update last used timestamp and increment usage count."""
        await self.collection.update_one(
            {"_id": ObjectId(key_id)},
            {
                "$set": {"last_used_at": datetime.utcnow()},
                "$inc": {"usage_count": 1},
                "$set": {"updated_at": datetime.utcnow()},
            }
        )

    def _convert_objectids_to_strings(self, doc: dict) -> dict:
        """Convert ObjectId fields to strings for Pydantic."""
        if "_id" in doc and isinstance(doc["_id"], ObjectId):
            doc["_id"] = str(doc["_id"])
        if "user_id" in doc and isinstance(doc["user_id"], ObjectId):
            doc["user_id"] = str(doc["user_id"])
        if "tenant_id" in doc and isinstance(doc["tenant_id"], ObjectId):
            doc["tenant_id"] = str(doc["tenant_id"])
        if "rotated_from" in doc and isinstance(doc["rotated_from"], ObjectId):
            doc["rotated_from"] = str(doc["rotated_from"])
        return doc
