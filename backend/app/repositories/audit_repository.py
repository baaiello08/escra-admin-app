"""
Audit Log Repository

MongoDB data access layer for audit log operations.
Audit logs are append-only and immutable.
"""

from typing import Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import structlog
import hashlib
import json

from app.models.audit import AuditLogSchema, AuditActionType
from app.core.database import get_db

logger = structlog.get_logger()


class AuditRepository:
    """Repository for audit log data access."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_db()
        self.collection = self.db[AuditLogSchema.Config.collection_name]

    async def create(self, audit_data: dict) -> AuditLogSchema:
        """Create a new audit log entry (append-only)."""
        # Get the previous entry to create hash chain
        previous_entry = await self.collection.find_one(
            sort=[("created_at", -1)]
        )
        
        # Calculate hash of previous entry for tamper-evident chain
        if previous_entry:
            previous_hash = self._calculate_hash(previous_entry)
            audit_data["previous_entry_id"] = previous_entry["_id"]
            audit_data["hash"] = previous_hash
        else:
            # First entry
            audit_data["hash"] = "genesis"
        
        audit_data["created_at"] = datetime.utcnow()
        audit_data["updated_at"] = datetime.utcnow()
        
        result = await self.collection.insert_one(audit_data)
        audit_log = await self.collection.find_one({"_id": result.inserted_id})
        
        # Convert ObjectId to string for Pydantic
        if audit_log and "_id" in audit_log:
            audit_log["_id"] = str(audit_log["_id"])
        if audit_log and "previous_entry_id" in audit_log and audit_log["previous_entry_id"]:
            audit_log["previous_entry_id"] = str(audit_log["previous_entry_id"])
        if audit_log and "actor_user_id" in audit_log and audit_log["actor_user_id"]:
            audit_log["actor_user_id"] = str(audit_log["actor_user_id"])
        if audit_log and "target_tenant_id" in audit_log and audit_log["target_tenant_id"]:
            audit_log["target_tenant_id"] = str(audit_log["target_tenant_id"])
        if audit_log and "tenant_id" in audit_log and audit_log["tenant_id"]:
            audit_log["tenant_id"] = str(audit_log["tenant_id"])
        
        return AuditLogSchema(**audit_log)

    def _calculate_hash(self, entry: dict) -> str:
        """Calculate hash of an audit log entry for chain integrity."""
        # Create a deterministic representation
        hash_data = {
            "id": str(entry["_id"]),
            "action_type": entry.get("action_type"),
            "actor_user_id": str(entry.get("actor_user_id", "")),
            "target_id": entry.get("target_id", ""),
            "created_at": entry.get("created_at").isoformat() if entry.get("created_at") else "",
            "hash": entry.get("hash", ""),
        }
        hash_string = json.dumps(hash_data, sort_keys=True)
        return hashlib.sha256(hash_string.encode()).hexdigest()

    async def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        action_type: Optional[AuditActionType] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[AuditLogSchema]:
        """List audit logs with optional filtering."""
        query = {}
        
        if tenant_id:
            query["tenant_id"] = ObjectId(tenant_id)
        
        if user_id:
            query["actor_user_id"] = ObjectId(user_id)
        
        if action_type:
            query["action_type"] = action_type.value
        
        if start_date or end_date:
            query["created_at"] = {}
            if start_date:
                query["created_at"]["$gte"] = start_date
            if end_date:
                query["created_at"]["$lte"] = end_date
        
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
        logs = await cursor.to_list(length=limit)
        
        # Convert ObjectIds to strings
        for log in logs:
            if "_id" in log:
                log["_id"] = str(log["_id"])
            if "previous_entry_id" in log and log["previous_entry_id"]:
                log["previous_entry_id"] = str(log["previous_entry_id"])
            if "actor_user_id" in log and log["actor_user_id"]:
                log["actor_user_id"] = str(log["actor_user_id"])
            if "target_tenant_id" in log and log["target_tenant_id"]:
                log["target_tenant_id"] = str(log["target_tenant_id"])
            if "tenant_id" in log and log["tenant_id"]:
                log["tenant_id"] = str(log["tenant_id"])
        
        return [AuditLogSchema(**log) for log in logs]

    async def get_by_id(self, log_id: str) -> Optional[AuditLogSchema]:
        """Get audit log by ID."""
        log = await self.collection.find_one({"_id": ObjectId(log_id)})
        if log:
            # Convert ObjectId to string
            if "_id" in log:
                log["_id"] = str(log["_id"])
            if "previous_entry_id" in log and log["previous_entry_id"]:
                log["previous_entry_id"] = str(log["previous_entry_id"])
            if "actor_user_id" in log and log["actor_user_id"]:
                log["actor_user_id"] = str(log["actor_user_id"])
            if "target_tenant_id" in log and log["target_tenant_id"]:
                log["target_tenant_id"] = str(log["target_tenant_id"])
            if "tenant_id" in log and log["tenant_id"]:
                log["tenant_id"] = str(log["tenant_id"])
            return AuditLogSchema(**log)
        return None
