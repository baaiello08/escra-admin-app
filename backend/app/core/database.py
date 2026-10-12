"""
Database Connection Management

MongoDB connection pool management with async Motor driver and sync PyMongo for operations.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import MongoClient
from typing import Optional
import structlog

from app.core.config import get_settings

settings = get_settings()
logger = structlog.get_logger()

# Global database connection instances
_async_client: Optional[AsyncIOMotorClient] = None
_async_db: Optional[AsyncIOMotorDatabase] = None
_sync_client: Optional[MongoClient] = None


async def init_db() -> None:
    """Initialize MongoDB async connection pool."""
    global _async_client, _async_db
    
    if _async_client is None:
        _async_client = AsyncIOMotorClient(
            settings.mongodb_url,
            maxPoolSize=50,
            minPoolSize=10,
        )
        _async_db = _async_client[settings.mongodb_db_name]
        
        # Test connection
        try:
            await _async_client.admin.command("ping")
            logger.info("MongoDB connection established", database=settings.mongodb_db_name)
        except Exception as e:
            logger.error("Failed to connect to MongoDB", error=str(e))
            raise


async def close_db() -> None:
    """Close MongoDB connections."""
    global _async_client, _sync_client
    
    if _async_client:
        _async_client.close()
        logger.info("MongoDB async connection closed")
    
    if _sync_client:
        _sync_client.close()
        logger.info("MongoDB sync connection closed")


def get_db() -> AsyncIOMotorDatabase:
    """
    Get MongoDB database instance (async).
    Raises RuntimeError if database not initialized.
    """
    if _async_db is None:
        raise RuntimeError("Database not initialized. Call init_db() first.")
    return _async_db


def get_sync_client() -> MongoClient:
    """
    Get MongoDB sync client for operations that require it.
    Creates connection if not exists.
    """
    global _sync_client
    
    if _sync_client is None:
        _sync_client = MongoClient(
            settings.mongodb_url,
            maxPoolSize=50,
            minPoolSize=10,
        )
    
    return _sync_client


async def check_db_connection() -> bool:
    """Check if database connection is healthy."""
    try:
        if _async_client is None:
            return False
        await _async_client.admin.command("ping")
        return True
    except Exception:
        return False

