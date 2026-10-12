"""
Contract Repository

MongoDB data access layer for contract operations.
Reads from the Escra App database (shared MongoDB).
"""

from typing import Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import structlog

from app.models.contract import ContractSchema, ContractStatus
from app.core.database import get_db

logger = structlog.get_logger()


class ContractRepository:
    """Repository for contract data access."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_db()
        self.collection = self.db[ContractSchema.Config.collection_name]

    async def get_by_id(self, contract_id: str) -> Optional[ContractSchema]:
        """Get contract by public contract ID."""
        contract = await self.collection.find_one({"escra_public_contract_id": contract_id})
        if contract:
            if "_id" in contract:
                contract["_id"] = str(contract["_id"])
            return ContractSchema(**contract)
        return None

    async def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        user_creator_id: Optional[str] = None,
        status: Optional[ContractStatus] = None,
    ) -> tuple[List[ContractSchema], int]:
        """List all contracts with optional filtering. Returns (items, total_count)."""
        query = {}
        
        if tenant_id:
            query["tenant_id"] = tenant_id
        if user_creator_id:
            query["user_creator_id"] = user_creator_id
        if status:
            query["status"] = status.value if isinstance(status, ContractStatus) else status
        
        # Get total count
        total = await self.collection.count_documents(query)
        
        # Get paginated results
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("created_date", -1)
        contracts = await cursor.to_list(length=limit)
        
        # Convert ObjectIds to strings
        for contract in contracts:
            if "_id" in contract:
                contract["_id"] = str(contract["_id"])
        
        return ([ContractSchema(**c) for c in contracts], total)
