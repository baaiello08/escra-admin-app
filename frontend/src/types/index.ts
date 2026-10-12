/**
 * TypeScript Domain Models
 * 
 * Mirrors backend Pydantic schemas from escra-admin-implementation-plan.md
 * All types align with backend models for seamless API integration
 */

// ============================================================================
// Base Types
// ============================================================================

export interface BaseEntity {
  id: string
  created_at: string // ISO datetime
  updated_at: string // ISO datetime
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ApiError {
  error: {
    message: string
    code: string
    errors?: Record<string, any>
  }
}

// ============================================================================
// Tenant & Organization
// ============================================================================

export enum TenantStatus {
  ONBOARDING = 'onboarding',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
  OFFBOARDING = 'offboarding',
}

export enum TenantPlan {
  TRIAL = 'trial',
  ESSENTIAL = 'essential',
  PRO = 'pro',
  GROWTH = 'growth',
  ENTERPRISE = 'enterprise',
}

export interface Tenant extends BaseEntity {
  name: string
  slug: string
  status: TenantStatus
  plan: TenantPlan
  
  // Escra IDs
  escra_public_org_id: string // Public organization ID (e.g., ORG-9T2Q-K3WN)
  escra_private_org_id: string // Private organization ID (UUIDv7)
  
  // Organization details
  legal_entity_name?: string
  billing_entity_name?: string
  tax_id?: string
  
  // Contact information
  primary_contact_email?: string
  billing_email?: string
  support_email?: string
  
  // Region and data residency
  region: string
  timezone: string
  
  // Metadata
  metadata: Record<string, any>
  
  // Lifecycle timestamps
  trial_ends_at?: string
  suspended_at?: string
  offboarded_at?: string
}

export interface TenantSettings {
  data_residency: string
  currency: string
  language: string
  retention_policy_days?: number
  auto_suspend_inactive_days?: number
}

export interface TenantLifecycle {
  status: TenantStatus
  activated_at?: string
  suspended_at?: string
  terminated_at?: string
  offboarding_initiated_at?: string
}

// ============================================================================
// Users & Identity
// ============================================================================

export enum UserStatus {
  ONBOARDING = 'onboarding',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
  OFFBOARDING = 'offboarding',
}

export enum VerificationLevel {
  NONE = 'none',
  BASIC = 'basic',
  STANDARD = 'standard',
  ENHANCED = 'enhanced',
  ENTERPRISE = 'enterprise',
}

export enum PersonaVerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DECLINED = 'declined',
  EXPIRED = 'expired',
  CANCELED = 'canceled',
  ACTION_REQUIRED = 'action_required',
}

export interface User extends BaseEntity {
  tenant_id: string
  email: string
  first_name?: string
  last_name?: string
  status: UserStatus
  
  // Escra IDs
  escra_public_user_id: string // Public user ID (e.g., USR-3PJ9-K2DT)
  escra_private_user_id: string // Private user ID (UUIDv7)
  
  // User tier/plan
  // Note: User tier always matches the tenant's plan and is derived from it
  tier: TenantPlan // User tier (trial, essential, pro, growth, enterprise) - always matches tenant.plan
  
  // Authentication
  email_verified: boolean
  
  // Identity verification
  verification_level: VerificationLevel
  persona_inquiry_id?: string
  persona_verification_status?: PersonaVerificationStatus
  persona_risk_signals: string[]
  
  // Roles and permissions
  roles: string[]
  system_roles: string[]
  permissions: string[]
  
  // Linked identities
  linked_identities: Record<string, any>
  
  // Sessions
  last_login_at?: string
  last_login_ip?: string
  
  // PII classification and compliance
  pii_classification?: string
  data_subject_requests: string[]
}

export interface UserSession {
  id: string
  user_id: string
  tenant_id: string
  ip_address: string
  user_agent: string
  created_at: string
  expires_at: string
  last_activity_at: string
}

export interface UserPII {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  address?: Record<string, any>
  classification: string
  masked: boolean
}

// ============================================================================
// Roles, Permissions & Policy
// ============================================================================

export enum RoleType {
  SYSTEM = 'system',
  TENANT = 'tenant',
  CUSTOM = 'custom',
}

export interface Role extends BaseEntity {
  name: string
  type: RoleType
  tenant_id?: string
  
  // Permissions
  permissions: string[]
  permission_scopes: Record<string, string[]>
  
  // Metadata
  description?: string
  is_default: boolean
  metadata: Record<string, any>
}

export interface Permission extends BaseEntity {
  name: string
  resource_type: string
  action: string
  description?: string
  tenant_scoped: boolean
  system_only: boolean
}

export interface PolicyBundle extends BaseEntity {
  name: string
  description?: string
  permissions: string[]
  roles: string[]
  tenant_id?: string
}

export interface AccessReview extends BaseEntity {
  review_id: string
  tenant_id?: string
  reviewed_by: string
  reviewed_at: string
  scope: 'system' | 'tenant' | 'user'
  findings: AccessReviewFinding[]
  status: 'pending' | 'approved' | 'rejected'
}

export interface AccessReviewFinding {
  resource_type: string
  resource_id: string
  user_id?: string
  role_id?: string
  finding: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// ============================================================================
// Keys & Vault
// ============================================================================

export enum KeyType {
  SIGNING = 'signing',
  ENCRYPTION = 'encryption',
  WALLET = 'wallet',
  API = 'api',
}

export enum KeyStatus {
  ACTIVE = 'active',
  ROTATED = 'rotated',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
  PENDING = 'pending',
}

export interface Key extends BaseEntity {
  key_id: string
  name: string
  type: KeyType
  status: KeyStatus
  tenant_id: string // Required - keys belong to tenants via users
  user_id: string // Required - keys are user-only per enhancement plan (references escra_public_user_id)
  
  // Key metadata
  algorithm: string
  key_size?: number
  
  // Vault mapping
  vault_path?: string
  vault_policy?: string
  
  // Wallet/address (for blockchain keys)
  wallet_address?: string
  
  // Lifecycle
  expires_at?: string
  rotated_at?: string
  revoked_at?: string
  last_used_at?: string
}

export interface VaultMapping {
  logical_key_name: string
  vault_path: string
  vault_policy: string
  tenant_id?: string
  created_at: string
}

export interface KeyLifecycleEvent extends BaseEntity {
  key_id: string
  event_type: 'created' | 'rotated' | 'revoked' | 'expired' | 'accessed'
  performed_by: string
  metadata: Record<string, any>
}

// ============================================================================
// Indexer & Ledger
// ============================================================================

export enum EventType {
  TRANSACTION = 'transaction',
  APPLICATION_CALL = 'application_call',
  ASSET_TRANSFER = 'asset_transfer',
  STATE_TRANSITION = 'state_transition',
  SIGNATURE_EVENT = 'signature_event',
  CONTRACT_EXECUTION = 'contract_execution',
  RECONCILIATION = 'reconciliation',
}

export enum IndexerStatus {
  RUNNING = 'running',
  IDLE = 'idle',
  ERROR = 'error',
  PAUSED = 'paused',
  BACKFILLING = 'backfilling',
}

export interface OnChainEvent extends BaseEntity {
  tx_id: string
  block: number
  round: number
  timestamp: string
  event_type: EventType
  app_id?: number
  asset_id?: number
  sender?: string
  receiver?: string
  amount?: number
  tenant_id?: string // References escra_public_org_id
  contract_id?: string // References escra_public_contract_id
  document_id?: string // References escra_public_document_id
  workflow_id?: string
  raw_tx_data: Record<string, any>
  indexed_at: string
  indexer_version: string
}

export interface ContractExecutionTrace extends BaseEntity {
  contract_id: string // References escra_public_contract_id
  execution_id: string
  tenant_id: string // References escra_public_org_id
  tx_id: string
  app_id: number
  block: number
  action: string
  executed_by?: string // References escra_public_user_id
  execution_timestamp: string
  state_before: Record<string, any>
  state_after: Record<string, any>
  success: boolean
  error_message?: string
  trace_data: Record<string, any>
}

export interface SignatureEvent extends BaseEntity {
  // Escra IDs
  escra_public_signature_id: string // Public signature ID (e.g., SIG-K4WN)
  escra_private_signature_id: string // Private signature ID (UUIDv7) - same as id
  
  signature_id: string // Legacy field, kept for backward compatibility (same as escra_public_signature_id)
  contract_id: string // References escra_public_contract_id
  document_id?: string // References escra_public_document_id
  tenant_id: string // References escra_public_org_id
  signer_address: string
  signer_user_id?: string // References escra_public_user_id (the signer's public user ID)
  request_id?: string // References escra_public_signature_request_id
  tx_id: string
  block: number
  timestamp: string
  signature_data: Record<string, any>
  signature_method: string
  verified: boolean
}

export interface StateTransition extends BaseEntity {
  transition_id: string
  resource_type: string
  resource_id: string
  tenant_id: string
  from_state: string
  to_state: string
  transition_reason?: string
  tx_id?: string
  block?: number
  timestamp: string
  initiated_by?: string
  metadata: Record<string, any>
}

export interface ReconciliationStatus extends BaseEntity {
  reconciliation_id: string
  resource_type: string
  resource_id: string
  tenant_id: string
  reconciled_at: string
  on_chain_state: Record<string, any>
  off_chain_state: Record<string, any>
  is_consistent: boolean
  discrepancies: string[]
  resolved: boolean
  resolved_at?: string
  resolution_notes?: string
}

export interface IndexerJob extends BaseEntity {
  job_id: string
  job_type: 'poll' | 'backfill' | 'reconcile' | 'other'
  started_at: string
  completed_at?: string
  duration_seconds?: number
  status: 'running' | 'completed' | 'failed'
  events_processed: number
  events_indexed: number
  errors_count: number
  start_round?: number
  end_round?: number
  rounds_processed?: number
  error_message?: string
  error_details: Record<string, any>
}

export interface IndexerConfig {
  config_id: string
  enabled: boolean
  poll_interval_seconds: number
  batch_size: number
  target_app_ids: number[]
  target_asset_ids: number[]
  start_round?: number
  current_round?: number
  status: IndexerStatus
  last_poll_at?: string
  last_error?: string
  lag_blocks: number
  max_lag_blocks: number
  error_threshold: number
}

export interface IndexerHealth {
  status: IndexerStatus
  config?: IndexerConfig
  current_round?: number
  latest_indexed_round?: number
  lag_blocks: number
  is_healthy: boolean
  recent_jobs: IndexerJob[]
  error_count: number
  running: boolean
}

// ============================================================================
// Contracts, Documents & Workflows
// ============================================================================

export interface ContractTemplate extends BaseEntity {
  template_id: string
  name: string
  description?: string
  tenant_id?: string // null = global template
  category: string
  workflow_config: WorkflowConfig
  metadata: Record<string, any>
}

export interface DocumentTemplate extends BaseEntity {
  template_id: string
  name: string
  description?: string
  tenant_id?: string
  file_type: string
  content: Record<string, any>
}

export interface WorkflowConfig extends BaseEntity {
  workflow_id: string
  name: string
  tenant_id?: string
  steps: WorkflowStep[]
  default_state: string
  states: string[]
  on_chain_mapping?: Record<string, any>
}

export interface WorkflowStep {
  step_id: string
  name: string
  type: 'approval' | 'signature' | 'notification' | 'condition' | 'action'
  required_roles?: string[]
  conditions?: Record<string, any>
  on_chain_action?: Record<string, any>
  order: number
}

export interface CollaborationSettings extends BaseEntity {
  tenant_id: string
  allow_external_signers: boolean
  require_mfa_for_signing: boolean
  signature_threshold?: number
  approval_workflow_enabled: boolean
  notifications_enabled: boolean
}

// ============================================================================
// Billing & Usage
// ============================================================================

export enum PlanTier {
  ESSENTIAL = 'essential',
  PRO = 'pro',
  GROWTH = 'growth',
  ENTERPRISE = 'enterprise',
}

export interface UsageMetric extends BaseEntity {
  metric_id: string
  tenant_id: string
  metric_type: 'contracts' | 'documents' | 'signatures' | 'storage' | 'api_calls'
  value: number
  period_start: string
  period_end: string
  metadata: Record<string, any>
}

export interface BillingConfig extends BaseEntity {
  tenant_id: string
  plan_tier: PlanTier
  billing_email: string
  payment_method?: Record<string, any>
  billing_address?: Record<string, any>
  auto_renew: boolean
  next_billing_date?: string
}

export interface BillingEvent extends BaseEntity {
  event_id: string
  tenant_id: string
  event_type: 'charge' | 'refund' | 'upgrade' | 'downgrade' | 'cancellation'
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  occurred_at: string
  metadata: Record<string, any>
}

// ============================================================================
// Security & Risk
// ============================================================================

export interface SecuritySetting extends BaseEntity {
  scope: 'global' | 'tenant'
  tenant_id?: string
  setting_key: string
  setting_value: any
  description?: string
}

export interface SecurityEvent extends BaseEntity {
  event_id: string
  event_type: 'failed_login' | 'suspicious_activity' | 'policy_violation' | 'data_access'
  severity: 'low' | 'medium' | 'high' | 'critical'
  tenant_id?: string
  user_id?: string
  ip_address?: string
  user_agent?: string
  details: Record<string, any>
  resolved: boolean
  resolved_at?: string
}

export interface AbuseCase extends BaseEntity {
  case_id: string
  tenant_id?: string
  user_id?: string
  case_type: 'spam' | 'fraud' | 'abuse' | 'violation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved' | 'dismissed'
  description: string
  evidence: Record<string, any>
  assigned_to?: string
  resolved_at?: string
}

export interface FraudCase extends BaseEntity {
  case_id: string
  tenant_id?: string
  user_id?: string
  fraud_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved' | 'dismissed'
  description: string
  evidence: Record<string, any>
  financial_impact?: number
  assigned_to?: string
  resolved_at?: string
}

// ============================================================================
// System Health & Operations
// ============================================================================

export interface ServiceHealth extends BaseEntity {
  service_name: string
  status: 'healthy' | 'degraded' | 'down'
  last_check: string
  response_time_ms?: number
  error_rate?: number
  details: Record<string, any>
}

export interface JobRun extends BaseEntity {
  job_id: string
  job_type: string
  started_at: string
  completed_at?: string
  status: 'running' | 'completed' | 'failed'
  result?: Record<string, any>
  error?: string
}

export interface FeatureFlag extends BaseEntity {
  flag_key: string
  description?: string
  enabled: boolean
  tenant_id?: string // null = global flag
  conditions?: Record<string, any>
}

// ============================================================================
// Support & Internal Tools
// ============================================================================

export interface SupportCase extends BaseEntity {
  case_id: string
  tenant_id?: string
  user_id?: string
  subject: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string
  tags: string[]
  created_by: string
  resolved_at?: string
}

export interface ImpersonationSession extends BaseEntity {
  session_id: string
  impersonator_id: string
  impersonated_user_id: string
  tenant_id?: string
  reason: string
  started_at: string
  ended_at?: string
  active: boolean
}

export interface Announcement extends BaseEntity {
  announcement_id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'error' | 'success'
  tenant_id?: string // null = global announcement
  active: boolean
  start_date?: string
  end_date?: string
}

// ============================================================================
// Identity / Persona
// ============================================================================

export interface PersonaVerification extends BaseEntity {
  inquiry_id: string
  tenant_id: string
  user_id: string
  status: PersonaVerificationStatus
  verification_level: VerificationLevel
  persona_data: Record<string, any>
  risk_signals: string[]
  created_at_persona?: string
  completed_at?: string
  metadata: Record<string, any>
}

export interface PersonaCase extends BaseEntity {
  case_id: string
  inquiry_id: string
  tenant_id: string
  user_id: string
  case_type: string
  status: string
  risk_score?: number
  risk_signals: string[]
  details: Record<string, any>
}

export interface PersonaRiskSignal {
  signal_id: string
  inquiry_id: string
  signal_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  detected_at: string
}

// ============================================================================
// Contracts, Documents & Signature Requests
// ============================================================================

export enum ContractStatus {
  INITIATION = 'initiation',
  PREPARATION = 'preparation',
  SIGNATURES = 'signatures',
  FUNDING = 'funding',
  SETTLED = 'settled',
  COMPLETED = 'completed',
  VOIDED = 'voided',
  DELETED = 'deleted',
}

export enum DocumentStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  SIGNING = 'signing',
  EXECUTED = 'executed',
  WITHDRAWN = 'withdrawn',
  REJECTED = 'rejected',
  VOIDED = 'voided',
  DELETED = 'deleted',
}

export interface Contract extends BaseEntity {
  // Escra IDs
  escra_public_contract_id: string // Public contract ID (e.g., CON-9D4Q)
  escra_private_contract_id: string // Private contract ID (UUIDv7) - same as id
  
  on_chain_id: number // Algorand App ID
  tenant_id: string // References escra_public_org_id
  user_creator_id: string // References escra_public_user_id
  status?: ContractStatus
  collaborator_count: number
  document_count: number
  created_date: string
  last_update: string
  transaction_count: number
  lockup: number
  transaction_cost: number
}

export interface Document extends BaseEntity {
  // Escra IDs
  escra_public_document_id: string // Public document ID (e.g., DOC-T7QJ)
  escra_private_document_id: string // Private document ID (UUIDv7) - same as id
  
  on_chain_id: number // Algorand App ID
  tenant_id: string // References escra_public_org_id
  user_creator_id: string // References escra_public_user_id
  status?: DocumentStatus
  file_type: string
  file_size: number // bytes
  created_date: string
  last_update: string
  transaction_count: number
  lockup: number
  transaction_cost: number
}

export interface SignatureRequest extends BaseEntity {
  // Escra IDs
  escra_public_signature_request_id: string // Public signature request ID (e.g., REQ-K4WN)
  escra_private_signature_request_id: string // Private signature request ID (UUIDv7) - same as id
  
  on_chain_id: number // Algorand App ID
  tenant_id: string // References escra_public_org_id
  document_id: string // References escra_public_document_id
  user_creator_id: string // References escra_public_user_id
  signer_count: number
  signed_count: number
  required_signers?: Array<{
    user_id: string // References escra_public_user_id (all signers must have user IDs, even if external to org)
    address: string // Algorand address (public key)
    name?: string // Optional display name (e.g., "External Signer" for users external to the organization)
  }>
  created_date: string
  last_update: string
  transaction_count: number
  transaction_cost: number
}

