"""Health check endpoints"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def health_check():
    """API health check."""
    return {"status": "healthy", "service": "escra-admin-api", "version": "v1"}

