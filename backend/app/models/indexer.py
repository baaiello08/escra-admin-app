"""
Escra Indexer Domain Models

MongoDB collections and Pydantic schemas for the Escra Indexer subsystem.
The indexer ingests Algorand transactions and state changes into MongoDB for the consumer app.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import Field
from app.models.base import BaseSchema, PyObjectId


class EventType(str, Enum):
    """Types of on-chain events indexed."""

    TRANSACTION = "transaction"
    APPLICATION_CALL = "application_call"
    ASSET_TRANSFER = "asset_transfer"
    STATE_TRANSITION = "state_transition"
    SIGNATURE_EVENT = "signature_event"
    CONTRACT_EXECUTION = "contract_execution"
    RECONCILIATION = "reconciliation"


class IndexerStatus(str, Enum):
    """Indexer job/process status."""

    RUNNING = "running"
    IDLE = "idle"
    ERROR = "error"
    PAUSED = "paused"
    BACKFILLING = "backfilling"


class OnChainEventSchema(BaseSchema):
    """
    On-chain event document - indexed Algorand transactions and state changes.
    This is the primary collection that the consumer app reads from.
    """

    # Algorand transaction/event identifiers
    tx_id: str = Field(..., description="Algorand transaction ID")
    block: int = Field(..., description="Block number")
    round: int = Field(..., description="Round number")
    timestamp: datetime = Field(..., description="Block timestamp")
    
    # Event classification
    event_type: EventType = Field(..., description="Type of event")
    
    # Application context (if applicable)
    app_id: Optional[int] = Field(None, description="Algorand Application ID")
    asset_id: Optional[int] = Field(None, description="Asset ID (for asset transfers)")
    
    # Transaction details
    sender: Optional[str] = Field(None, description="Transaction sender address")
    receiver: Optional[str] = Field(None, description="Transaction receiver address")
    amount: Optional[int] = Field(None, description="Transaction amount (microAlgos or asset units)")
    
    # Escra-specific context
    tenant_id: Optional[str] = Field(None, description="Escra tenant ID (escra_public_org_id if identifiable)")
    contract_id: Optional[str] = Field(None, description="Escra contract identifier (escra_public_contract_id)")
    document_id: Optional[str] = Field(None, description="Escra document identifier (escra_public_document_id)")
    workflow_id: Optional[str] = Field(None, description="Escra workflow identifier")
    
    # Raw transaction data
    raw_tx_data: Dict[str, Any] = Field(default_factory=dict, description="Raw Algorand transaction JSON")
    
    # Indexing metadata
    indexed_at: datetime = Field(default_factory=datetime.utcnow, description="When this event was indexed")
    indexer_version: str = Field(default="0.1.0", description="Indexer version that processed this event")

    class Config:
        collection_name = "on_chain_events"
        indexes = [
            [("tx_id", 1)],  # Unique transaction ID
            [("block", -1)],  # Descending for latest blocks
            [("round", -1)],
            [("app_id", 1), ("block", -1)],  # App-specific queries
            [("tenant_id", 1), ("block", -1)],  # Tenant-scoped queries
            [("event_type", 1), ("block", -1)],
            [("contract_id", 1)],
            [("timestamp", -1)],
        ]


class ContractExecutionTraceSchema(BaseSchema):
    """
    Contract execution trace - detailed execution logs for Escra contracts.
    Links contract executions to on-chain events.
    """

    contract_id: str = Field(..., description="Escra contract identifier")
    execution_id: str = Field(..., description="Unique execution identifier")
    tenant_id: PyObjectId = Field(..., description="Tenant ID")
    
    # On-chain linkage
    tx_id: str = Field(..., description="Algorand transaction ID")
    app_id: int = Field(..., description="Algorand Application ID")
    block: int = Field(..., description="Block number")
    
    # Execution details
    action: str = Field(..., description="Contract action (create, sign, execute, cancel, etc.)")
    executed_by: Optional[str] = Field(None, description="User/address who executed the action")
    execution_timestamp: datetime = Field(..., description="Execution timestamp")
    
    # State changes
    state_before: Dict[str, Any] = Field(default_factory=dict, description="Contract state before execution")
    state_after: Dict[str, Any] = Field(default_factory=dict, description="Contract state after execution")
    
    # Execution results
    success: bool = Field(default=True, description="Whether execution was successful")
    error_message: Optional[str] = Field(None, description="Error message if execution failed")
    
    # Trace data
    trace_data: Dict[str, Any] = Field(default_factory=dict, description="Additional trace/debug data")

    class Config:
        collection_name = "contract_execution_traces"
        indexes = [
            [("execution_id", 1)],
            [("contract_id", 1), ("execution_timestamp", -1)],
            [("tenant_id", 1), ("execution_timestamp", -1)],
            [("tx_id", 1)],
            [("app_id", 1)],
        ]


class SignatureEventSchema(BaseSchema):
    """
    Signature events - cryptographic signatures on documents/contracts.
    Links signature actions to on-chain events.
    """

    signature_id: str = Field(..., description="Unique signature identifier")
    contract_id: str = Field(..., description="Escra contract identifier")
    document_id: Optional[str] = Field(None, description="Document identifier")
    tenant_id: PyObjectId = Field(..., description="Tenant ID")
    
    # Signer information
    signer_address: str = Field(..., description="Algorand address of signer")
    signer_user_id: Optional[PyObjectId] = Field(None, description="Escra user ID of signer")
    
    # On-chain linkage
    tx_id: str = Field(..., description="Algorand transaction ID")
    block: int = Field(..., description="Block number")
    timestamp: datetime = Field(..., description="Signature timestamp")
    
    # Signature details
    signature_data: Dict[str, Any] = Field(default_factory=dict, description="Cryptographic signature data")
    signature_method: str = Field(..., description="Signature method (ed25519, etc.)")
    
    # Status
    verified: bool = Field(default=False, description="Whether signature has been verified on-chain")

    class Config:
        collection_name = "signature_events"
        indexes = [
            [("signature_id", 1)],
            [("contract_id", 1), ("timestamp", -1)],
            [("tenant_id", 1), ("timestamp", -1)],
            [("signer_address", 1)],
            [("tx_id", 1)],
        ]


class StateTransitionSchema(BaseSchema):
    """
    State transition events - contract/document/workflow state changes.
    Tracks state machine transitions for audit and reconciliation.
    """

    transition_id: str = Field(..., description="Unique transition identifier")
    resource_type: str = Field(..., description="Resource type (contract, document, workflow)")
    resource_id: str = Field(..., description="Resource identifier")
    tenant_id: PyObjectId = Field(..., description="Tenant ID")
    
    # State change
    from_state: str = Field(..., description="Previous state")
    to_state: str = Field(..., description="New state")
    transition_reason: Optional[str] = Field(None, description="Reason for state change")
    
    # On-chain linkage
    tx_id: Optional[str] = Field(None, description="Algorand transaction ID (if on-chain)")
    block: Optional[int] = Field(None, description="Block number (if on-chain)")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Transition timestamp")
    
    # Initiator
    initiated_by: Optional[str] = Field(None, description="User/address who initiated the transition")
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional transition metadata")

    class Config:
        collection_name = "state_transitions"
        indexes = [
            [("transition_id", 1)],
            [("resource_type", 1), ("resource_id", 1), ("timestamp", -1)],
            [("tenant_id", 1), ("timestamp", -1)],
            [("tx_id", 1)],
        ]


class ReconciliationStatusSchema(BaseSchema):
    """
    Reconciliation status - tracks on-chain vs off-chain data consistency.
    Used for monitoring and alerting on data discrepancies.
    """

    reconciliation_id: str = Field(..., description="Unique reconciliation run identifier")
    resource_type: str = Field(..., description="Resource type being reconciled (contract, document, etc.)")
    resource_id: str = Field(..., description="Resource identifier")
    tenant_id: PyObjectId = Field(..., description="Tenant ID")
    
    # Reconciliation details
    reconciled_at: datetime = Field(default_factory=datetime.utcnow, description="Reconciliation timestamp")
    on_chain_state: Dict[str, Any] = Field(default_factory=dict, description="State from Algorand")
    off_chain_state: Dict[str, Any] = Field(default_factory=dict, description="State from Escra database")
    
    # Consistency check
    is_consistent: bool = Field(..., description="Whether on-chain and off-chain states match")
    discrepancies: List[str] = Field(default_factory=list, description="List of discrepancies found")
    
    # Resolution
    resolved: bool = Field(default=False, description="Whether discrepancies have been resolved")
    resolved_at: Optional[datetime] = Field(None, description="Resolution timestamp")
    resolution_notes: Optional[str] = Field(None, description="Notes on how discrepancies were resolved")

    class Config:
        collection_name = "reconciliation_status"
        indexes = [
            [("reconciliation_id", 1)],
            [("resource_type", 1), ("resource_id", 1), ("reconciled_at", -1)],
            [("tenant_id", 1), ("is_consistent", 1)],
            [("is_consistent", 1), ("resolved", 1)],  # For finding unresolved issues
        ]


class IndexerConfigurationSchema(BaseSchema):
    """
    Indexer configuration - runtime configuration for the Escra Indexer.
    Controls polling, batch sizes, target apps, etc.
    """

    config_id: str = Field(default="default", description="Configuration identifier")
    
    # Polling configuration
    enabled: bool = Field(default=True, description="Whether indexer is enabled")
    poll_interval_seconds: int = Field(default=5, description="Poll interval in seconds")
    batch_size: int = Field(default=100, description="Batch size for transaction ingestion")
    
    # Target applications
    target_app_ids: List[int] = Field(default_factory=list, description="Algorand App IDs to index (empty = all)")
    target_asset_ids: List[int] = Field(default_factory=list, description="Asset IDs to index (empty = all)")
    
    # Start position
    start_round: Optional[int] = Field(None, description="Round to start indexing from (for backfill)")
    current_round: Optional[int] = Field(None, description="Current round being processed")
    
    # Health and monitoring
    status: IndexerStatus = Field(default=IndexerStatus.IDLE, description="Current indexer status")
    last_poll_at: Optional[datetime] = Field(None, description="Last poll timestamp")
    last_error: Optional[str] = Field(None, description="Last error message")
    lag_blocks: int = Field(default=0, description="Current lag in blocks")
    
    # Alerting thresholds
    max_lag_blocks: int = Field(default=100, description="Max acceptable lag before alerting")
    error_threshold: int = Field(default=10, description="Max consecutive errors before pausing")

    class Config:
        collection_name = "indexer_configurations"
        indexes = [
            [("config_id", 1)],
        ]


class IndexerJobRunSchema(BaseSchema):
    """
    Indexer job run - tracks individual indexer job executions for monitoring and debugging.
    """

    job_id: str = Field(..., description="Unique job run identifier")
    job_type: str = Field(..., description="Job type (poll, backfill, reconcile, etc.)")
    
    # Execution details
    started_at: datetime = Field(default_factory=datetime.utcnow, description="Job start time")
    completed_at: Optional[datetime] = Field(None, description="Job completion time")
    duration_seconds: Optional[float] = Field(None, description="Job duration in seconds")
    
    # Results
    status: str = Field(default="running", description="Job status (running, completed, failed)")
    events_processed: int = Field(default=0, description="Number of events processed")
    events_indexed: int = Field(default=0, description="Number of events successfully indexed")
    errors_count: int = Field(default=0, description="Number of errors encountered")
    
    # Round tracking
    start_round: Optional[int] = Field(None, description="Starting round")
    end_round: Optional[int] = Field(None, description="Ending round")
    rounds_processed: Optional[int] = Field(None, description="Number of rounds processed")
    
    # Error details
    error_message: Optional[str] = Field(None, description="Error message if job failed")
    error_details: Dict[str, Any] = Field(default_factory=dict, description="Detailed error information")

    class Config:
        collection_name = "indexer_job_runs"
        indexes = [
            [("job_id", 1)],
            [("job_type", 1), ("started_at", -1)],
            [("status", 1), ("started_at", -1)],
        ]

