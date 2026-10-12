"""
Escra Indexer Service

Core service for ingesting Algorand transactions and state changes into MongoDB.
This is the primary component of the Escra Indexer subsystem.
"""

import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from bson import ObjectId
import structlog

from app.indexer.algorand_client import get_algorand_client
from app.core.database import get_db
from app.core.config import get_settings
from app.models.indexer import (
    OnChainEventSchema,
    IndexerConfigurationSchema,
    IndexerJobRunSchema,
    EventType,
    IndexerStatus,
)

settings = get_settings()
logger = structlog.get_logger()


class IndexerService:
    """Service for indexing Algorand transactions into MongoDB."""

    def __init__(self):
        """Initialize indexer service."""
        self.algorand_client = get_algorand_client()
        self.db = get_db()
        self.running = False

    async def get_configuration(self) -> Dict[str, Any]:
        """Get current indexer configuration."""
        config_collection = self.db["indexer_configurations"]
        config = await config_collection.find_one({"config_id": "default"})
        
        if config is None:
            # Create default configuration
            default_config = IndexerConfigurationSchema(
                config_id="default",
                enabled=settings.indexer_enabled,
                poll_interval_seconds=settings.indexer_poll_interval_seconds,
                batch_size=settings.indexer_batch_size,
                max_lag_blocks=settings.indexer_max_lag_blocks,
            )
            await config_collection.insert_one(default_config.model_dump(by_alias=True))
            return default_config.model_dump()
        
        return config

    async def update_configuration(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update indexer configuration."""
        config_collection = self.db["indexer_configurations"]
        updates["updated_at"] = datetime.utcnow()
        
        result = await config_collection.find_one_and_update(
            {"config_id": "default"},
            {"$set": updates},
            return_document=True,
        )
        
        if result is None:
            raise ValueError("Indexer configuration not found")
        
        logger.info("Indexer configuration updated", updates=updates)
        return result

    async def get_current_status(self) -> Dict[str, Any]:
        """Get current indexer status and health metrics."""
        config = await self.get_configuration()
        
        # Get current round from Algorand
        try:
            current_round = self.algorand_client.get_current_round()
        except Exception as e:
            logger.error("Failed to get current round", error=str(e))
            current_round = None
        
        # Get latest indexed round
        events_collection = self.db["on_chain_events"]
        latest_event = await events_collection.find_one(
            {}, sort=[("round", -1)]
        )
        latest_indexed_round = latest_event["round"] if latest_event else None
        
        # Calculate lag
        lag_blocks = 0
        if current_round is not None and latest_indexed_round is not None:
            lag_blocks = current_round - latest_indexed_round
        
        # Get recent job runs
        jobs_collection = self.db["indexer_job_runs"]
        recent_jobs = await jobs_collection.find(
            {},
            sort=[("started_at", -1)],
            limit=10,
        ).to_list(length=10)
        
        # Get error count
        error_count = await jobs_collection.count_documents({"status": "failed"})
        
        return {
            "config": config,
            "current_round": current_round,
            "latest_indexed_round": latest_indexed_round,
            "lag_blocks": lag_blocks,
            "is_healthy": lag_blocks <= config.get("max_lag_blocks", 100),
            "recent_jobs": recent_jobs,
            "error_count": error_count,
            "running": self.running,
        }

    async def index_transactions(
        self,
        min_round: Optional[int] = None,
        max_round: Optional[int] = None,
        app_ids: Optional[List[int]] = None,
    ) -> Dict[str, Any]:
        """
        Index transactions from Algorand into MongoDB.
        
        Args:
            min_round: Starting round (if None, starts from last indexed round)
            max_round: Ending round (if None, uses current round)
            app_ids: List of app IDs to filter (if None, indexes all)
        
        Returns:
            Dictionary with indexing results
        """
        job_id = f"index_{datetime.utcnow().isoformat()}"
        
        # Create job run record
        job_collection = self.db["indexer_job_runs"]
        job_run = IndexerJobRunSchema(
            job_id=job_id,
            job_type="poll" if min_round is None else "backfill",
            status="running",
            start_round=min_round,
        )
        await job_collection.insert_one(job_run.model_dump(by_alias=True))
        
        events_processed = 0
        events_indexed = 0
        errors_count = 0
        start_round = min_round
        end_round = max_round
        
        try:
            # Get configuration
            config = await self.get_configuration()
            
            # Determine start round
            if start_round is None:
                events_collection = self.db["on_chain_events"]
                latest_event = await events_collection.find_one({}, sort=[("round", -1)])
                if latest_event:
                    start_round = latest_event["round"] + 1
                else:
                    # Start from a recent round (e.g., 1000 blocks ago)
                    current_round = self.algorand_client.get_current_round()
                    start_round = max(0, current_round - 1000)
            
            # Determine end round
            if end_round is None:
                end_round = self.algorand_client.get_current_round()
            
            logger.info(
                "Starting transaction indexing",
                job_id=job_id,
                start_round=start_round,
                end_round=end_round,
            )
            
            # Search and index transactions
            next_token = None
            round_range_size = config.get("batch_size", 100)
            
            current_min = start_round
            
            while current_min <= end_round:
                current_max = min(current_min + round_range_size - 1, end_round)
                
                try:
                    # Search transactions in this round range
                    if app_ids:
                        # Index each app separately
                        for app_id in app_ids:
                            response = self.algorand_client.search_transactions(
                                min_round=current_min,
                                max_round=current_max,
                                app_id=app_id,
                                limit=config.get("batch_size", 100),
                            )
                            events_processed += len(response.get("transactions", []))
                            
                            # Index each transaction
                            for tx in response.get("transactions", []):
                                try:
                                    await self._index_transaction(tx, app_id)
                                    events_indexed += 1
                                except Exception as e:
                                    logger.error(
                                        "Failed to index transaction",
                                        tx_id=tx.get("id"),
                                        error=str(e),
                                    )
                                    errors_count += 1
                    else:
                        # Index all transactions
                        response = self.algorand_client.search_transactions(
                            min_round=current_min,
                            max_round=current_max,
                            limit=config.get("batch_size", 100),
                        )
                        events_processed += len(response.get("transactions", []))
                        
                        # Index each transaction
                        for tx in response.get("transactions", []):
                            try:
                                await self._index_transaction(tx)
                                events_indexed += 1
                            except Exception as e:
                                logger.error(
                                    "Failed to index transaction",
                                    tx_id=tx.get("id"),
                                    error=str(e),
                                )
                                errors_count += 1
                    
                    current_min = current_max + 1
                except Exception as e:
                    logger.error(
                        "Failed to index round range",
                        min_round=current_min,
                        max_round=current_max,
                        error=str(e),
                    )
                    errors_count += 1
                    current_min = current_max + 1
            
            # Update job run
            await job_collection.update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "status": "completed",
                        "completed_at": datetime.utcnow(),
                        "events_processed": events_processed,
                        "events_indexed": events_indexed,
                        "errors_count": errors_count,
                        "end_round": end_round,
                        "rounds_processed": end_round - start_round + 1,
                    }
                },
            )
            
            logger.info(
                "Transaction indexing completed",
                job_id=job_id,
                events_indexed=events_indexed,
                errors_count=errors_count,
            )
            
            return {
                "job_id": job_id,
                "status": "completed",
                "events_processed": events_processed,
                "events_indexed": events_indexed,
                "errors_count": errors_count,
                "start_round": start_round,
                "end_round": end_round,
            }
            
        except Exception as e:
            logger.error("Transaction indexing failed", job_id=job_id, error=str(e))
            
            # Update job run with error
            await job_collection.update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "status": "failed",
                        "completed_at": datetime.utcnow(),
                        "error_message": str(e),
                        "events_processed": events_processed,
                        "events_indexed": events_indexed,
                        "errors_count": errors_count,
                    }
                },
            )
            
            raise

    async def _index_transaction(self, tx: Dict[str, Any], app_id: Optional[int] = None) -> None:
        """
        Index a single transaction into MongoDB.
        
        Args:
            tx: Transaction data from Algorand indexer
            app_id: Optional application ID (if known)
        """
        events_collection = self.db["on_chain_events"]
        
        # Extract transaction details
        tx_id = tx.get("id")
        block = tx.get("confirmed-round", 0)
        round_num = tx.get("round-time", 0)
        timestamp = datetime.fromtimestamp(tx.get("round-time", 0))
        
        # Determine event type
        event_type = EventType.TRANSACTION
        if tx.get("tx-type") == "appl":
            event_type = EventType.APPLICATION_CALL
            if app_id is None:
                app_id = tx.get("application-transaction", {}).get("application-id")
        elif tx.get("tx-type") == "axfer":
            event_type = EventType.ASSET_TRANSFER
        
        # Create event document
        event = OnChainEventSchema(
            tx_id=tx_id,
            block=block,
            round=block,  # Using confirmed-round as round
            timestamp=timestamp,
            event_type=event_type,
            app_id=app_id,
            sender=tx.get("sender"),
            raw_tx_data=tx,
        )
        
        # Insert or update (upsert)
        await events_collection.update_one(
            {"tx_id": tx_id},
            {"$set": event.model_dump(by_alias=True, exclude={"id"})},
            upsert=True,
        )

    async def start_polling(self) -> None:
        """Start continuous polling of Algorand transactions."""
        if self.running:
            logger.warning("Indexer is already running")
            return
        
        self.running = True
        logger.info("Starting indexer polling")
        
        config = await self.get_configuration()
        poll_interval = config.get("poll_interval_seconds", 5)
        
        try:
            while self.running:
                config = await self.get_configuration()
                
                if not config.get("enabled", True):
                    logger.info("Indexer is disabled, pausing")
                    await asyncio.sleep(poll_interval)
                    continue
                
                try:
                    await self.index_transactions()
                except Exception as e:
                    logger.error("Error during polling", error=str(e))
                
                await asyncio.sleep(poll_interval)
        finally:
            self.running = False
            logger.info("Indexer polling stopped")

    async def stop_polling(self) -> None:
        """Stop continuous polling."""
        self.running = False
        logger.info("Stopping indexer polling")


# Global service instance
_indexer_service: Optional[IndexerService] = None


def get_indexer_service() -> IndexerService:
    """Get or create indexer service instance."""
    global _indexer_service
    if _indexer_service is None:
        _indexer_service = IndexerService()
    return _indexer_service

