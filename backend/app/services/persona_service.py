"""
Persona Service

Service for interacting with Persona API for identity verification management.
"""

from typing import Optional, Dict, Any
from datetime import datetime
import httpx
import structlog

from app.core.config import get_settings

settings = get_settings()
logger = structlog.get_logger()


class PersonaService:
    """Service for Persona identity verification operations."""

    def __init__(self):
        """Initialize Persona service with API credentials."""
        self.api_key = settings.persona_api_key
        self.base_url = settings.persona_base_url
        self.webhook_secret = settings.persona_webhook_secret
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Key": self.api_key,
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    async def create_inquiry(
        self,
        template_id: Optional[str] = None,
        reference_id: Optional[str] = None,
        fields: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create a new Persona inquiry/investigation.
        
        Args:
            template_id: Persona template ID to use
            reference_id: Reference ID to associate with inquiry
            fields: Additional fields for the inquiry
        
        Returns:
            Persona inquiry response
        """
        payload = {}
        if template_id:
            payload["template_id"] = template_id
        if reference_id:
            payload["reference_id"] = reference_id
        if fields:
            payload["fields"] = fields
        
        try:
            response = await self.client.post("/inquiries", json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(
                "Persona API error",
                status_code=e.response.status_code,
                error=e.response.text,
            )
            raise
        except Exception as e:
            logger.error("Failed to create Persona inquiry", error=str(e))
            raise

    async def get_inquiry(self, inquiry_id: str) -> Dict[str, Any]:
        """Get inquiry details from Persona."""
        try:
            response = await self.client.get(f"/inquiries/{inquiry_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(
                "Persona API error",
                inquiry_id=inquiry_id,
                status_code=e.response.status_code,
                error=e.response.text,
            )
            raise
        except Exception as e:
            logger.error("Failed to get Persona inquiry", inquiry_id=inquiry_id, error=str(e))
            raise

    async def list_inquiries(
        self,
        limit: int = 20,
        offset: int = 0,
        filter_status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """List inquiries from Persona."""
        params = {"page[size]": limit, "page[number]": offset // limit + 1}
        if filter_status:
            params["filter[status]"] = filter_status
        
        try:
            response = await self.client.get("/inquiries", params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(
                "Persona API error",
                status_code=e.response.status_code,
                error=e.response.text,
            )
            raise
        except Exception as e:
            logger.error("Failed to list Persona inquiries", error=str(e))
            raise

    async def verify_webhook_signature(self, payload: bytes, signature: str) -> bool:
        """
        Verify Persona webhook signature.
        
        Args:
            payload: Raw webhook payload bytes
            signature: Webhook signature header value
        
        Returns:
            True if signature is valid
        """
        # TODO: Implement Persona webhook signature verification
        # Persona uses HMAC-SHA256 with the webhook secret
        import hmac
        import hashlib
        
        expected_signature = hmac.new(
            self.webhook_secret.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)

    async def process_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a Persona webhook event.
        
        Args:
            payload: Parsed webhook payload
        
        Returns:
            Processing result
        """
        event_type = payload.get("data", {}).get("type")
        inquiry_id = payload.get("data", {}).get("id")
        
        logger.info(
            "Processing Persona webhook",
            event_type=event_type,
            inquiry_id=inquiry_id,
        )
        
        # TODO: Update user verification status in database
        # TODO: Create/update PersonaInquiry document
        # TODO: Emit audit events
        
        return {"processed": True, "event_type": event_type, "inquiry_id": inquiry_id}

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()


# Global service instance
_persona_service: Optional[PersonaService] = None


def get_persona_service() -> PersonaService:
    """Get or create Persona service instance."""
    global _persona_service
    if _persona_service is None:
        _persona_service = PersonaService()
    return _persona_service

