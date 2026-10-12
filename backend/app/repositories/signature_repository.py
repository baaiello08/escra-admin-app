"""
Signature Repository

MongoDB data access layer for signature request and signature event operations.
Reads from the Escra App database (shared MongoDB).
"""

from typing import Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
import structlog

from app.models.signature import (
    SignatureRequestSchema,
    SignatureEventSchema,
    SignatureRequestStatus,
)
from app.core.database import get_db

logger = structlog.get_logger()


class SignatureRepository:
    """Repository for signature data access."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_db()
        self.requests_collection = self.db[SignatureRequestSchema.Config.collection_name]
        self.events_collection = self.db[SignatureEventSchema.Config.collection_name]

    # Signature Requests
    async def get_request_by_id(self, request_id: str) -> Optional[SignatureRequestSchema]:
        """Get signature request by public request ID."""
        request = await self.requests_collection.find_one({"escra_public_signature_request_id": request_id})
        if request:
            if "_id" in request:
                request["_id"] = str(request["_id"])
            return SignatureRequestSchema(**request)
        return None

    async def list_requests(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        document_id: Optional[str] = None,
        user_creator_id: Optional[str] = None,
        status: Optional[SignatureRequestStatus] = None,
    ) -> tuple[List[SignatureRequestSchema], int]:
        """List all signature requests with optional filtering. Returns (items, total_count)."""
        query = {}
        
        if tenant_id:
            query["tenant_id"] = tenant_id
        if document_id:
            query["document_id"] = document_id
        if user_creator_id:
            query["user_creator_id"] = user_creator_id
        if status:
            query["status"] = status.value if isinstance(status, SignatureRequestStatus) else status
        
        # Get total count
        total = await self.requests_collection.count_documents(query)
        
        # Get paginated results
        cursor = self.requests_collection.find(query).skip(skip).limit(limit).sort("created_date", -1)
        requests = await cursor.to_list(length=limit)
        
        # Convert ObjectIds to strings
        for request in requests:
            if "_id" in request:
                request["_id"] = str(request["_id"])
        
        return ([SignatureRequestSchema(**r) for r in requests], total)

    # Signature Events
    async def get_event_by_id(self, event_id: str) -> Optional[SignatureEventSchema]:
        """Get signature event by public signature ID."""
        event = await self.events_collection.find_one({"escra_public_signature_id": event_id})
        if event:
            if "_id" in event:
                event["_id"] = str(event["_id"])
            return SignatureEventSchema(**event)
        return None

    async def list_events(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        document_id: Optional[str] = None,
        signature_request_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> tuple[List[SignatureEventSchema], int]:
        """List all signature events with optional filtering. Returns (items, total_count)."""
        query = {}
        
        if tenant_id:
            query["tenant_id"] = tenant_id
        if document_id:
            query["document_id"] = document_id
        if signature_request_id:
            query["signature_request_id"] = signature_request_id
        if user_id:
            query["user_id"] = user_id
        
        # Get total count
        total = await self.events_collection.count_documents(query)
        
        # Get paginated results
        cursor = self.events_collection.find(query).skip(skip).limit(limit).sort("signed_at", -1)
        events = await cursor.to_list(length=limit)
        
        # Convert ObjectIds to strings
        for event in events:
            if "_id" in event:
                event["_id"] = str(event["_id"])
        
        return ([SignatureEventSchema(**e) for e in events], total)
