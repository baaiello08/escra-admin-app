"""
Algorand Client

Wrapper around py-algorand-sdk for interacting with Algorand network and indexer.
"""

from typing import Optional, List, Dict, Any
import httpx
from algosdk.v2client import indexer, algod
from algosdk import constants
import structlog

from app.core.config import get_settings

settings = get_settings()
logger = structlog.get_logger()


class AlgorandClient:
    """Client for interacting with Algorand network and indexer."""

    def __init__(self):
        """Initialize Algorand clients."""
        self.indexer_client = indexer.IndexerClient(
            indexer_token="",
            indexer_address=settings.algorand_indexer_url,
        )
        self.algod_client = algod.AlgodClient(
            algod_token="",
            algod_address=settings.algorand_node_url,
        )
        logger.info(
            "Algorand client initialized",
            network=settings.algorand_network,
            indexer_url=settings.algorand_indexer_url,
        )

    def get_current_round(self) -> int:
        """Get the current round number from the network."""
        try:
            status = self.algod_client.status()
            return status.get("last-round", 0)
        except Exception as e:
            logger.error("Failed to get current round", error=str(e))
            raise

    def get_block(self, round: int) -> Dict[str, Any]:
        """Get block data for a specific round."""
        try:
            block = self.algod_client.block_info(round)
            return block
        except Exception as e:
            logger.error("Failed to get block", round=round, error=str(e))
            raise

    def search_transactions(
        self,
        min_round: Optional[int] = None,
        max_round: Optional[int] = None,
        app_id: Optional[int] = None,
        asset_id: Optional[int] = None,
        address: Optional[str] = None,
        limit: int = 1000,
        next_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Search for transactions using the indexer API.
        
        Args:
            min_round: Minimum round to search from
            max_round: Maximum round to search to
            app_id: Filter by application ID
            asset_id: Filter by asset ID
            address: Filter by address
            limit: Maximum number of results
            next_token: Pagination token
        
        Returns:
            Dictionary with transactions and pagination info
        """
        try:
            params = {
                "limit": limit,
            }
            
            if min_round is not None:
                params["min-round"] = min_round
            if max_round is not None:
                params["max-round"] = max_round
            if app_id is not None:
                params["application-id"] = app_id
            if asset_id is not None:
                params["asset-id"] = asset_id
            if address is not None:
                params["address"] = address
            if next_token is not None:
                params["next"] = next_token
            
            response = self.indexer_client.search_transactions(**params)
            return response
        except Exception as e:
            logger.error(
                "Failed to search transactions",
                min_round=min_round,
                max_round=max_round,
                app_id=app_id,
                error=str(e),
            )
            raise

    def get_application_info(self, app_id: int) -> Dict[str, Any]:
        """Get application information."""
        try:
            app_info = self.indexer_client.application_info(app_id)
            return app_info
        except Exception as e:
            logger.error("Failed to get application info", app_id=app_id, error=str(e))
            raise

    def get_transaction(self, tx_id: str) -> Dict[str, Any]:
        """Get transaction details by transaction ID."""
        try:
            tx = self.indexer_client.transaction(tx_id)
            return tx
        except Exception as e:
            logger.error("Failed to get transaction", tx_id=tx_id, error=str(e))
            raise


# Global client instance
_algorand_client: Optional[AlgorandClient] = None


def get_algorand_client() -> AlgorandClient:
    """Get or create Algorand client instance."""
    global _algorand_client
    if _algorand_client is None:
        _algorand_client = AlgorandClient()
    return _algorand_client

