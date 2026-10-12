"""
Support Repository

MongoDB data access layer for support cases, impersonation sessions, and announcements.
"""

from typing import Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import structlog

from app.models.support import (
    SupportCaseSchema,
    ImpersonationSessionSchema,
    AnnouncementSchema,
    SupportCaseStatus,
    SupportCasePriority,
    ImpersonationStatus,
    AnnouncementType,
)
from app.core.database import get_db

logger = structlog.get_logger()


class SupportRepository:
    """Repository for support data access."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_db()
        self.support_cases = self.db[SupportCaseSchema.Config.collection_name]
        self.impersonation_sessions = self.db[ImpersonationSessionSchema.Config.collection_name]
        self.announcements = self.db[AnnouncementSchema.Config.collection_name]

    # ========================================================================
    # Support Cases
    # ========================================================================

    async def create_support_case(self, case_data: dict) -> SupportCaseSchema:
        """Create a support case."""
        if "tenant_id" in case_data and case_data["tenant_id"]:
            if isinstance(case_data["tenant_id"], str):
                case_data["tenant_id"] = ObjectId(case_data["tenant_id"])
        if "user_id" in case_data and case_data["user_id"]:
            if isinstance(case_data["user_id"], str):
                case_data["user_id"] = ObjectId(case_data["user_id"])
        
        case_data["created_at"] = datetime.utcnow()
        case_data["updated_at"] = datetime.utcnow()
        
        result = await self.support_cases.insert_one(case_data)
        case = await self.support_cases.find_one({"_id": result.inserted_id})
        case = self._convert_objectids_to_strings(case)
        return SupportCaseSchema(**case)

    async def list_support_cases(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        status: Optional[SupportCaseStatus] = None,
        priority: Optional[SupportCasePriority] = None,
        assigned_to: Optional[str] = None,
    ) -> tuple[List[SupportCaseSchema], int]:
        """List support cases with optional filtering. Returns (items, total_count)."""
        query = {}
        
        if tenant_id:
            query["tenant_id"] = ObjectId(tenant_id)
        if user_id:
            query["user_id"] = ObjectId(user_id)
        if status:
            query["status"] = status.value
        if priority:
            query["priority"] = priority.value
        if assigned_to:
            query["assigned_to"] = assigned_to
        
        # Get total count
        total = await self.support_cases.count_documents(query)
        
        # Get paginated results
        cursor = self.support_cases.find(query).skip(skip).limit(limit).sort("created_at", -1)
        cases = await cursor.to_list(length=limit)
        
        for case in cases:
            case = self._convert_objectids_to_strings(case)
        
        return ([SupportCaseSchema(**case) for case in cases], total)

    async def get_support_case(self, case_id: str) -> Optional[SupportCaseSchema]:
        """Get a support case by ID."""
        case = await self.support_cases.find_one({"_id": ObjectId(case_id)})
        if case:
            case = self._convert_objectids_to_strings(case)
            return SupportCaseSchema(**case)
        return None

    async def update_support_case(self, case_id: str, update_data: dict) -> Optional[SupportCaseSchema]:
        """Update a support case."""
        # Convert IDs if present
        if "tenant_id" in update_data and update_data["tenant_id"]:
            if isinstance(update_data["tenant_id"], str):
                update_data["tenant_id"] = ObjectId(update_data["tenant_id"])
        if "user_id" in update_data and update_data["user_id"]:
            if isinstance(update_data["user_id"], str):
                update_data["user_id"] = ObjectId(update_data["user_id"])
        
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.support_cases.update_one(
            {"_id": ObjectId(case_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            case = await self.support_cases.find_one({"_id": ObjectId(case_id)})
            if case:
                case = self._convert_objectids_to_strings(case)
                return SupportCaseSchema(**case)
        return None

    # ========================================================================
    # Impersonation Sessions
    # ========================================================================

    async def create_impersonation_session(self, session_data: dict) -> ImpersonationSessionSchema:
        """Create an impersonation session."""
        if "admin_user_id" in session_data and isinstance(session_data["admin_user_id"], str):
            session_data["admin_user_id"] = ObjectId(session_data["admin_user_id"])
        if "target_user_id" in session_data and isinstance(session_data["target_user_id"], str):
            session_data["target_user_id"] = ObjectId(session_data["target_user_id"])
        if "tenant_id" in session_data and session_data["tenant_id"]:
            if isinstance(session_data["tenant_id"], str):
                session_data["tenant_id"] = ObjectId(session_data["tenant_id"])
        
        session_data["created_at"] = datetime.utcnow()
        session_data["updated_at"] = datetime.utcnow()
        if "started_at" not in session_data:
            session_data["started_at"] = datetime.utcnow()
        
        result = await self.impersonation_sessions.insert_one(session_data)
        session = await self.impersonation_sessions.find_one({"_id": result.inserted_id})
        session = self._convert_objectids_to_strings(session)
        return ImpersonationSessionSchema(**session)

    async def list_impersonation_sessions(
        self,
        skip: int = 0,
        limit: int = 100,
        admin_user_id: Optional[str] = None,
        target_user_id: Optional[str] = None,
        status: Optional[ImpersonationStatus] = None,
    ) -> List[ImpersonationSessionSchema]:
        """List impersonation sessions with optional filtering."""
        query = {}
        
        if admin_user_id:
            query["admin_user_id"] = ObjectId(admin_user_id)
        if target_user_id:
            query["target_user_id"] = ObjectId(target_user_id)
        if status:
            query["status"] = status.value
        
        cursor = self.impersonation_sessions.find(query).skip(skip).limit(limit).sort("started_at", -1)
        sessions = await cursor.to_list(length=limit)
        
        for session in sessions:
            session = self._convert_objectids_to_strings(session)
        
        return [ImpersonationSessionSchema(**session) for session in sessions]

    async def get_impersonation_session(self, session_id: str) -> Optional[ImpersonationSessionSchema]:
        """Get an impersonation session by ID."""
        session = await self.impersonation_sessions.find_one({"_id": ObjectId(session_id)})
        if session:
            session = self._convert_objectids_to_strings(session)
            return ImpersonationSessionSchema(**session)
        return None

    async def update_impersonation_session(self, session_id: str, update_data: dict) -> Optional[ImpersonationSessionSchema]:
        """Update an impersonation session."""
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.impersonation_sessions.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            session = await self.impersonation_sessions.find_one({"_id": ObjectId(session_id)})
            if session:
                session = self._convert_objectids_to_strings(session)
                return ImpersonationSessionSchema(**session)
        return None

    # ========================================================================
    # Announcements
    # ========================================================================

    async def create_announcement(self, announcement_data: dict) -> AnnouncementSchema:
        """Create an announcement."""
        if "tenant_id" in announcement_data and announcement_data["tenant_id"]:
            if isinstance(announcement_data["tenant_id"], str):
                announcement_data["tenant_id"] = ObjectId(announcement_data["tenant_id"])
        if "user_id" in announcement_data and announcement_data["user_id"]:
            if isinstance(announcement_data["user_id"], str):
                announcement_data["user_id"] = ObjectId(announcement_data["user_id"])
        
        announcement_data["created_at"] = datetime.utcnow()
        announcement_data["updated_at"] = datetime.utcnow()
        
        result = await self.announcements.insert_one(announcement_data)
        announcement = await self.announcements.find_one({"_id": result.inserted_id})
        announcement = self._convert_objectids_to_strings(announcement)
        return AnnouncementSchema(**announcement)

    async def list_announcements(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        is_active: Optional[bool] = None,
        announcement_type: Optional[AnnouncementType] = None,
    ) -> List[AnnouncementSchema]:
        """List announcements with optional filtering."""
        query = {}
        
        if tenant_id:
            query["tenant_id"] = ObjectId(tenant_id)
        if is_active is not None:
            query["is_active"] = is_active
        if announcement_type:
            query["type"] = announcement_type.value
        
        cursor = self.announcements.find(query).skip(skip).limit(limit).sort("priority", -1).sort("created_at", -1)
        announcements = await cursor.to_list(length=limit)
        
        for announcement in announcements:
            announcement = self._convert_objectids_to_strings(announcement)
        
        return [AnnouncementSchema(**announcement) for announcement in announcements]

    async def get_announcement(self, announcement_id: str) -> Optional[AnnouncementSchema]:
        """Get an announcement by ID."""
        announcement = await self.announcements.find_one({"_id": ObjectId(announcement_id)})
        if announcement:
            announcement = self._convert_objectids_to_strings(announcement)
            return AnnouncementSchema(**announcement)
        return None

    async def update_announcement(self, announcement_id: str, update_data: dict) -> Optional[AnnouncementSchema]:
        """Update an announcement."""
        update_data["updated_at"] = datetime.utcnow()
        
        result = await self.announcements.update_one(
            {"_id": ObjectId(announcement_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            announcement = await self.announcements.find_one({"_id": ObjectId(announcement_id)})
            if announcement:
                announcement = self._convert_objectids_to_strings(announcement)
                return AnnouncementSchema(**announcement)
        return None

    def _convert_objectids_to_strings(self, doc: dict) -> dict:
        """Convert ObjectId fields to strings for Pydantic."""
        if "_id" in doc and isinstance(doc["_id"], ObjectId):
            doc["_id"] = str(doc["_id"])
        if "tenant_id" in doc and doc["tenant_id"] and isinstance(doc["tenant_id"], ObjectId):
            doc["tenant_id"] = str(doc["tenant_id"])
        if "user_id" in doc and doc["user_id"] and isinstance(doc["user_id"], ObjectId):
            doc["user_id"] = str(doc["user_id"])
        if "admin_user_id" in doc and isinstance(doc["admin_user_id"], ObjectId):
            doc["admin_user_id"] = str(doc["admin_user_id"])
        if "target_user_id" in doc and isinstance(doc["target_user_id"], ObjectId):
            doc["target_user_id"] = str(doc["target_user_id"])
        return doc
