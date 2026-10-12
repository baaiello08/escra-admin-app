'use client'

/**
 * Identity - Enhanced onboarding dashboard per escra-frontend-enhancement-plan.md
 * Repositioned in nav directly under Tenants and Users
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusChip } from '@/components/shared/StatusChip'
import { Pagination } from '@/components/shared/Pagination'
import { KPICard } from '@/components/shared/KPICard'
import { Drawer } from '@/components/shared/Drawer'
import { PersonaVerification, PersonaVerificationStatus, Tenant, User } from '@/types'
import { IconEye, IconChevronDown } from '@tabler/icons-react'
import { getTenantVerificationStatus } from '@/utils/verification'

// Helper function to format Inquiry ID (already formatted as INQ-XXXX)
function formatInquiryId(inquiryId: string): string {
  // Public IDs are already formatted, just return as-is
  return inquiryId
}

// Helper to format verification type (KYC / KYB)
function formatVerificationType(type?: string): string {
  if (!type) return 'KYC'
  const lower = type.toLowerCase()
  if (lower === 'kyc') return 'KYC'
  if (lower === 'kyb') return 'KYB'
  // Fallback: capitalize generic string
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

// Helper to get mock cost per inquiry (per-event display string)
function getInquiryCost(inquiry: PersonaVerification): string {
  const type = inquiry.verification_type?.toLowerCase()
  // Pricing model:
  // - Base plan: $250/month for first 500 KYC → $0.50 effective per KYC
  // - Additional KYC beyond 500: $1.50 per verification (not reflected per-row here)
  // - KYB add-on services: $1.875 per attempt
  if (type === 'kyb') return '$1.875'
  if (type === 'kyc') return '$0.50'
  return '$0.00'
}

export default function IdentityPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [selectedInquiry, setSelectedInquiry] = useState<PersonaVerification | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [riskFilter, setRiskFilter] = useState<string>('all')
  const [tenantFilter, setTenantFilter] = useState<string[]>([])
  const [userFilter, setUserFilter] = useState<string[]>([])
  const [dateRangeStart, setDateRangeStart] = useState<string>('')
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('')
  const [globalSearch, setGlobalSearch] = useState<string>('')
  const [costTimeFilter, setCostTimeFilter] = useState<string>('1m')
  const [supplementalTimeFilter, setSupplementalTimeFilter] = useState<string>('all')
  
  // Search states for tenant filter
  const [tenantSearch, setTenantSearch] = useState<string>('')
  const [showTenantDropdown, setShowTenantDropdown] = useState(false)
  const tenantDropdownRef = useRef<HTMLDivElement>(null)
  
  // Search states for user filter
  const [userSearch, setUserSearch] = useState<string>('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement>(null)

  // Fetch tenants for the organization filter
  const { data: tenantsData } = useQuery({
    queryKey: ['tenants-for-identity-filter'],
    queryFn: () => apiClient.listTenants({ page_size: 1000 }),
  })

  // Fetch users for search
  const { data: usersData } = useQuery({
    queryKey: ['users-for-identity-search'],
    queryFn: () => apiClient.listUsers({ page_size: 1000 }),
  })

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tenantDropdownRef.current && !tenantDropdownRef.current.contains(event.target as Node)) {
        setShowTenantDropdown(false)
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['persona-inquiries', page, statusFilter, typeFilter, riskFilter, tenantFilter],
    queryFn: () => apiClient.listPersonaInquiries({ page, page_size: 20 }),
  })

  const inquiries = data?.items || []
  const filteredInquiries = inquiries.filter((inquiry) => {
    if (statusFilter === 'all') {
      // All - no filter
    } else if (statusFilter === 'failed') {
      // Failed only matches failed (or declined which maps to failed)
      const inquiryStatus = inquiry.status?.toLowerCase() || ''
      if (inquiryStatus !== 'failed' && inquiryStatus !== 'declined') {
        return false
      }
    } else if (statusFilter === PersonaVerificationStatus.PENDING) {
      // Pending matches both pending and action_required
      const inquiryStatus = inquiry.status?.toLowerCase() || ''
      if (inquiryStatus !== 'pending' && inquiryStatus !== 'action_required') {
        return false
      }
    } else if (inquiry.status !== statusFilter) {
      return false
    }
    
    // Verification type filter
    if (typeFilter !== 'all') {
      const inquiryType = inquiry.verification_type?.toLowerCase() || ''
      if (inquiryType !== typeFilter.toLowerCase()) return false
    }
    
    if (riskFilter !== 'all') {
      if (riskFilter === 'with_risk' && inquiry.risk_signals.length === 0) return false
      if (riskFilter === 'no_risk' && inquiry.risk_signals.length > 0) return false
    }
    
    // Organization filter
    if (tenantFilter.length > 0 && !tenantFilter.includes(inquiry.tenant_id)) return false
    
    // User filter
    if (userFilter.length > 0 && !userFilter.includes(inquiry.user_id)) return false
    
    // Date range filter
    if (dateRangeStart || dateRangeEnd) {
      const inquiryDate = inquiry.created_at_persona ? new Date(inquiry.created_at_persona) : (inquiry.created_at ? new Date(inquiry.created_at) : null)
      if (inquiryDate) {
        if (dateRangeStart && inquiryDate < new Date(dateRangeStart)) {
          return false
        }
        if (dateRangeEnd) {
          const endDate = new Date(dateRangeEnd)
          endDate.setHours(23, 59, 59, 999) // Include the entire end date
          if (inquiryDate > endDate) {
            return false
          }
        }
      } else {
        return false // Exclude inquiries without dates if date filter is active
      }
    }
    
    // Global search filter
    if (globalSearch) {
      const searchLower = globalSearch.toLowerCase().trim()
      if (!searchLower) return true
      
      // Search inquiry ID
      const inquiryIdMatch = inquiry.inquiry_id?.toLowerCase().includes(searchLower) || false
      
      // Search user ID or user name
      const user = usersData?.items?.find((u: User) => u.escra_public_user_id === inquiry.user_id)
      const userIdMatch = inquiry.user_id?.toLowerCase().includes(searchLower) || false
      let userNameMatch = false
      if (user) {
        const fullName = user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}`.toLowerCase()
          : ''
        const firstName = user.first_name?.toLowerCase() || ''
        const lastName = user.last_name?.toLowerCase() || ''
        const email = user.email?.toLowerCase() || ''
        const searchParts = searchLower.split(/\s+/).filter(part => part.length > 0)
        
        if (searchParts.length === 1) {
          userNameMatch = firstName.includes(searchParts[0]) || 
                         lastName.includes(searchParts[0]) ||
                         fullName.includes(searchParts[0]) ||
                         email.includes(searchParts[0])
        } else {
          userNameMatch = searchParts.every(part => 
            firstName.includes(part) || 
            lastName.includes(part) ||
            fullName.includes(part) ||
            email.includes(part)
          )
        }
      }
      
      // Search organization ID or name
      const tenant = tenantsData?.items?.find((t: Tenant) => t.escra_public_org_id === inquiry.tenant_id)
      const orgIdMatch = inquiry.tenant_id?.toLowerCase().includes(searchLower) || false
      const orgNameMatch = tenant?.name?.toLowerCase().includes(searchLower) || false
      
      if (!inquiryIdMatch && !userIdMatch && !userNameMatch && !orgIdMatch && !orgNameMatch) {
        return false
      }
    }
    
    return true
  })

  // Helper function to get date range based on time filter
  const getCostTimeFilterDate = useMemo(() => {
    const now = new Date()
    switch (costTimeFilter) {
      case '1m':
        // Last month (30 days ago)
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case '3m':
        // Last 3 months (90 days ago)
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      case '6m':
        // Last 6 months (180 days ago)
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
      case '1y':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      case '2y':
        return new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000)
      default:
        return null
    }
  }, [costTimeFilter])

  const getSupplementalTimeFilterDate = useMemo(() => {
    const now = new Date()
    switch (supplementalTimeFilter) {
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
  }, [supplementalTimeFilter])

  // Filter inquiries by time for cost calculation
  const costFilteredInquiries = useMemo(() => {
    if (!getCostTimeFilterDate) return inquiries
    return inquiries.filter((inquiry) => {
      const inquiryDate = new Date(inquiry.created_at_persona || inquiry.created_at)
      return inquiryDate >= getCostTimeFilterDate
    })
  }, [inquiries, getCostTimeFilterDate])

  const supplementalFilteredInquiries = useMemo(() => {
    if (!getSupplementalTimeFilterDate) return inquiries
    return inquiries.filter((inquiry) => {
      const inquiryDate = new Date(inquiry.created_at_persona || inquiry.created_at)
      return inquiryDate >= getSupplementalTimeFilterDate
    })
  }, [inquiries, getSupplementalTimeFilterDate])

  // Cost aggregation for stat boxes
  const kycCount = costFilteredInquiries.filter(i => ((i as any).verification_type || (i.metadata as any)?.verification_type || '').toLowerCase() === 'kyc').length
  const kybCount = costFilteredInquiries.filter(i => ((i as any).verification_type || (i.metadata as any)?.verification_type || '').toLowerCase() === 'kyb').length
  const kycBeyondIncluded = Math.max(0, kycCount - 500)
  const supplementalKycCost = kycBeyondIncluded * 1.5
  const supplementalKybCost = kybCount * 1.875
  const supplementalTotal = supplementalKycCost + supplementalKybCost
  
  // Calculate base cost multiplier based on time filter
  const baseCostMultiplier = useMemo(() => {
    switch (costTimeFilter) {
      case '1m':
        return 1 // Last month = 1 month
      case '3m':
        return 3 // Last 3 months = 3 months
      case '6m':
        return 6 // Last 6 months = 6 months
      case '1y':
        return 12 // Last year = 12 months
      case '2y':
        return 24 // Last 2 years = 24 months
      default:
        return 1
    }
  }, [costTimeFilter])
  
  const baseCost = 250 * baseCostMultiplier
  const totalMonthlyCost = baseCost + supplementalTotal

  // Supplemental usage calculations (filtered by supplementalTimeFilter)
  const supplementalKycCount = supplementalFilteredInquiries.filter(i => ((i as any).verification_type || (i.metadata as any)?.verification_type || '').toLowerCase() === 'kyc').length
  const supplementalKybCount = supplementalFilteredInquiries.filter(i => ((i as any).verification_type || (i.metadata as any)?.verification_type || '').toLowerCase() === 'kyb').length
  const supplementalKycBeyondIncluded = Math.max(0, supplementalKycCount - 500)
  const supplementalUsageKycCost = supplementalKycBeyondIncluded * 1.5
  const supplementalUsageKybCost = supplementalKybCount * 1.875
  const supplementalUsageTotal = supplementalUsageKycCost + supplementalUsageKybCost

  const columns: Column<PersonaVerification>[] = [
    {
      key: 'inquiry_id',
      header: 'Inquiry ID',
      sortable: true,
      render: (inquiry) => (
        <span className="font-medium text-sm text-gray-900">
          {formatInquiryId(inquiry.inquiry_id)?.toUpperCase() || 'N/A'}
        </span>
      ),
    },
    {
      key: 'user_id',
      header: 'User',
      render: (inquiry) => {
        // For KYB (organization verification), show "-" instead of user info
        const verificationType = ((inquiry as any).verification_type || (inquiry.metadata as any)?.verification_type || '').toLowerCase()
        if (verificationType === 'kyb') {
          return <span className="text-sm text-gray-500">-</span>
        }
        
        // For KYC (user verification), show user info
        const user = usersData?.items?.find((u: User) => u.escra_public_user_id === inquiry.user_id)
        const userName = user ? (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email) : null
        return (
          <div className="flex flex-col">
            <span className="text-sm font-mono text-gray-900">
              {inquiry.user_id || 'N/A'}
            </span>
            {userName && (
              <span className="text-xs text-gray-500 mt-0.5">
                {userName}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'tenant_id',
      header: 'Organization',
      render: (inquiry) => {
        const tenant = tenantsData?.items?.find((t: Tenant) => t.escra_public_org_id === inquiry.tenant_id)
        const orgName = tenant?.name
        return (
          <div className="flex flex-col">
            <span className="text-sm font-mono text-gray-900">
              {inquiry.tenant_id || 'N/A'}
            </span>
            {orgName && (
              <span className="text-xs text-gray-500 mt-0.5">
                {orgName}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'verification_type',
      header: 'Type',
      render: (inquiry) => (
        <span className="text-sm text-gray-900">
          {formatVerificationType(inquiry.verification_type)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Verification Status',
      sortable: true,
      render: (inquiry) => {
        // For KYB (organization verification), use tenant verification status
        // For KYC (user verification), use inquiry status
        const verificationType = ((inquiry as any).verification_type || (inquiry.metadata as any)?.verification_type || '').toLowerCase()
        
        if (verificationType === 'kyb') {
          // For KYB, check the tenant's verification status
          const tenant = tenantsData?.items?.find((t: Tenant) => t.escra_public_org_id === inquiry.tenant_id)
          if (tenant) {
            const tenantVerificationStatus = getTenantVerificationStatus(tenant)
            return <StatusChip status={tenantVerificationStatus} />
          }
        }
        
        // For KYC or if tenant not found, use inquiry status
        return <StatusChip status={inquiry.status} />
      },
    },
    {
      key: 'verification_level',
      header: 'Level',
      render: (inquiry) => (
        <span className="text-sm text-gray-900 capitalize">{inquiry.verification_level}</span>
      ),
    },
    {
      key: 'risk_signals',
      header: 'Risk Signals',
      render: (inquiry) => (
        <div className="flex flex-wrap gap-1">
          {inquiry.risk_signals.length > 0 ? (
            inquiry.risk_signals.slice(0, 2).map((signal) => (
              <span
                key={signal}
                className="inline-flex items-center rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800"
              >
                {signal}
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-400">N/A</span>
          )}
          {inquiry.risk_signals.length > 2 && (
            <span className="text-xs text-gray-500">+{inquiry.risk_signals.length - 2}</span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (inquiry) => (
        <span className="text-sm text-gray-900">
          {new Date(inquiry.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Cost',
      render: (inquiry) => (
        <span
          className="text-sm text-gray-900"
          title={
            inquiry.verification_type?.toLowerCase() === 'kyc'
              ? 'First 500 KYC verifications/month included in $250 plan; then $1.50 per KYC'
              : inquiry.verification_type?.toLowerCase() === 'kyb'
              ? 'KYB add-on services billed at $1.875 per attempt'
              : undefined
          }
        >
          {getInquiryCost(inquiry)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (inquiry) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setSelectedInquiry(inquiry)
          }}
          className="text-primary-600 hover:text-primary-900"
          aria-label="View inquiry"
          title="View"
        >
          <IconEye className="h-4 w-4" />
        </button>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Identity</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage identity verification, onboarding, and KYC/KYB processes
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="mb-6 space-y-4">
        {/* First Row */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KPICard title="Total Inquiries" value={data?.total || 0} subtitle="All verifications" />
          <KPICard
            title="Active Onboardings"
            value={inquiries.filter(i => i.status === PersonaVerificationStatus.PENDING || i.status === PersonaVerificationStatus.ACTION_REQUIRED).length}
            subtitle="In progress"
          />
          <KPICard
            title="Approved"
            value={inquiries.filter(i => i.status === PersonaVerificationStatus.APPROVED).length}
            subtitle="Completed"
          />
          <KPICard
            title="With Risk Signals"
            value={inquiries.filter(i => i.risk_signals.length > 0).length}
            subtitle="Flagged inquiries"
          />
        </div>
        {/* Second Row - Cost boxes under Total Inquiries */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div
            className="rounded-lg bg-white p-6"
            style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          >
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-500">Total Cost</div>
              <div className="relative">
                <select
                  value={costTimeFilter}
                  onChange={(e) => setCostTimeFilter(e.target.value)}
                  className="appearance-none rounded border border-gray-200 bg-white px-2 py-1 pr-6 text-xs text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="1m">Last Month</option>
                  <option value="3m">Last 3 months</option>
                  <option value="6m">Last 6 months</option>
                  <option value="1y">Last year</option>
                  <option value="2y">Last 2 years</option>
                </select>
                <IconChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-bold text-gray-900">${totalMonthlyCost.toFixed(2)}</div>
            </div>
            <div className="mt-1 text-xs text-gray-500">Base ${baseCost.toFixed(2)} + supplemental</div>
          </div>
          <div
            className="rounded-lg bg-white p-6"
            style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          >
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium text-gray-500">Supplemental Inquiries</div>
              <div className="relative">
                <select
                  value={supplementalTimeFilter}
                  onChange={(e) => setSupplementalTimeFilter(e.target.value)}
                  className="appearance-none rounded border border-gray-200 bg-white px-2 py-1 pr-6 text-xs text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="all">All Time</option>
                  <option value="1w">Last week</option>
                  <option value="2w">Last 2 weeks</option>
                  <option value="1m">Last month</option>
                  <option value="6m">Last 6 months</option>
                  <option value="1y">Last year</option>
                  <option value="2y">Last 2 years</option>
                </select>
                <IconChevronDown className="pointer-events-none absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-3xl font-bold text-gray-900">${supplementalUsageTotal.toFixed(3)}</div>
              <div className="mt-2 space-y-1">
                <div className="text-xs text-gray-600">
                  {supplementalKycBeyondIncluded > 0 ? (
                    <span>{supplementalKycBeyondIncluded} KYC over 500 × $1.50 = ${supplementalUsageKycCost.toFixed(3)}</span>
                  ) : (
                    <span className="text-gray-400">0 KYC over 500 (included)</span>
                  )}
                </div>
                <div className="text-xs text-gray-600">
                  {supplementalKybCount > 0 ? (
                    <span>{supplementalKybCount} KYB × $1.875 = ${supplementalUsageKybCost.toFixed(3)}</span>
                  ) : (
                    <span className="text-gray-400">0 KYB</span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-1 text-xs text-gray-500">Additional billable checks</div>
          </div>
        </div>
      </div>

      {/* Tabs, Filters & Table Container */}
      <div
        className="mb-6 rounded-lg bg-white p-6"
        style={{
          boxShadow:
            '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Institutional/Personal Toggle */}
        <div className="mb-4 flex items-center gap-4">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                typeFilter === 'all'
                  ? 'bg-primary-50 text-primary-700 border-primary-500 z-10'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('kyb')}
              className={`px-4 py-2 text-sm font-medium border-t border-b ${
                typeFilter === 'kyb'
                  ? 'bg-primary-50 text-primary-700 border-primary-500 z-10'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Institutional
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('kyc')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                typeFilter === 'kyc'
                  ? 'bg-primary-50 text-primary-700 border-primary-500 z-10'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Personal
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setStatusFilter('all')
                setTypeFilter('all')
              }}
              className={`
                whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium
                ${
                  statusFilter === 'all'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter(PersonaVerificationStatus.PENDING)}
              className={`
                whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium
                ${
                  statusFilter === PersonaVerificationStatus.PENDING
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              Pending
            </button>
            <button
              onClick={() => setStatusFilter(PersonaVerificationStatus.APPROVED)}
              className={`
                whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium
                ${
                  statusFilter === PersonaVerificationStatus.APPROVED
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              Approved
            </button>
            <button
              onClick={() => setStatusFilter('failed')}
              className={`
                whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium
                ${
                  statusFilter === 'failed'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              Failed
            </button>
            <button
              onClick={() => setStatusFilter(PersonaVerificationStatus.EXPIRED)}
              className={`
                whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium
                ${
                  statusFilter === PersonaVerificationStatus.EXPIRED
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              Expired
            </button>
            <button
              onClick={() => setStatusFilter(PersonaVerificationStatus.CANCELED)}
              className={`
                whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium
                ${
                  statusFilter === PersonaVerificationStatus.CANCELED
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }
              `}
            >
              Canceled
            </button>
          </nav>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="w-full sm:flex-1 sm:min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700">Risk Level</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
            >
              <option value="all">All</option>
              <option value="with_risk">With Risk Signals</option>
              <option value="no_risk">No Risk</option>
            </select>
          </div>
          <div className="w-full sm:flex-1 sm:min-w-[180px] relative" ref={tenantDropdownRef}>
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
          
          <div className="w-full sm:flex-1 sm:min-w-[180px] relative" ref={userDropdownRef}>
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
                    ?.filter((user: User) => 
                      !userSearch || 
                      (user.first_name && user.first_name.toLowerCase().includes(userSearch.toLowerCase())) ||
                      (user.last_name && user.last_name.toLowerCase().includes(userSearch.toLowerCase())) ||
                      user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                      user.escra_public_user_id.toLowerCase().includes(userSearch.toLowerCase())
                    )
                    .map((user: User) => {
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
          
          <div className="w-full sm:flex-1 sm:min-w-[200px]">
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
        <div className="mb-4">
          <input
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search by user name or ID & organization name or ID..."
            className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-400 py-2 px-3"
          />
        </div>

        {/* Table */}
        <div
          className="rounded-lg bg-white overflow-hidden"
          style={{
            boxShadow:
              '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <DataTable
            columns={columns}
            data={filteredInquiries}
            loading={isLoading}
            onRowClick={(inquiry) => setSelectedInquiry(inquiry)}
            emptyMessage="No identity verification inquiries found"
          />
        </div>
        {data && (
          <Pagination
            page={page}
            totalPages={data.total_pages}
            onPageChange={setPage}
            pageSize={data.page_size}
            total={data.total}
          />
        )}
      </div>

      {/* Inquiry Detail Drawer */}
      {selectedInquiry && (
        <Drawer
          isOpen={!!selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          title={`Verification: ${formatInquiryId(selectedInquiry.inquiry_id)}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {(() => {
                const verificationType = ((selectedInquiry as any).verification_type || (selectedInquiry.metadata as any)?.verification_type || '').toLowerCase()
                const isKYB = verificationType === 'kyb'
                const user = usersData?.items?.find((u: User) => u.escra_public_user_id === selectedInquiry.user_id)
                const userName = user ? (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email) : null
                const tenant = tenantsData?.items?.find((t: Tenant) => t.escra_public_org_id === selectedInquiry.tenant_id)
                const orgName = tenant?.name
                
                if (isKYB) {
                  // KYB: Organization (left), Org Admin (right)
                  return (
                    <>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Organization</dt>
                        <dd className="mt-1">
                          <div className="flex flex-col">
                            <span className="text-sm font-mono text-gray-900">{selectedInquiry.tenant_id || 'N/A'}</span>
                            {orgName && (
                              <span className="text-xs text-gray-500 mt-0.5">{orgName}</span>
                            )}
                          </div>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Org Admin</dt>
                        <dd className="mt-1">
                          <div className="flex flex-col">
                            <span className="text-sm font-mono text-gray-900">{selectedInquiry.user_id || 'N/A'}</span>
                            {userName && (
                              <span className="text-xs text-gray-500 mt-0.5">{userName}</span>
                            )}
                          </div>
                        </dd>
                      </div>
                    </>
                  )
                } else {
                  // KYC: User (left), Organization (right)
                  return (
                    <>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">User</dt>
                        <dd className="mt-1">
                          <div className="flex flex-col">
                            <span className="text-sm font-mono text-gray-900">{selectedInquiry.user_id || 'N/A'}</span>
                            {userName && (
                              <span className="text-xs text-gray-500 mt-0.5">{userName}</span>
                            )}
                          </div>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Organization</dt>
                        <dd className="mt-1">
                          <div className="flex flex-col">
                            <span className="text-sm font-mono text-gray-900">{selectedInquiry.tenant_id || 'N/A'}</span>
                            {orgName && (
                              <span className="text-xs text-gray-500 mt-0.5">{orgName}</span>
                            )}
                          </div>
                        </dd>
                      </div>
                    </>
                  )
                }
              })()}
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  {(() => {
                    // For KYB (organization verification), use tenant verification status
                    // For KYC (user verification), use inquiry status
                    const verificationType = ((selectedInquiry as any).verification_type || (selectedInquiry.metadata as any)?.verification_type || '').toLowerCase()
                    
                    if (verificationType === 'kyb') {
                      // For KYB, check the tenant's verification status
                      const tenant = tenantsData?.items?.find((t: Tenant) => t.escra_public_org_id === selectedInquiry.tenant_id)
                      if (tenant) {
                        const tenantVerificationStatus = getTenantVerificationStatus(tenant)
                        return <StatusChip status={tenantVerificationStatus} />
                      }
                    }
                    
                    // For KYC or if tenant not found, use inquiry status
                    return <StatusChip status={selectedInquiry.status} />
                  })()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Verification Level</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">
                  {selectedInquiry.verification_level}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatVerificationType(selectedInquiry.verification_type)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(selectedInquiry.created_at).toLocaleString()}
                </dd>
              </div>
            </div>

            {selectedInquiry.risk_signals.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Risk Signals</h3>
                <div className="space-y-2">
                  {selectedInquiry.risk_signals.map((signal) => (
                    <div
                      key={signal}
                      className="rounded-lg border border-yellow-200 bg-yellow-50 p-3"
                    >
                      <div className="text-sm font-medium text-yellow-800">{signal}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Timestamps</h3>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Started</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(selectedInquiry.created_at).toLocaleString()}
                  </dd>
                </div>
                {selectedInquiry.completed_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Completed</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(selectedInquiry.completed_at).toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Document Types</h3>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">
                  Document types used: Driver's License, Passport, Government ID
                </p>
              </div>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}
