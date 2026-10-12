'use client'

/**
 * Keys & Vault - User-only keys per escra-frontend-enhancement-plan.md
 * Keys belong to users (not organizations), removed "Create Key" button
 */

import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusChip } from '@/components/shared/StatusChip'
import { Pagination } from '@/components/shared/Pagination'
import { KPICard } from '@/components/shared/KPICard'
import { Drawer } from '@/components/shared/Drawer'
import { CopyButton } from '@/components/shared/CopyButton'
import { Key, KeyType, KeyStatus, Tenant, TenantStatus, UserStatus } from '@/types'
import { getUserVerificationStatus } from '@/utils/verification'
import { IconKey, IconKeyOff } from '@tabler/icons-react'

// Helper function to get role badge colors
function getRoleBadgeColors(role: string): { bg: string; text: string } {
  const roleLower = role.toLowerCase()
  switch (roleLower) {
    case 'admin':
      return { bg: 'bg-purple-100', text: 'text-purple-800' }
    case 'editor':
      return { bg: 'bg-blue-100', text: 'text-blue-800' }
    case 'viewer':
      return { bg: 'bg-green-100', text: 'text-green-800' }
    case 'auditor':
      return { bg: 'bg-orange-100', text: 'text-orange-800' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' }
  }
}

export default function KeysPage() {
  const [page, setPage] = useState(1)
  const [selectedKey, setSelectedKey] = useState<Key | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [tenantFilter, setTenantFilter] = useState<string[]>([])
  const [tenantSearch, setTenantSearch] = useState<string>('')
  const [showTenantDropdown, setShowTenantDropdown] = useState(false)
  const tenantDropdownRef = useRef<HTMLDivElement>(null)
  const [userFilter, setUserFilter] = useState<string[]>([])
  const [userSearch, setUserSearch] = useState<string>('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const [dateRangeStart, setDateRangeStart] = useState<string>('')
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('')
  const [search, setSearch] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['keys', page, typeFilter, statusFilter],
    queryFn: () =>
      apiClient.listKeys({
        page,
        page_size: 1000, // Get more to filter client-side
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  })

  // Fetch tenants for the organization filter
  const { data: tenantsData } = useQuery({
    queryKey: ['tenants-for-keys-filter'],
    queryFn: () => apiClient.listTenants({ page_size: 1000 }),
  })

  // Fetch users for the user name column
  const { data: usersData } = useQuery({
    queryKey: ['users-for-keys-table'],
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

  const allKeys = data?.items || []
  // Client-side filtering for multiselect filters
  // Also filter to only show keys for users who meet criteria (active tenant, active user, approved verification)
  const keys = allKeys.filter((key) => {
    if (tenantFilter.length > 0 && !tenantFilter.includes(key.tenant_id)) return false
    if (userFilter.length > 0 && !userFilter.includes(key.user_id)) return false
    
    // Only show keys for qualifying users:
    // 1. User exists and is active
    // 2. User verification status is approved
    // 3. Tenant is active
    const user = usersData?.items?.find((u: any) => u.escra_public_user_id === key.user_id)
    if (!user || user.status !== UserStatus.ACTIVE) {
      return false
    }
    
    const verificationStatus = getUserVerificationStatus(user)
    if (verificationStatus !== 'approved') {
      return false
    }
    
    const tenant = tenantsData?.items?.find((t: Tenant) => t.escra_public_org_id === key.tenant_id)
    if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
      return false
    }
    
    // Filter by role
    if (roleFilter !== 'all') {
      const user = usersData?.items?.find((u: any) => u.escra_public_user_id === key.user_id)
      if (!user || !user.roles || !user.roles.includes(roleFilter)) {
        return false
      }
    }
    
    // Filter by date range
    if (dateRangeStart || dateRangeEnd) {
      const keyDate = key.created_at ? new Date(key.created_at) : null
      if (keyDate) {
        if (dateRangeStart && keyDate < new Date(dateRangeStart)) {
          return false
        }
        if (dateRangeEnd) {
          const endDate = new Date(dateRangeEnd)
          endDate.setHours(23, 59, 59, 999) // Include the entire end date
          if (keyDate > endDate) {
            return false
          }
        }
      } else {
        return false // Exclude keys without dates if date filter is active
      }
    }
    
    // Filter by search (user name/ID, organization name/ID)
    if (search) {
      const searchLower = search.toLowerCase().trim()
      if (searchLower) {
        // Search by user ID
        const userIdMatch = key.user_id?.toLowerCase().includes(searchLower) || false
        
        // Search by user name
        const user = usersData?.items?.find((u: any) => u.escra_public_user_id === key.user_id)
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
        
        // Search by organization ID
        const orgIdMatch = key.tenant_id?.toLowerCase().includes(searchLower) || false
        
        // Search by organization name
        const tenant = tenantsData?.items?.find((t: Tenant) => t.escra_public_org_id === key.tenant_id)
        const orgNameMatch = tenant?.name?.toLowerCase().includes(searchLower) || false
        
        if (!userIdMatch && !userNameMatch && !orgIdMatch && !orgNameMatch) {
          return false
        }
      }
    }
    
    return true
  })
  const activeKeys = keys.filter(k => k.status === KeyStatus.ACTIVE).length
  const revokedKeys = keys.filter(k => k.status === KeyStatus.REVOKED).length

  const columns: Column<Key>[] = [
    {
      key: 'name',
      header: 'Key Name',
      sortable: true,
      render: (key) => <span className="text-sm font-medium text-gray-900">{key.name}</span>,
    },
    {
      key: 'wallet_address',
      header: 'Public Key',
      render: (key) => {
        if (!key.wallet_address) return <span className="text-sm text-gray-500">N/A</span>
        const truncated = key.wallet_address.length > 12
          ? `${key.wallet_address.slice(0, 6)}...${key.wallet_address.slice(-6)}`
          : key.wallet_address
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gray-900">{truncated}</span>
            <CopyButton text={key.wallet_address} />
          </div>
        )
      },
    },
    {
      key: 'user',
      header: 'User',
      render: (key) => {
        const user = usersData?.items?.find((u: any) => u.escra_public_user_id === key.user_id)
        const userName = user 
          ? (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email || 'N/A')
          : 'N/A'
        return (
          <div className="text-sm text-gray-900">
            <div>{userName}</div>
            {key.user_id && (
              <div className="text-xs text-gray-500 font-mono">{key.user_id}</div>
            )}
          </div>
        )
      },
    },
    {
      key: 'organization',
      header: 'Organization',
      render: (key) => {
        const tenant = tenantsData?.items?.find((t: Tenant) => t.escra_public_org_id === key.tenant_id)
        return (
          <div className="text-sm text-gray-900">
            {tenant?.name ? (
              <>
                <div>{tenant.name}</div>
                <div className="text-xs text-gray-500 font-mono">{key.tenant_id || 'N/A'}</div>
              </>
            ) : (
              <div className="font-mono">{key.tenant_id || 'N/A'}</div>
            )}
          </div>
        )
      },
    },
    {
      key: 'role',
      header: 'Role',
      render: (key) => {
        const user = usersData?.items?.find((u: any) => u.escra_public_user_id === key.user_id)
        if (!user || !user.roles || user.roles.length === 0) {
          return <span className="text-sm text-gray-500">N/A</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {user.roles.slice(0, 2).map((role: string) => {
              const colors = getRoleBadgeColors(role)
              return (
                <span
                  key={role}
                  className={`inline-flex items-center rounded ${colors.bg} px-2 py-0.5 text-xs font-medium ${colors.text}`}
                >
                  {role}
                </span>
              )
            })}
            {user.roles.length > 2 && (
              <span className="text-xs text-gray-500">+{user.roles.length - 2}</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'type',
      header: 'Key Type',
      sortable: true,
      render: (key) => {
        const formatKeyType = (type: string) => {
          if (type === 'api') return 'API'
          return type.charAt(0).toUpperCase() + type.slice(1)
        }
        return (
          <span className="text-sm text-gray-900">{formatKeyType(key.type)}</span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (key) => <StatusChip status={key.status} />,
    },
    {
      key: 'last_used_at',
      header: 'Last Used',
      sortable: true,
      render: (key) => (
        <span className="text-sm text-gray-900">
          {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      sortable: true,
      render: (key) => (
        <span className="text-sm text-gray-900">
          {new Date(key.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (key) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Implement rekey functionality
              alert('Mock: Rekey action')
            }}
            className="text-primary-600 hover:text-primary-900 transition-colors"
            title="Rekey"
          >
            <IconKey className="w-5 h-5" />
          </button>
          {key.status === KeyStatus.ACTIVE && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                // Mock action - revoke key
                alert('Mock: Revoke key action')
              }}
              className="text-red-600 hover:text-red-900 transition-colors"
              title="Revoke"
            >
              <IconKeyOff className="w-5 h-5" />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Keys & Vault</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage user cryptographic keys and vault mappings
        </p>
      </div>

      {/* KPI Strip */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <KPICard title="Total Keys" value={data?.total || 0} subtitle="All keys" />
        <KPICard title="Active Keys" value={activeKeys} subtitle="Currently active" />
        <KPICard title="Revoked Keys" value={revokedKeys} subtitle="Revoked keys" />
        <KPICard
          title="Signing Keys"
          value={keys.filter(k => k.type === KeyType.SIGNING).length}
          subtitle="Signing keys"
        />
      </div>

      {/* Tabs, Filters & Table Container */}
      <div
        className="mb-6 rounded-lg bg-white p-6"
        style={{
          boxShadow:
            '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
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
            {Object.values(KeyStatus).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`
                  whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium
                  ${
                    statusFilter === status
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }
                `}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-4">
          <div className="w-full sm:flex-1 sm:min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700">Key Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
            >
              <option value="all">All</option>
              {Object.values(KeyType).map((type) => {
                const formatKeyType = (t: string) => {
                  if (t === 'api') return 'API'
                  return t.charAt(0).toUpperCase() + t.slice(1)
                }
                return (
                  <option key={type} value={type}>
                    {formatKeyType(type)}
                  </option>
                )
              })}
            </select>
          </div>
          <div className="w-full sm:flex-1 sm:min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
            >
              <option value="all">All</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
              <option value="auditor">Auditor</option>
              <option value="org_admin">Org Admin</option>
            </select>
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user name or ID & organization name or ID..."
            className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-400 py-2 px-3"
          />
        </div>

        {/* Table */}
        <div className="rounded-lg bg-white overflow-hidden" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <DataTable
            columns={columns}
            data={keys}
            loading={isLoading}
            onRowClick={(key) => setSelectedKey(key)}
            emptyMessage="No keys found"
          />
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
      </div>

      {/* Key Detail Drawer */}
      {selectedKey && (
        <Drawer
          isOpen={!!selectedKey}
          onClose={() => setSelectedKey(null)}
          title={selectedKey.name}
          size="lg"
        >
          <div className="space-y-6">
            {/* Key Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Key ID</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900">{selectedKey.key_id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">User ID</dt>
                <dd className="mt-1 text-sm font-mono text-gray-900">
                  {selectedKey.user_id || 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Type</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {selectedKey.type === 'api' ? 'API' : selectedKey.type.charAt(0).toUpperCase() + selectedKey.type.slice(1)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <StatusChip status={selectedKey.status} />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Tenant</dt>
                <dd className="mt-1 text-sm text-gray-900">{selectedKey.tenant_id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Algorithm</dt>
                <dd className="mt-1 text-sm text-gray-900">{selectedKey.algorithm}</dd>
              </div>
            </div>

            {/* Vault Mapping */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Vault Mapping</h3>
              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vault Path</dt>
                  <dd className="mt-1 text-sm font-mono text-gray-900">
                    {selectedKey.vault_path || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vault Policy</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {selectedKey.vault_policy || 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Wallet Address (if applicable) */}
            {selectedKey.wallet_address && (
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-2">Wallet Address</dt>
                <dd className="text-sm font-mono text-gray-900">{selectedKey.wallet_address}</dd>
              </div>
            )}

            {/* Lifecycle */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Lifecycle</h3>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(selectedKey.created_at).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last Used</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {selectedKey.last_used_at
                      ? new Date(selectedKey.last_used_at).toLocaleString()
                      : 'Never'}
                  </dd>
                </div>
                {selectedKey.expires_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Expires</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(selectedKey.expires_at).toLocaleString()}
                    </dd>
                  </div>
                )}
                {selectedKey.revoked_at && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Revoked</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(selectedKey.revoked_at).toLocaleString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* KPIs - Mock data for key activity */}
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Activity Metrics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900">247</div>
                  <div className="text-xs text-gray-500">Contracts Signed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">1,234</div>
                  <div className="text-xs text-gray-500">Documents Signed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedKey.last_used_at
                      ? new Date(selectedKey.last_used_at).toLocaleDateString()
                      : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">Last Signature</div>
                </div>
              </div>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}
