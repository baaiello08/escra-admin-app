"""
On-Chain Event Repository

MongoDB data access layer for on-chain event operations.
Reads from the shared database where the indexer stores Algorand events.
"""

from typing import Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import structlog

from app.models.indexer import OnChainEventSchema, EventType
from app.core.database import get_db

logger = structlog.get_logger()


class OnChainEventRepository:
    """Repository for on-chain event data access."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_db()
        self.collection = self.db[OnChainEventSchema.Config.collection_name]

    async def get_by_tx_id(self, tx_id: str) -> Optional[OnChainEventSchema]:
        """Get on-chain event by transaction ID."""
        event = await self.collection.find_one({"tx_id": tx_id})
        if event:
            if "_id" in event:
                event["_id"] = str(event["_id"])
            if "tenant_id" in event and isinstance(event["tenant_id"], ObjectId):
                event["tenant_id"] = str(event["tenant_id"])
            return OnChainEventSchema(**event)
        return None

    async def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        contract_id: Optional[str] = None,
        document_id: Optional[str] = None,
        event_type: Optional[EventType] = None,
        app_id: Optional[int] = None,
    ) -> tuple[List[OnChainEventSchema], int]:
        """List all on-chain events with optional filtering. Returns (items, total_count)."""
        query = {}
        
        if tenant_id:
            # tenant_id is escra_public_org_id (string), not ObjectId
            query["tenant_id"] = tenant_id
        if contract_id:
            query["contract_id"] = contract_id
        if document_id:
            query["document_id"] = document_id
        if event_type:
            query["event_type"] = event_type.value if isinstance(event_type, EventType) else event_type
        if app_id:
            query["app_id"] = app_id
        
        # Get total count
        total = await self.collection.count_documents(query)
        
        # Get paginated results
        cursor = self.collection.find(query).skip(skip).limit(limit).sort("timestamp", -1)
        events = await cursor.to_list(length=limit)
        
        # Convert ObjectIds to strings
        for event in events:
            if "_id" in event:
                event["_id"] = str(event["_id"])
            # tenant_id is already a string (escra_public_org_id), no conversion needed
        
        return ([OnChainEventSchema(**e) for e in events], total)
