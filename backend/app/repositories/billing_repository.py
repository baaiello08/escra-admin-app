"""
Billing Repository

MongoDB data access layer for billing and usage operations.
"""

from typing import Optional, List
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import structlog

from app.models.billing import (
    BillingConfigSchema,
    UsageMetricSchema,
    BillingEventSchema,
    PlanTierSchema,
    PlanTier,
    BillingCycle,
    PaymentStatus,
    UsageMetricType,
)
from app.core.database import get_db

logger = structlog.get_logger()


class BillingRepository:
    """Repository for billing data access."""

    def __init__(self, db: Optional[AsyncIOMotorDatabase] = None):
        """Initialize repository with database connection."""
        self.db = db or get_db()
        self.billing_configs = self.db[BillingConfigSchema.Config.collection_name]
        self.usage_metrics = self.db[UsageMetricSchema.Config.collection_name]
        self.billing_events = self.db[BillingEventSchema.Config.collection_name]
        self.plan_tiers = self.db[PlanTierSchema.Config.collection_name]

    # ========================================================================
    # Billing Configs
    # ========================================================================

    async def get_billing_config(self, tenant_id: str) -> Optional[BillingConfigSchema]:
        """Get billing configuration for a tenant."""
        try:
            config = await self.billing_configs.find_one({"tenant_id": ObjectId(tenant_id)})
            if config:
                config = self._convert_objectids_to_strings(config)
                return BillingConfigSchema(**config)
        except Exception as e:
            logger.warning("Error fetching billing config", tenant_id=tenant_id, error=str(e))
        return None

    async def create_or_update_billing_config(self, config_data: dict) -> BillingConfigSchema:
        """Create or update billing configuration."""
        if "tenant_id" in config_data and isinstance(config_data["tenant_id"], str):
            config_data["tenant_id"] = ObjectId(config_data["tenant_id"])
        
        config_data["updated_at"] = datetime.utcnow()
        if "created_at" not in config_data:
            config_data["created_at"] = datetime.utcnow()
        
        result = await self.billing_configs.update_one(
            {"tenant_id": config_data["tenant_id"]},
            {"$set": config_data},
            upsert=True
        )
        
        # Fetch the updated/created config
        config = await self.billing_configs.find_one({"tenant_id": config_data["tenant_id"]})
        config = self._convert_objectids_to_strings(config)
        return BillingConfigSchema(**config)

    # ========================================================================
    # Usage Metrics
    # ========================================================================

    async def create_usage_metric(self, metric_data: dict) -> UsageMetricSchema:
        """Create a usage metric record."""
        if "tenant_id" in metric_data and isinstance(metric_data["tenant_id"], str):
            metric_data["tenant_id"] = ObjectId(metric_data["tenant_id"])
        
        metric_data["created_at"] = datetime.utcnow()
        metric_data["updated_at"] = datetime.utcnow()
        
        result = await self.usage_metrics.insert_one(metric_data)
        metric = await self.usage_metrics.find_one({"_id": result.inserted_id})
        metric = self._convert_objectids_to_strings(metric)
        return UsageMetricSchema(**metric)

    async def list_usage_metrics(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        metric_type: Optional[UsageMetricType] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[UsageMetricSchema]:
        """List usage metrics with optional filtering."""
        query = {}
        
        if tenant_id:
            query["tenant_id"] = ObjectId(tenant_id)
        if metric_type:
            query["metric_type"] = metric_type.value
        if start_date or end_date:
            query["period_start"] = {}
            if start_date:
                query["period_start"]["$gte"] = start_date
            if end_date:
                query["period_start"]["$lte"] = end_date
        
        cursor = self.usage_metrics.find(query).skip(skip).limit(limit).sort("period_start", -1)
        metrics = await cursor.to_list(length=limit)
        
        for metric in metrics:
            metric = self._convert_objectids_to_strings(metric)
        
        return [UsageMetricSchema(**metric) for metric in metrics]

    # ========================================================================
    # Billing Events
    # ========================================================================

    async def create_billing_event(self, event_data: dict) -> BillingEventSchema:
        """Create a billing event."""
        if "tenant_id" in event_data and isinstance(event_data["tenant_id"], str):
            event_data["tenant_id"] = ObjectId(event_data["tenant_id"])
        
        event_data["created_at"] = datetime.utcnow()
        event_data["updated_at"] = datetime.utcnow()
        
        result = await self.billing_events.insert_one(event_data)
        event = await self.billing_events.find_one({"_id": result.inserted_id})
        event = self._convert_objectids_to_strings(event)
        return BillingEventSchema(**event)

    async def list_billing_events(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[str] = None,
        event_type: Optional[str] = None,
        status: Optional[PaymentStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[BillingEventSchema]:
        """List billing events with optional filtering."""
        query = {}
        
        if tenant_id:
            query["tenant_id"] = ObjectId(tenant_id)
        if event_type:
            query["event_type"] = event_type
        if status:
            query["status"] = status.value
        if start_date or end_date:
            query["created_at"] = {}
            if start_date:
                query["created_at"]["$gte"] = start_date
            if end_date:
                query["created_at"]["$lte"] = end_date
        
        cursor = self.billing_events.find(query).skip(skip).limit(limit).sort("created_at", -1)
        events = await cursor.to_list(length=limit)
        
        for event in events:
            event = self._convert_objectids_to_strings(event)
        
        return [BillingEventSchema(**event) for event in events]

    # ========================================================================
    # Plan Tiers
    # ========================================================================

    async def list_plan_tiers(self) -> List[PlanTierSchema]:
        """List all plan tiers."""
        cursor = self.plan_tiers.find().sort("monthly_price", 1)
        tiers = await cursor.to_list(length=100)
        
        for tier in tiers:
            tier = self._convert_objectids_to_strings(tier)
        
        return [PlanTierSchema(**tier) for tier in tiers]

    async def get_plan_tier(self, plan_name: PlanTier) -> Optional[PlanTierSchema]:
        """Get a specific plan tier."""
        tier = await self.plan_tiers.find_one({"name": plan_name.value})
        if tier:
            tier = self._convert_objectids_to_strings(tier)
            return PlanTierSchema(**tier)
        return None

    def _convert_objectids_to_strings(self, doc: dict) -> dict:
        """Convert ObjectId fields to strings for Pydantic."""
        if "_id" in doc and isinstance(doc["_id"], ObjectId):
            doc["_id"] = str(doc["_id"])
        if "tenant_id" in doc and isinstance(doc["tenant_id"], ObjectId):
            doc["tenant_id"] = str(doc["tenant_id"])
        return doc
