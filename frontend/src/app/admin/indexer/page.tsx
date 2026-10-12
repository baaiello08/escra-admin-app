'use client'

/**
 * Indexer - Unified page per escra-frontend-enhancement-plan.md
 * This combines indexer monitoring and ledger explorer functionality
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { KPICard } from '@/components/shared/KPICard'
import { StatusChip } from '@/components/shared/StatusChip'
import { Drawer } from '@/components/shared/Drawer'
import { CopyButton } from '@/components/shared/CopyButton'
import { DataTable, Column } from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { OnChainEvent, EventType, Tenant, Contract, Document, User } from '@/types'
import { format } from 'date-fns'
import { IconChevronDown } from '@tabler/icons-react'

// Helper function to format Escra User ID
function formatEscraUserId(escraPublicUserId: string): string {
  return escraPublicUserId
}

// Helper function to format organization ID
function formatOrganizationId(escraPublicOrgId: string): string {
  return escraPublicOrgId
}

// Helper functions to generate IDs matching the mock data (same as api-client.ts)
function generatePublicOrgId(seed: string): string {
  const num = seed.replace('tenant-', '')
  const padded = num.padStart(8, '0')
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const part1 = Array.from({ length: 4 }, (_, i) => chars[parseInt(padded[i] || '0') % chars.length]).join('')
  const part2 = Array.from({ length: 4 }, (_, i) => chars[parseInt(padded[i + 4] || '0') % chars.length]).join('')
  return `ORG-${part1}-${part2}`
}

function generatePublicContractId(seed: string): string {
  const num = seed.replace('contract-', '')
  const padded = num.padStart(4, '0')
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const part1 = Array.from({ length: 4 }, (_, i) => chars[parseInt(padded[i] || '0') % chars.length]).join('')
  return `CON-${part1}`
}

function generatePublicDocumentId(seed: string): string {
  const num = seed.replace('document-', '')
  const padded = num.padStart(4, '0')
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const part1 = Array.from({ length: 4 }, (_, i) => chars[parseInt(padded[i] || '0') % chars.length]).join('')
  return `DOC-${part1}`
}

function generatePublicUserId(seed: string): string {
  const num = seed.replace('user-', '')
  const padded = num.padStart(8, '0')
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  const part1 = Array.from({ length: 4 }, (_, i) => chars[parseInt(padded[i] || '0') % chars.length]).join('')
  const part2 = Array.from({ length: 4 }, (_, i) => chars[parseInt(padded[i + 4] || '0') % chars.length]).join('')
  return `USR-${part1}-${part2}`
}

export default function IndexerPage() {
  const [page, setPage] = useState(1)
  const [selectedEvent, setSelectedEvent] = useState<OnChainEvent | null>(null)
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [tenantFilter, setTenantFilter] = useState<string[]>([])
  const [userFilter, setUserFilter] = useState<string[]>([])
  const [contractFilter, setContractFilter] = useState<string[]>([])
  const [documentFilter, setDocumentFilter] = useState<string[]>([])
  const [dateRangeStart, setDateRangeStart] = useState<string>('')
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('')
  const [globalSearch, setGlobalSearch] = useState<string>('')
  const [timeFilter, setTimeFilter] = useState<string>('all')
  const [eventsTab, setEventsTab] = useState<'ledger_events' | 'recent_jobs'>('ledger_events')
  
  // Search states for searchable filters
  const [tenantSearch, setTenantSearch] = useState<string>('')
  const [userSearch, setUserSearch] = useState<string>('')
  const [contractSearch, setContractSearch] = useState<string>('')
  const [documentSearch, setDocumentSearch] = useState<string>('')
  const [showTenantDropdown, setShowTenantDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showContractDropdown, setShowContractDropdown] = useState(false)
  const [showDocumentDropdown, setShowDocumentDropdown] = useState(false)
  
  // Close dropdowns when clicking outside
  const tenantDropdownRef = useRef<HTMLDivElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const contractDropdownRef = useRef<HTMLDivElement>(null)
  const documentDropdownRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tenantDropdownRef.current && !tenantDropdownRef.current.contains(event.target as Node)) {
        setShowTenantDropdown(false)
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
      if (contractDropdownRef.current && !contractDropdownRef.current.contains(event.target as Node)) {
        setShowContractDropdown(false)
      }
      if (documentDropdownRef.current && !documentDropdownRef.current.contains(event.target as Node)) {
        setShowDocumentDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data: indexerStatus } = useQuery({
    queryKey: ['indexer-status'],
    queryFn: () => apiClient.getIndexerStatus(),
    refetchInterval: 5000, // Refetch every 5 seconds
  })

  const { data: jobsData } = useQuery({
    queryKey: ['indexer-jobs'],
    queryFn: () => apiClient.listIndexerJobs({ page: 1, page_size: 10 }),
  })

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['ledger-events', page, eventTypeFilter, tenantFilter],
    queryFn: () =>
      apiClient.listOnChainEvents({
        page,
        page_size: 20,
        event_type: eventTypeFilter !== 'all' ? (eventTypeFilter as any) : undefined,
      }),
  })

  // Fetch tenants, contracts, and documents for lookups
  const { data: tenantsData } = useQuery({
    queryKey: ['all-tenants-indexer'],
    queryFn: () => apiClient.listTenants({ page_size: 1000 }),
  })

  const { data: contractsData } = useQuery({
    queryKey: ['all-contracts-indexer'],
    queryFn: () => apiClient.listContracts({ page_size: 1000 }),
  })

  const { data: documentsData } = useQuery({
    queryKey: ['all-documents-indexer'],
    queryFn: () => apiClient.listDocuments({ page_size: 1000 }),
  })

  const { data: usersData } = useQuery({
    queryKey: ['all-users-indexer'],
    queryFn: () => apiClient.listUsers({ page_size: 1000 }),
  })

  // Create lookup maps
  const tenantMap = useMemo(() => {
    if (!tenantsData) return new Map<string, Tenant>()
    const map = new Map<string, Tenant>()
    tenantsData.items.forEach((tenant: Tenant) => {
      map.set(tenant.escra_public_org_id, tenant)
    })
    return map
  }, [tenantsData])

  const contractMap = useMemo(() => {
    if (!contractsData) return new Map<string, Contract>()
    const map = new Map<string, Contract>()
    contractsData.items.forEach((contract: Contract) => {
      map.set(contract.escra_public_contract_id, contract)
    })
    return map
  }, [contractsData])

  const documentMap = useMemo(() => {
    if (!documentsData) return new Map<string, Document>()
    const map = new Map<string, Document>()
    documentsData.items.forEach((document: Document) => {
      map.set(document.escra_public_document_id, document)
    })
    return map
  }, [documentsData])

  const userMap = useMemo(() => {
    if (!usersData) return new Map<string, any>()
    const map = new Map<string, any>()
    usersData.items.forEach((user: any) => {
      map.set(user.escra_public_user_id, user)
    })
    return map
  }, [usersData])

  // Events will come from the API

  // Helper function to get date range based on time filter
  const getTimeFilterDate = useMemo(() => {
    const now = new Date()
    switch (timeFilter) {
      case '1w':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case '2w':
        return new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      case '1m':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case '6m':
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      case '2y':
        return new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000)
      default:
        return null
    }
  }, [timeFilter])

  // Filter events by time
  const timeFilteredEvents = useMemo(() => {
    const allEvents = eventsData?.items || []
    if (!getTimeFilterDate) return allEvents
    return allEvents.filter((event: OnChainEvent) => {
      const eventDate = new Date(event.timestamp)
      return eventDate >= getTimeFilterDate
    })
  }, [eventsData?.items, getTimeFilterDate])

  // Filter contracts by time
  const timeFilteredContracts = useMemo(() => {
    if (!contractsData?.items) return []
    if (!getTimeFilterDate) return contractsData.items
    return contractsData.items.filter((contract: Contract) => {
      const contractDate = new Date(contract.created_date)
      return contractDate >= getTimeFilterDate
    })
  }, [contractsData?.items, getTimeFilterDate])

  // Filter documents by time
  const timeFilteredDocuments = useMemo(() => {
    if (!documentsData?.items) return []
    if (!getTimeFilterDate) return documentsData.items
    return documentsData.items.filter((document: Document) => {
      const documentDate = new Date(document.created_date)
      return documentDate >= getTimeFilterDate
    })
  }, [documentsData?.items, getTimeFilterDate])

  // Filter events based on filters
  const filteredEvents = useMemo(() => {
    const baseEvents = eventsData?.items || []
    
    return baseEvents.filter((event) => {
      // Event type filter
      if (eventTypeFilter !== 'all' && event.event_type !== eventTypeFilter) {
        return false
      }
      
      // Tenant/Organization filter
      if (tenantFilter.length > 0 && !tenantFilter.includes(event.tenant_id)) {
        return false
      }
      
      // User filter
      if (userFilter.length > 0) {
        const contract = event.contract_id ? contractMap.get(event.contract_id) : null
        const document = event.document_id ? documentMap.get(event.document_id) : null
        const rawData = event.raw_tx_data as any
        const userId = contract?.user_creator_id || document?.user_creator_id || rawData?.executed_by || rawData?.user_id || rawData?.user_creator_id
        if (!userId || !userFilter.includes(userId)) {
          return false
        }
      }
      
      // Contract filter
      if (contractFilter.length > 0 && !contractFilter.includes(event.contract_id)) {
        return false
      }
      
      // Document filter
      if (documentFilter.length > 0 && !documentFilter.includes(event.document_id)) {
        return false
      }
      
      // Date range filter
      if (dateRangeStart || dateRangeEnd) {
        const eventDate = new Date(event.timestamp)
        if (dateRangeStart && eventDate < new Date(dateRangeStart)) {
          return false
        }
        if (dateRangeEnd) {
          const endDate = new Date(dateRangeEnd)
          endDate.setHours(23, 59, 59, 999) // Include entire end date
          if (eventDate > endDate) {
            return false
          }
        }
      }
      
      // Global search filter
      if (globalSearch) {
        const searchLower = globalSearch.toLowerCase().trim()
        
        // Skip empty searches after trimming
        if (!searchLower) {
          return true
        }
        
        // Search event type
        const eventTypeMatch = event.event_type.replace('_', ' ').toLowerCase().includes(searchLower)
        
        // Search organization name or ID
        const tenant = event.tenant_id ? tenantMap.get(event.tenant_id) : null
        const orgNameMatch = tenant?.name?.toLowerCase().includes(searchLower) || false
        const orgIdMatch = event.tenant_id?.toLowerCase().includes(searchLower) || false
        
        // Search user name or ID
        const contract = event.contract_id ? contractMap.get(event.contract_id) : null
        const document = event.document_id ? documentMap.get(event.document_id) : null
        const rawData = event.raw_tx_data as any
        const userId = contract?.user_creator_id || document?.user_creator_id || rawData?.executed_by || rawData?.user_id || rawData?.user_creator_id
        const user = userId ? userMap.get(userId) : null
        
        // For user name matching, check full name (first + last) or individual parts
        let userNameMatch = false
        if (user) {
          const fullName = user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}`.toLowerCase()
            : ''
          const firstName = user.first_name?.toLowerCase() || ''
          const lastName = user.last_name?.toLowerCase() || ''
          const email = user.email?.toLowerCase() || ''
          
          // Check if search matches full name, first name, last name, or email
          // Also split search by spaces and check if all parts match
          const searchParts = searchLower.split(/\s+/).filter(part => part.length > 0)
          
          if (searchParts.length === 1) {
            // Single word search - match if it's in first name, last name, full name, or email
            userNameMatch = firstName.includes(searchParts[0]) || 
                           lastName.includes(searchParts[0]) ||
                           fullName.includes(searchParts[0]) ||
                           email.includes(searchParts[0])
          } else {
            // Multi-word search - check if all parts match somewhere in the name
            const allPartsMatch = searchParts.every(part => 
              firstName.includes(part) || 
              lastName.includes(part) ||
              fullName.includes(part) ||
              email.includes(part)
            )
            userNameMatch = allPartsMatch
          }
        }
        
        const userIdMatch = userId?.toLowerCase().includes(searchLower) || false
        
        if (!eventTypeMatch && !orgNameMatch && !orgIdMatch && !userNameMatch && !userIdMatch) {
          return false
        }
      }
      
      return true
    })
  }, [eventsData?.items, eventTypeFilter, tenantFilter, userFilter, contractFilter, documentFilter, dateRangeStart, dateRangeEnd, globalSearch, contractMap, documentMap, tenantMap, userMap])

  const events = filteredEvents

  const columns: Column<OnChainEvent>[] = [
    {
      key: 'tx_id',
      header: 'Transaction ID',
      render: (event) => {
        if (!event.tx_id) {
          return <span className="text-sm font-mono text-gray-900">N/A</span>
        }
        
        // Truncate: show first 6 and last 6 characters
        const truncated = event.tx_id.length > 12 
          ? `${event.tx_id.slice(0, 6)}...${event.tx_id.slice(-6)}`
          : event.tx_id
        
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-primary-600">{truncated}</span>
            <CopyButton text={event.tx_id} />
          </div>
        )
      },
    },
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: (event) => (
        <div className="text-sm text-gray-900">
          <div>{format(new Date(event.timestamp), 'MMM d, yyyy')}</div>
          <div className="text-xs text-gray-500">{format(new Date(event.timestamp), 'HH:mm:ss')} UTC</div>
        </div>
      ),
    },
    {
      key: 'event_type',
      header: 'Event Type',
      render: (event) => (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 capitalize">
          {event.event_type.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (event) => {
        // Determine status based on event type and other factors
        // For now, we'll use a simple status based on event type
        const status = event.event_type === EventType.SIGNATURE_EVENT ? 'completed' : 
                      event.event_type === EventType.CONTRACT_EXECUTION ? 'executed' : 
                      event.event_type === EventType.STATE_TRANSITION ? 'transitioned' : 'processed'
        
        return (
          <div className="flex justify-center">
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 capitalize">
              {status}
            </span>
          </div>
        )
      },
    },
    {
      key: 'user_id',
      header: 'User Public Key',
      render: (event) => {
        // Try to get user from contract or document (user_creator_id)
        const contract = event.contract_id ? contractMap.get(event.contract_id) : null
        const document = event.document_id ? documentMap.get(event.document_id) : null
        // Also check raw_tx_data for executed_by or user_id
        const rawData = event.raw_tx_data as any
        const userId = contract?.user_creator_id || document?.user_creator_id || rawData?.executed_by || rawData?.user_id || rawData?.user_creator_id
        
        if (!userId) {
          return <span className="text-sm text-gray-900">N/A</span>
        }
        
        // Look up user by public user ID
        const user = userMap.get(userId)
        const publicKey = user?.public_key || (user as any)?.publicKey
        
        const handleCopyPublicKey = async (e: React.MouseEvent) => {
          e.stopPropagation()
          if (publicKey) {
            try {
              await navigator.clipboard.writeText(publicKey)
            } catch (err) {
              console.error('Failed to copy:', err)
            }
          }
        }
        
        return (
          <div className="text-sm text-gray-900">
            {publicKey ? (
              <div className="flex items-center gap-1 font-mono">
                <span>{publicKey.length > 12 ? `${publicKey.slice(0, 6)}...${publicKey.slice(-6)}` : publicKey}</span>
                <CopyButton text={publicKey} />
              </div>
            ) : (
              <div className="font-mono">N/A</div>
            )}
            {userId && (
              <div className="text-xs text-gray-500 font-mono">
                {formatEscraUserId(userId)}
              </div>
            )}
            {user && (user.first_name || user.last_name || user.email) && (
              <div className="text-xs text-gray-500">
                {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'tenant_id',
      header: 'Organization ID',
      render: (event) => {
        if (!event.tenant_id) {
          return <span className="text-sm text-gray-900">N/A</span>
        }
        const tenant = tenantMap.get(event.tenant_id)
        return (
          <div className="text-sm text-gray-900">
            <div className="font-mono">{formatOrganizationId(event.tenant_id)}</div>
            {tenant?.name && (
              <div className="text-xs text-gray-500">
                {tenant.name}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'contract_id',
      header: (
        <div>
          <div>Contract</div>
          <div>App ID</div>
        </div>
      ),
      render: (event) => {
        const contract = event.contract_id ? contractMap.get(event.contract_id) : null
        const appId = contract?.on_chain_id || (event.raw_tx_data as any)?.contract_app_id || event.app_id
        
        return (
          <div className="text-sm text-gray-900">
            {appId ? (
              <div className="flex items-center gap-1 font-mono">
                <span>{appId}</span>
                <CopyButton text={String(appId)} />
              </div>
            ) : (
              <div className="font-mono">N/A</div>
            )}
            {event.contract_id && (
              <div className="text-xs text-gray-500 font-mono">
                {event.contract_id}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'document_id',
      header: (
        <div>
          <div>Document</div>
          <div>App ID</div>
        </div>
      ),
      render: (event) => {
        const document = event.document_id ? documentMap.get(event.document_id) : null
        const appId = document?.on_chain_id || (event.raw_tx_data as any)?.document_app_id
        
        return (
          <div className="text-sm text-gray-900">
            {appId ? (
              <div className="flex items-center gap-1 font-mono">
                <span>{appId}</span>
                <CopyButton text={String(appId)} />
              </div>
            ) : (
              <div className="font-mono">N/A</div>
            )}
            {event.document_id && (
              <div className="text-xs text-gray-500 font-mono">
                {event.document_id}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'block',
      header: 'Block',
      sortable: true,
      render: (event) => <span className="text-sm text-gray-900">{event.block}</span>,
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Indexer</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor indexer health and explore on-chain/off-chain ledger events
        </p>
      </div>

      {/* Indexer Health Section */}
      <div className="mb-6 rounded-lg bg-white p-6" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div>
            <dt className="text-sm font-medium text-gray-500">Indexer Status</dt>
            <dd className="mt-1">
              <StatusChip status={indexerStatus?.is_healthy ? 'healthy' : 'degraded'} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Blockchain Status</dt>
            <dd className="mt-1">
              <StatusChip status="online" />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Lag (blocks)</dt>
            <dd className="mt-1 text-sm text-gray-900">{indexerStatus?.lag_blocks || 0}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Recent Errors</dt>
            <dd className="mt-1 text-sm text-gray-900">{indexerStatus?.error_count || 0}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Current Round</dt>
            <dd className="mt-1 text-sm text-gray-900">{indexerStatus?.current_round || 0}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Indexed Round</dt>
            <dd className="mt-1 text-sm text-gray-900">{indexerStatus?.latest_indexed_round || 0}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Poll Interval</dt>
            <dd className="mt-1 text-sm text-gray-900">{indexerStatus?.config?.poll_interval_seconds || '-'}s</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Batch Size</dt>
            <dd className="mt-1 text-sm text-gray-900">{indexerStatus?.config?.batch_size || '-'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Max Lag</dt>
            <dd className="mt-1 text-sm text-gray-900">{indexerStatus?.config?.max_lag_blocks || '-'} blocks</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Enabled</dt>
            <dd className="mt-1 text-sm text-gray-900">{indexerStatus?.config?.enabled ? 'Yes' : 'No'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Running</dt>
            <dd className="mt-1 text-sm text-gray-900">{indexerStatus?.running ? 'Yes' : 'No'}</dd>
          </div>
        </div>
      </div>

      {/* Time Filter */}
      <div className="mb-4">
        <div className="relative inline-block">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="appearance-none rounded border border-gray-200 bg-white px-3 py-2 pr-8 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Time</option>
            <option value="1w">Last week</option>
            <option value="2w">Last 2 weeks</option>
            <option value="1m">Last month</option>
            <option value="6m">Last 6 months</option>
            <option value="1y">Last year</option>
            <option value="2y">Last 2 years</option>
          </select>
          <IconChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        </div>
      </div>

      {/* Indexer Status KPI Strip */}
      <div className="mb-6 space-y-4">
        {/* First Row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
          <KPICard
            title="Total Events"
            value={timeFilteredEvents.length}
            subtitle="Indexed events"
          />
          <KPICard
            title="Total Transactions"
            value={
              (() => {
                const uniqueTxIds = new Set(timeFilteredEvents.filter((e: OnChainEvent) => e.tx_id).map((e: OnChainEvent) => e.tx_id))
                return uniqueTxIds.size
              })()
            }
            subtitle="Unique on-chain transactions"
          />
        </div>
        {/* Second Row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-3">
          <KPICard
            title="Total Contracts"
            value={timeFilteredContracts.length}
            subtitle="Active contracts"
          />
          <KPICard
            title="Total Documents"
            value={timeFilteredDocuments.length}
            subtitle="Indexed documents"
          />
          <KPICard
            title="Total Signatures"
            value={timeFilteredEvents.filter((e: OnChainEvent) => e.event_type === EventType.SIGNATURE_EVENT).length}
            subtitle="Signature events"
          />
        </div>
      </div>

      {/* Ledger Events & Recent Jobs Section */}
      <div className="mb-6 rounded-lg bg-white p-6" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setEventsTab('ledger_events')}
              className={`
                whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium
                ${
                  eventsTab === 'ledger_events'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              Ledger Events
            </button>
            <button
              onClick={() => setEventsTab('recent_jobs')}
              className={`
                whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium
                ${
                  eventsTab === 'recent_jobs'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              Recent Jobs
            </button>
          </nav>
        </div>

        {/* Ledger Events Tab */}
        {eventsTab === 'ledger_events' && (
          <div>
            {/* Filters */}
            <div className="mb-4">
              <div className="flex gap-4">
                <div className="w-full sm:w-auto sm:min-w-[193px]">
                  <label className="block text-sm font-medium text-gray-700">Event Type</label>
                  <select
                    value={eventTypeFilter}
                    onChange={(e) => setEventTypeFilter(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
                  >
                    <option value="all">All</option>
                    {Object.values(EventType).map((type) => (
                      <option key={type} value={type}>
                        {type.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="w-full sm:w-auto sm:min-w-[213px] relative" ref={tenantDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700">Organization</label>
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      value={tenantSearch}
                      onChange={(e) => {
                        setTenantSearch(e.target.value)
                        setShowTenantDropdown(true)
                      }}
                      onFocus={() => setShowTenantDropdown(true)}
                      placeholder={tenantFilter.length === 0 ? 'All Organizations' : `${tenantFilter.length} selected`}
                      className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
                    />
                    {showTenantDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        <div
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-700 flex items-center"
                          onClick={() => {
                            setTenantFilter([])
                            setTenantSearch('')
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={tenantFilter.length === 0}
                            onChange={() => {
                              setTenantFilter([])
                              setTenantSearch('')
                            }}
                            className="mr-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span>All Organizations</span>
                        </div>
                        {tenantsData?.items
                          ?.filter((tenant: Tenant) => 
                            !tenantSearch || 
                            tenant.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
                            tenant.escra_public_org_id.toLowerCase().includes(tenantSearch.toLowerCase())
                          )
                          .map((tenant: Tenant) => {
                            const isSelected = tenantFilter.includes(tenant.escra_public_org_id)
                            return (
                              <div
                                key={tenant.escra_public_org_id}
                                className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center"
                                onClick={() => {
                                  if (isSelected) {
                                    setTenantFilter(tenantFilter.filter(id => id !== tenant.escra_public_org_id))
                                  } else {
                                    setTenantFilter([...tenantFilter, tenant.escra_public_org_id])
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setTenantFilter(tenantFilter.filter(id => id !== tenant.escra_public_org_id))
                                    } else {
                                      setTenantFilter([...tenantFilter, tenant.escra_public_org_id])
                                    }
                                  }}
                                  className="mr-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div>
                                  <div className="text-sm text-gray-700">{tenant.name}</div>
                                  <div className="text-xs text-gray-500 font-mono">{tenant.escra_public_org_id}</div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="w-full sm:w-auto sm:min-w-[213px] relative" ref={userDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700">User</label>
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value)
                        setShowUserDropdown(true)
                      }}
                      onFocus={() => setShowUserDropdown(true)}
                      placeholder={userFilter.length === 0 ? 'All Users' : `${userFilter.length} selected`}
                      className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
                    />
                    {showUserDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        <div
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-700 flex items-center"
                          onClick={() => {
                            setUserFilter([])
                            setUserSearch('')
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={userFilter.length === 0}
                            onChange={() => {
                              setUserFilter([])
                              setUserSearch('')
                            }}
                            className="mr-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span>All Users</span>
                        </div>
                        {usersData?.items
                          ?.filter((user: any) => 
                            !userSearch || 
                            (user.first_name && user.first_name.toLowerCase().includes(userSearch.toLowerCase())) ||
                            (user.last_name && user.last_name.toLowerCase().includes(userSearch.toLowerCase())) ||
                            user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                            user.escra_public_user_id.toLowerCase().includes(userSearch.toLowerCase())
                          )
                          .map((user: any) => {
                            const isSelected = userFilter.includes(user.escra_public_user_id)
                            return (
                              <div
                                key={user.escra_public_user_id}
                                className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center"
                                onClick={() => {
                                  if (isSelected) {
                                    setUserFilter(userFilter.filter(id => id !== user.escra_public_user_id))
                                  } else {
                                    setUserFilter([...userFilter, user.escra_public_user_id])
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setUserFilter(userFilter.filter(id => id !== user.escra_public_user_id))
                                    } else {
                                      setUserFilter([...userFilter, user.escra_public_user_id])
                                    }
                                  }}
                                  className="mr-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div>
                                  <div className="text-sm text-gray-700">{user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}</div>
                                  <div className="text-xs text-gray-500 font-mono">{user.escra_public_user_id}</div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="w-full sm:w-auto sm:min-w-[213px] relative" ref={contractDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700">Contract</label>
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      value={contractSearch}
                      onChange={(e) => {
                        setContractSearch(e.target.value)
                        setShowContractDropdown(true)
                      }}
                      onFocus={() => setShowContractDropdown(true)}
                      placeholder={contractFilter.length === 0 ? 'All Contracts' : `${contractFilter.length} selected`}
                      className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
                    />
                    {showContractDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        <div
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-700 flex items-center"
                          onClick={() => {
                            setContractFilter([])
                            setContractSearch('')
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={contractFilter.length === 0}
                            onChange={() => {
                              setContractFilter([])
                              setContractSearch('')
                            }}
                            className="mr-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span>All Contracts</span>
                        </div>
                        {contractsData?.items
                          ?.filter((contract: Contract) => 
                            !contractSearch || 
                            contract.escra_public_contract_id.toLowerCase().includes(contractSearch.toLowerCase())
                          )
                          .map((contract: Contract) => {
                            const isSelected = contractFilter.includes(contract.escra_public_contract_id)
                            return (
                              <div
                                key={contract.escra_public_contract_id}
                                className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center text-sm text-gray-700 font-mono"
                                onClick={() => {
                                  if (isSelected) {
                                    setContractFilter(contractFilter.filter(id => id !== contract.escra_public_contract_id))
                                  } else {
                                    setContractFilter([...contractFilter, contract.escra_public_contract_id])
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setContractFilter(contractFilter.filter(id => id !== contract.escra_public_contract_id))
                                    } else {
                                      setContractFilter([...contractFilter, contract.escra_public_contract_id])
                                    }
                                  }}
                                  className="mr-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                {contract.escra_public_contract_id}
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="w-full sm:w-auto sm:min-w-[213px] relative" ref={documentDropdownRef}>
                  <label className="block text-sm font-medium text-gray-700">Document</label>
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      value={documentSearch}
                      onChange={(e) => {
                        setDocumentSearch(e.target.value)
                        setShowDocumentDropdown(true)
                      }}
                      onFocus={() => setShowDocumentDropdown(true)}
                      placeholder={documentFilter.length === 0 ? 'All Documents' : `${documentFilter.length} selected`}
                      className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
                    />
                    {showDocumentDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                        <div
                          className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-700 flex items-center"
                          onClick={() => {
                            setDocumentFilter([])
                            setDocumentSearch('')
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={documentFilter.length === 0}
                            onChange={() => {
                              setDocumentFilter([])
                              setDocumentSearch('')
                            }}
                            className="mr-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span>All Documents</span>
                        </div>
                        {documentsData?.items
                          ?.filter((document: Document) => 
                            !documentSearch || 
                            document.escra_public_document_id.toLowerCase().includes(documentSearch.toLowerCase())
                          )
                          .map((document: Document) => {
                            const isSelected = documentFilter.includes(document.escra_public_document_id)
                            return (
                              <div
                                key={document.escra_public_document_id}
                                className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center text-sm text-gray-700 font-mono"
                                onClick={() => {
                                  if (isSelected) {
                                    setDocumentFilter(documentFilter.filter(id => id !== document.escra_public_document_id))
                                  } else {
                                    setDocumentFilter([...documentFilter, document.escra_public_document_id])
                                  }
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    if (isSelected) {
                                      setDocumentFilter(documentFilter.filter(id => id !== document.escra_public_document_id))
                                    } else {
                                      setDocumentFilter([...documentFilter, document.escra_public_document_id])
                                    }
                                  }}
                                  className="mr-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                {document.escra_public_document_id}
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="w-full sm:w-auto sm:min-w-[253px]">
                  <label className="block text-sm font-medium text-gray-700">Date Range</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="date"
                      value={dateRangeStart}
                      onChange={(e) => setDateRangeStart(e.target.value)}
                      className="flex-1 rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
                      placeholder="Start"
                    />
                    <input
                      type="date"
                      value={dateRangeEnd}
                      onChange={(e) => setDateRangeEnd(e.target.value)}
                      className="flex-1 rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
                      placeholder="End"
                    />
                  </div>
                </div>
              </div>
              
              {/* Global Search Bar */}
              <div className="mt-4">
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search by event type, organization name or ID & user name or ID..."
                  className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-400 py-2 px-3"
                />
              </div>
            </div>

            {/* Table */}
            <div className="rounded-lg bg-white overflow-hidden" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <DataTable
                columns={columns}
                data={events}
                loading={isLoading}
                onRowClick={(event) => setSelectedEvent(event)}
                emptyMessage="No ledger events found"
              />
            </div>
            {eventsData && (
              <Pagination
                page={page}
                totalPages={eventsData.total_pages}
                onPageChange={setPage}
                pageSize={eventsData.page_size}
                total={eventsData.total}
              />
            )}
          </div>
        )}

        {/* Recent Jobs Tab */}
        {eventsTab === 'recent_jobs' && (
          <div>
            {jobsData?.items && jobsData.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Events Indexed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {jobsData.items.map((job: any) => (
                      <tr key={job.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">{job.job_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{job.job_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusChip status={job.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{job.events_indexed}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {job.duration_seconds ? `${(job.duration_seconds / 60).toFixed(1)} min` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(job.started_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No recent jobs</p>
            )}
          </div>
        )}
      </div>

      {/* Event Detail Drawer */}
      {selectedEvent && (
        <Drawer
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={`Transaction ${selectedEvent.tx_id.slice(0, 12)}...`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Block</dt>
                <dd className="mt-1 text-sm text-gray-900">{selectedEvent.block}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Round</dt>
                <dd className="mt-1 text-sm text-gray-900">{selectedEvent.round}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 capitalize">
                    {selectedEvent.event_type.replace('_', ' ')}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Timestamp</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(selectedEvent.timestamp), 'PPpp')} UTC
                </dd>
              </div>
              {selectedEvent.tenant_id && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tenant</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedEvent.tenant_id}</dd>
                </div>
              )}
              {selectedEvent.contract_id && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Contract</dt>
                  <dd className="mt-1 text-sm font-mono text-gray-900">
                    {selectedEvent.contract_id}
                  </dd>
                </div>
              )}
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 mb-2">Transaction ID</dt>
              <dd className="text-sm font-mono text-gray-900 break-all">{selectedEvent.tx_id}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 mb-2">Raw Transaction Data</dt>
              <pre className="rounded-md bg-gray-50 p-4 text-xs text-gray-900 overflow-auto">
                {JSON.stringify(selectedEvent.raw_tx_data, null, 2)}
              </pre>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}
