"""
Security Repository

MongoDB data access layer for security events, abuse cases, and fraud cases.
"""

from typing import Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import structlog

from app.models.security import (
    SecuritySettingSchema,
    SecurityEventSchema,
    AbuseCaseSchema,
    FraudCaseSchema,
    SecurityEventType,
    RiskLevel,
    AbuseCaseStatus,
    FraudCaseStatus,
)
from app.core.database import get_db

logger = structlog.get_logger()


class SecurityRepository:
    """Repository for security data access."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_db()
        self.security_settings = self.db[SecuritySettingSchema.Config.collection_name]
        self.security_events = self.db[SecurityEventSchema.Config.collection_name]
        self.abuse_cases = self.db[AbuseCaseSchema.Config.collection_name]
        self.fraud_cases = self.db[FraudCaseSchema.Config.collection_name]

    # ========================================================================
    # Security Settings
    # ========================================================================

    async def get_security_settings(self, tenant_id: Optional[str] = None) -> Optional[SecuritySettingSchema]:
        """Get security settings (global or tenant-scoped)."""
        query = {}
        if tenant_id:
            query["tenant_id"] = ObjectId(tenant_id)
        else:
            query["tenant_id"] = None
        
        settings = await self.security_settings.find_one(query)
        if settings:
            settings = self._convert_objectids_to_strings(settings)
            return SecuritySettingSchema(**settings)
        return None

    async def create_or_update_security_settings(self, settings_data: dict) -> SecuritySettingSchema:
        """Create or update security settings."""
        tenant_id = settings_data.get("tenant_id")
        query = {}
        if tenant_id:
            if isinstance(tenant_id, str):
                tenant_id = ObjectId(tenant_id)
                settings_data["tenant_id"] = tenant_id
            query["tenant_id"] = tenant_id
        else:
            query["tenant_id"] = None
        
        settings_data["updated_at"] = datetime.utcnow()
        if "created_at" not in settings_data:
            settings_data["created_at"] = datetime.utcnow()
        
        result = await self.security_settings.update_one(
            query,
            {"$set": settings_data},
            upsert=True
        )
        
        settings = await self.security_settings.find_one(query)
        settings = self._convert_objectids_to_strings(settings)
        return SecuritySettingSchema(**settings)

    # ========================================================================
    # Security Events
    # ========================================================================

    async def create_security_event(self, event_data: dict) -> SecurityEventSchema:
        """Create a security event."""
        if "tenant_id" in event_data and event_data["tenant_id"]:
            if isinstance(event_data["tenant_id"], str):
                event_data["tenant_id"] = ObjectId(event_data["tenant_id"])
        if "user_id" in event_data and event_data["user_id"]:
            if isinstance(event_data["user_id"], str):
                event_data["user_id"] = ObjectId(event_data["user_id"])
        if "related_events" in event_data:
            event_data["related_events"] = [
                ObjectId(eid) if isinstance(eid, str) else eid
                for eid in event_data["related_events"]
            ]
        
        event_data["created_at"] = datetime.utcnow()
        event_data["updated_at"] = datetime.utcnow()
        
        result = await self.security_events.insert_one(event_data)
        event = await self.security_events.find_one({"_id": result.inserted_id})
        event = self._convert_objectids_to_strings(event)
        return SecurityEventSchema(**event)

    async def list_security_events(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        event_type: Optional[SecurityEventType] = None,
        risk_level: Optional[RiskLevel] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> tuple[List[SecurityEventSchema], int]:
        """List security events with optional filtering. Returns (items, total_count)."""
        query = {}
        
        if tenant_id:
            query["tenant_id"] = ObjectId(tenant_id)
        if user_id:
            query["user_id"] = ObjectId(user_id)
        if event_type:
            query["event_type"] = event_type.value
        if risk_level:
            query["risk_level"] = risk_level.value
        if start_date or end_date:
            query["created_at"] = {}
            if start_date:
                query["created_at"]["$gte"] = start_date
            if end_date:
                query["created_at"]["$lte"] = end_date
        
        # Get total count
        total = await self.security_events.count_documents(query)
        
        # Get paginated results
        cursor = self.security_events.find(query).skip(skip).limit(limit).sort("created_at", -1)
        events = await cursor.to_list(length=limit)
        
        for event in events:
            event = self._convert_objectids_to_strings(event)
        
        return ([SecurityEventSchema(**event) for event in events], total)

    async def get_security_event(self, event_id: str) -> Optional[SecurityEventSchema]:
        """Get a security event by ID."""
        event = await self.security_events.find_one({"_id": ObjectId(event_id)})
        if event:
            event = self._convert_objectids_to_strings(event)
            return SecurityEventSchema(**event)
        return None

    async def update_security_event(self, event_id: str, update_data: dict) -> Optional[SecurityEventSchema]:
        """Update a security event."""
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.security_events.update_one(
            {"_id": ObjectId(event_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            event = await self.security_events.find_one({"_id": ObjectId(event_id)})
            if event:
                event = self._convert_objectids_to_strings(event)
                return SecurityEventSchema(**event)
        return None

    # ========================================================================
    # Abuse Cases
    # ========================================================================

    async def create_abuse_case(self, case_data: dict) -> AbuseCaseSchema:
        """Create an abuse case."""
        if "tenant_id" in case_data and case_data["tenant_id"]:
            if isinstance(case_data["tenant_id"], str):
                case_data["tenant_id"] = ObjectId(case_data["tenant_id"])
        if "user_id" in case_data and case_data["user_id"]:
            if isinstance(case_data["user_id"], str):
                case_data["user_id"] = ObjectId(case_data["user_id"])
        if "related_cases" in case_data:
            case_data["related_cases"] = [
                ObjectId(cid) if isinstance(cid, str) else cid
                for cid in case_data["related_cases"]
            ]
        
        case_data["created_at"] = datetime.utcnow()
        case_data["updated_at"] = datetime.utcnow()
        
        result = await self.abuse_cases.insert_one(case_data)
        case = await self.abuse_cases.find_one({"_id": result.inserted_id})
        case = self._convert_objectids_to_strings(case)
        return AbuseCaseSchema(**case)

    async def list_abuse_cases(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        status: Optional[AbuseCaseStatus] = None,
        risk_level: Optional[RiskLevel] = None,
    ) -> List[AbuseCaseSchema]:
        """List abuse cases with optional filtering."""
        query = {}
        
        if tenant_id:
            query["tenant_id"] = ObjectId(tenant_id)
        if user_id:
            query["user_id"] = ObjectId(user_id)
        if status:
            query["status"] = status.value
        if risk_level:
            query["risk_level"] = risk_level.value
        
        cursor = self.abuse_cases.find(query).skip(skip).limit(limit).sort("created_at", -1)
        cases = await cursor.to_list(length=limit)
        
        for case in cases:
            case = self._convert_objectids_to_strings(case)
        
        return [AbuseCaseSchema(**case) for case in cases]

    async def get_abuse_case(self, case_id: str) -> Optional[AbuseCaseSchema]:
        """Get an abuse case by ID."""
        case = await self.abuse_cases.find_one({"_id": ObjectId(case_id)})
        if case:
            case = self._convert_objectids_to_strings(case)
            return AbuseCaseSchema(**case)
        return None

    async def update_abuse_case(self, case_id: str, update_data: dict) -> Optional[AbuseCaseSchema]:
        """Update an abuse case."""
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.abuse_cases.update_one(
            {"_id": ObjectId(case_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            case = await self.abuse_cases.find_one({"_id": ObjectId(case_id)})
            if case:
                case = self._convert_objectids_to_strings(case)
                return AbuseCaseSchema(**case)
        return None

    # ========================================================================
    # Fraud Cases
    # ========================================================================

    async def create_fraud_case(self, case_data: dict) -> FraudCaseSchema:
        """Create a fraud case."""
        if "tenant_id" in case_data and case_data["tenant_id"]:
            if isinstance(case_data["tenant_id"], str):
                case_data["tenant_id"] = ObjectId(case_data["tenant_id"])
        if "user_id" in case_data and case_data["user_id"]:
            if isinstance(case_data["user_id"], str):
                case_data["user_id"] = ObjectId(case_data["user_id"])
        if "related_cases" in case_data:
            case_data["related_cases"] = [
                ObjectId(cid) if isinstance(cid, str) else cid
                for cid in case_data["related_cases"]
            ]
        
        case_data["created_at"] = datetime.utcnow()
        case_data["updated_at"] = datetime.utcnow()
        
        result = await self.fraud_cases.insert_one(case_data)
        case = await self.fraud_cases.find_one({"_id": result.inserted_id})
        case = self._convert_objectids_to_strings(case)
        return FraudCaseSchema(**case)

    async def list_fraud_cases(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        status: Optional[FraudCaseStatus] = None,
        risk_level: Optional[RiskLevel] = None,
    ) -> List[FraudCaseSchema]:
        """List fraud cases with optional filtering."""
        query = {}
        
        if tenant_id:
            query["tenant_id"] = ObjectId(tenant_id)
        if user_id:
            query["user_id"] = ObjectId(user_id)
        if status:
            query["status"] = status.value
        if risk_level:
            query["risk_level"] = risk_level.value
        
        cursor = self.fraud_cases.find(query).skip(skip).limit(limit).sort("created_at", -1)
        cases = await cursor.to_list(length=limit)
        
        for case in cases:
            case = self._convert_objectids_to_strings(case)
        
        return [FraudCaseSchema(**case) for case in cases]

    async def get_fraud_case(self, case_id: str) -> Optional[FraudCaseSchema]:
        """Get a fraud case by ID."""
        case = await self.fraud_cases.find_one({"_id": ObjectId(case_id)})
        if case:
            case = self._convert_objectids_to_strings(case)
            return FraudCaseSchema(**case)
        return None

    async def update_fraud_case(self, case_id: str, update_data: dict) -> Optional[FraudCaseSchema]:
        """Update a fraud case."""
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.fraud_cases.update_one(
            {"_id": ObjectId(case_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            case = await self.fraud_cases.find_one({"_id": ObjectId(case_id)})
            if case:
                case = self._convert_objectids_to_strings(case)
                return FraudCaseSchema(**case)
        return None

    def _convert_objectids_to_strings(self, doc: dict) -> dict:
        """Convert ObjectId fields to strings for Pydantic."""
        if "_id" in doc and isinstance(doc["_id"], ObjectId):
            doc["_id"] = str(doc["_id"])
        if "tenant_id" in doc and doc["tenant_id"] and isinstance(doc["tenant_id"], ObjectId):
            doc["tenant_id"] = str(doc["tenant_id"])
        if "user_id" in doc and doc["user_id"] and isinstance(doc["user_id"], ObjectId):
            doc["user_id"] = str(doc["user_id"])
        if "related_events" in doc and doc["related_events"]:
            doc["related_events"] = [
                str(eid) if isinstance(eid, ObjectId) else eid
                for eid in doc["related_events"]
            ]
        if "related_cases" in doc and doc["related_cases"]:
            doc["related_cases"] = [
                str(cid) if isinstance(cid, ObjectId) else cid
                for cid in doc["related_cases"]
            ]
        return doc
