"""
User Repository

MongoDB data access layer for user management operations.
"""

from typing import Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import structlog

from app.models.user import UserSchema, UserCreateSchema, UserUpdateSchema
from app.core.database import get_db
from app.core.security import get_password_hash

logger = structlog.get_logger()


class UserRepository:
    """Repository for user data access."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_db()
        self.collection = self.db[UserSchema.Config.collection_name]

    async def create(self, user_data: dict) -> UserSchema:
        """Create a new user."""
        # Hash password if provided
        if "password" in user_data:
            password = user_data.pop("password")
            user_data["password_hash"] = get_password_hash(password)
        
        # Convert tenant_id to ObjectId
        if "tenant_id" in user_data and isinstance(user_data["tenant_id"], str):
            user_data["tenant_id"] = ObjectId(user_data["tenant_id"])
        
        user_data["created_at"] = datetime.utcnow()
        user_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.insert_one(user_data)
        user = await self.collection.find_one({"_id": result.inserted_id})
        # Convert ObjectId to string for Pydantic
        if user:
            if "_id" in user:
                user["_id"] = str(user["_id"])
            if "tenant_id" in user and isinstance(user["tenant_id"], ObjectId):
                user["tenant_id"] = str(user["tenant_id"])
        return UserSchema(**user)

    async def get_by_id(self, user_id: str) -> Optional[UserSchema]:
        """Get user by ID."""
        try:
            user = await self.collection.find_one({"_id": ObjectId(user_id)})
            if user:
                return UserSchema(**user)
        except Exception as e:
            logger.warning("Error fetching user by ID", user_id=user_id, error=str(e))
        return None

    async def get_by_email(self, email: str, tenant_id: Optional[str] = None) -> Optional[UserSchema]:
        """Get user by email, optionally scoped to tenant."""
        query = {"email": email}
        if tenant_id:
            query["tenant_id"] = ObjectId(tenant_id)
        
        user = await self.collection.find_one(query)
        if user:
            # Convert ObjectId to string for Pydantic
            if "_id" in user:
                user["_id"] = str(user["_id"])
            if "tenant_id" in user and isinstance(user["tenant_id"], ObjectId):
                user["tenant_id"] = str(user["tenant_id"])
            return UserSchema(**user)
        return None

    async def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        status: Optional[str] = None,
        role: Optional[str] = None,
        search: Optional[str] = None,
    ) -> tuple[List[UserSchema], int]:
        """List all users with optional filtering. Returns (items, total_count)."""
        query = {}
        
        if tenant_id:
            query["tenant_id"] = ObjectId(tenant_id)
        
        if status:
            query["status"] = status
        
        if role:
            query["roles"] = {"$in": [role]}
        
        if search:
            query["$or"] = [
                {"email": {"$regex": search, "$options": "i"}},
                {"first_name": {"$regex": search, "$options": "i"}},
                {"last_name": {"$regex": search, "$options": "i"}},
            ]
        
        # Get total count
        total = await self.collection.count_documents(query)
        
        # Get paginated results
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        users = await cursor.to_list(length=limit)
        # Convert ObjectId to string for Pydantic
        for user in users:
            if "_id" in user:
                user["_id"] = str(user["_id"])
            if "tenant_id" in user and isinstance(user["tenant_id"], ObjectId):
                user["tenant_id"] = str(user["tenant_id"])
        return ([UserSchema(**u) for u in users], total)

    async def update(self, user_id: str, updates: dict) -> Optional[UserSchema]:
        """Update user information."""
        # Hash password if provided
        if "password" in updates:
            password = updates.pop("password")
            updates["password_hash"] = get_password_hash(password)
        
        updates["updated_at"] = datetime.utcnow()
        
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(user_id)},
            {"$set": updates},
            return_document=True,
        )
        if result:
            # Convert ObjectId to string for Pydantic
            if "_id" in result:
                result["_id"] = str(result["_id"])
            if "tenant_id" in result and isinstance(result["tenant_id"], ObjectId):
                result["tenant_id"] = str(result["tenant_id"])
            return UserSchema(**result)
        return None

    async def delete(self, user_id: str) -> bool:
        """Soft delete a user by setting status to inactive."""
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"status": "inactive", "updated_at": datetime.utcnow()}},
        )
        return result.modified_count > 0

    async def update_last_login(self, user_id: str, ip_address: Optional[str] = None) -> None:
        """Update user's last login timestamp and IP."""
        updates = {"last_login_at": datetime.utcnow()}
        if ip_address:
            updates["last_login_ip"] = ip_address
        
        await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": updates},
        )
