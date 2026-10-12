'use client'

/**
 * Onboarding Page - Combined view of users and tenants in onboarding status
 * Shows stat boxes and a table that can toggle between organizations/tenants and users
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusChip } from '@/components/shared/StatusChip'
import { KPICard } from '@/components/shared/KPICard'
import { Drawer } from '@/components/shared/Drawer'
import { CopyButton } from '@/components/shared/CopyButton'
import { Pagination } from '@/components/shared/Pagination'
import { User, Tenant, UserStatus, TenantStatus, TenantPlan, Key, KeyType, KeyStatus } from '@/types'
import { getUserVerificationStatus, getTenantVerificationStatus, getTenantAccountStatus } from '@/utils/verification'
import { IconUserCog, IconUserMinus, IconEdit, IconEditOff } from '@tabler/icons-react'

// Helper function to format Escra Public Organization ID (already formatted as ORG-XXXX-XXXX)
function formatOrganizationId(escraPublicOrgId: string): string {
  // Public IDs are already formatted, just return as-is
  return escraPublicOrgId
}

// Helper function to format Escra Public User ID (already formatted as USR-XXXX-XXXX)
function formatEscraUserId(escraPublicUserId: string): string {
  // Public IDs are already formatted, just return as-is
  return escraPublicUserId
}

// Helper function to get role badge colors and display names
function getRoleBadgeColors(role: string): { bg: string; text: string; displayName: string } {
  const roleLower = role.toLowerCase()
  switch (roleLower) {
    case 'admin':
      return { bg: 'bg-purple-100', text: 'text-purple-800', displayName: 'Org Admin' }
    case 'editor':
      return { bg: 'bg-blue-100', text: 'text-blue-800', displayName: 'Editor' }
    case 'viewer':
      return { bg: 'bg-green-100', text: 'text-green-800', displayName: 'Viewer' }
    case 'auditor':
      return { bg: 'bg-orange-100', text: 'text-orange-800', displayName: 'Auditor' }
    case 'org_admin':
    case 'admin_paid':
      return { bg: 'bg-gray-100', text: 'text-gray-800', displayName: 'Admin (Paid)' }
    case 'admin_trial':
      return { bg: 'bg-purple-100', text: 'text-purple-800', displayName: 'Admin (Trial)' }
    case 'admin_unpaid':
      return { bg: 'bg-gray-100', text: 'text-gray-800', displayName: 'Admin (Unpaid)' }
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', displayName: role }
  }
}

// Helper function to render copyable on-chain ID
function renderCopyableOnChainId(onChainId: number | string | null | undefined) {
  if (!onChainId) {
    return <span className="text-sm font-mono text-gray-900">N/A</span>
  }
  
  const idString = String(onChainId)
  // Truncate: show first 6 and last 6 characters for numeric IDs
  const truncated = idString.length > 12 
    ? `${idString.slice(0, 6)}...${idString.slice(-6)}`
    : idString
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono text-gray-900">{truncated}</span>
      <CopyButton text={idString} />
    </div>
  )
}

// Helper function to get plan allotments
function getPlanAllotments(plan: TenantPlan) {
  switch (plan) {
    case TenantPlan.ESSENTIAL:
      return {
        contracts: 5,
        signers: 20,
        storage: 20, // GB
      }
    case TenantPlan.PRO:
      return {
        contracts: 50,
        signers: 200,
        storage: 100, // GB
      }
    case TenantPlan.GROWTH:
      return {
        contracts: 250,
        signers: 1000,
        storage: 750, // GB
      }
    case TenantPlan.ENTERPRISE:
      return {
        contracts: null, // Unlimited
        signers: null, // Unlimited (scaled signing capacity)
        storage: 1000, // 1 TB = 1000 GB (1 TB+)
      }
    default:
      return {
        contracts: null,
        signers: null,
        storage: null,
      }
  }
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

// Countries with specific ones first, then alphabetical
const COUNTRIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Italy',
  'Spain',
  'Mexico',
  'Argentina',
  'Chile',
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Armenia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cambodia',
  'Cameroon',
  'Cape Verde',
  'Central African Republic',
  'Chad',
  'China',
  'Colombia',
  'Comoros',
  'Congo',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czech Republic',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'Gabon',
  'Gambia',
  'Georgia',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kosovo',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Korea',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Palestine',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe'
]

// Combined type for table rows
interface OnboardingRow {
  id: string
  type: 'user' | 'tenant'
  user?: User
  tenant?: Tenant
  organization_id?: string
  organization_name?: string
  user_id?: string
  user_name?: string
  user_email?: string
  status: string
  verification_status: string
  verification_type: 'KYC' | 'KYB'
  tier?: TenantPlan
}

export default function OnboardingPage() {
  const [typeFilter, setTypeFilter] = useState<'all' | 'organizations' | 'users'>('all')
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  // Tenant drawer state
  const [drawerTab, setDrawerTab] = useState<'overview' | 'users_roles' | 'kyb'>('overview')
  const [usersPage, setUsersPage] = useState(1)
  const [tenantOrgDetailsEditMode, setTenantOrgDetailsEditMode] = useState(false)
  const [tenantMailingAddressEditMode, setTenantMailingAddressEditMode] = useState(false)
  const [tenantBillingAddressEditMode, setTenantBillingAddressEditMode] = useState(false)
  
  // Tenant drawer editable fields state
  const [legalEntityName, setLegalEntityName] = useState('')
  const [primaryContactEmail, setPrimaryContactEmail] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [taxId, setTaxId] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [country, setCountry] = useState('')
  const [billingAddress1, setBillingAddress1] = useState('')
  const [billingAddress2, setBillingAddress2] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingState, setBillingState] = useState('')
  const [billingZipCode, setBillingZipCode] = useState('')
  const [billingCountry, setBillingCountry] = useState('')
  
  // User drawer state
  const [userDrawerTab, setUserDrawerTab] = useState<'profile' | 'roles' | 'identity' | 'keys' | 'security' | 'sessions'>('profile')
  const [userDetailsEditMode, setUserDetailsEditMode] = useState(false)
  const [userAddressEditMode, setUserAddressEditMode] = useState(false)
  const [userRolesEditMode, setUserRolesEditMode] = useState(false)
  const [keyNameEditMode, setKeyNameEditMode] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  
  // User drawer editable fields state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [userAddress1, setUserAddress1] = useState('')
  const [userAddress2, setUserAddress2] = useState('')
  const [userCity, setUserCity] = useState('')
  const [userState, setUserState] = useState('')
  const [userZipCode, setUserZipCode] = useState('')
  const [userCountry, setUserCountry] = useState('')
  const [userRole, setUserRole] = useState('')
  const [keyName, setKeyName] = useState('')
  
  const selectedUserRef = useRef<User | null>(null)
  const isClosingUserDrawerRef = useRef(false)
  
  // Keep ref in sync with state
  useEffect(() => {
    selectedUserRef.current = selectedUser
    if (!selectedUser && isClosingUserDrawerRef.current) {
      setTimeout(() => {
        isClosingUserDrawerRef.current = false
      }, 100)
    }
  }, [selectedUser])
  
  // Initialize tenant form fields when tenant is selected
  useEffect(() => {
    if (selectedTenant) {
      setLegalEntityName(selectedTenant.legal_entity_name || '')
      setPrimaryContactEmail(selectedTenant.primary_contact_email || '')
      setBillingEmail(selectedTenant.billing_email || '')
      setTaxId(selectedTenant.tax_id || '')
      const metadata = (selectedTenant.metadata as any) || {}
      setAddress1(metadata.address_1 || '')
      setAddress2(metadata.address_2 || '')
      setCity(metadata.city || '')
      setState(metadata.state || '')
      setZipCode(metadata.zip_code || '')
      setCountry(metadata.country || '')
      setBillingAddress1(metadata.billing_address_1 || '')
      setBillingAddress2(metadata.billing_address_2 || '')
      setBillingCity(metadata.billing_city || '')
      setBillingState(metadata.billing_state || '')
      setBillingZipCode(metadata.billing_zip_code || '')
      setBillingCountry(metadata.billing_country || '')
      setDrawerTab('overview')
    }
  }, [selectedTenant])
  
  // Initialize user form fields when user is selected
  useEffect(() => {
    if (selectedUser) {
      setFirstName(selectedUser.first_name || '')
      setLastName(selectedUser.last_name || '')
      setEmail(selectedUser.email || '')
      const metadata = (selectedUser.metadata as any) || {}
      setUserAddress1(metadata.address_1 || '')
      setUserAddress2(metadata.address_2 || '')
      setUserCity(metadata.city || '')
      setUserState(metadata.state || '')
      setUserZipCode(metadata.zip_code || '')
      setUserCountry(metadata.country || '')
      setUserRole(selectedUser.roles?.[0] || '')
      setUserDrawerTab('profile')
    }
  }, [selectedUser])

  // Fetch all users and tenants
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['onboarding-users'],
    queryFn: () => apiClient.listUsers({ page_size: 1000 }),
  })

  const { data: tenantsData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['onboarding-tenants'],
    queryFn: () => apiClient.listTenants({ page_size: 1000 }),
  })

  // Fetch tenant users for tenant drawer
  const { data: tenantUsersData, isLoading: tenantUsersLoading } = useQuery({
    queryKey: ['tenant-users', selectedTenant?.escra_public_org_id, usersPage],
    queryFn: () => apiClient.listUsers({ tenant_id: selectedTenant!.escra_public_org_id, page: usersPage, page_size: 20 }),
    enabled: !!selectedTenant && drawerTab === 'users_roles',
  })

  // Fetch all keys for tenant drawer users & roles tab
  const { data: allKeysForTenantDrawer } = useQuery({
    queryKey: ['all-keys-tenant-drawer'],
    queryFn: () => apiClient.listKeys({ page_size: 1000 }),
    enabled: !!selectedTenant && drawerTab === 'users_roles',
  })



  // Fetch user's tenant for user drawer
  const { data: userTenantData } = useQuery({
    queryKey: ['user-tenant', selectedUser?.tenant_id],
    queryFn: () => apiClient.getTenant(selectedUser!.tenant_id),
    enabled: !!selectedUser,
  })
  const userTenant = userTenantData || null

  // Fetch user keys for user drawer
  const { data: userKeysData, isLoading: userKeysLoading } = useQuery({
    queryKey: ['user-keys', selectedUser?.escra_public_user_id],
    queryFn: () => apiClient.listKeys({ page_size: 1000 }),
    enabled: !!selectedUser && userDrawerTab === 'keys',
  })

  // Filter keys by user_id
  const userKeys = useMemo(() => {
    if (!userKeysData || !selectedUser) return []
    return userKeysData.items.filter((key: Key) => key.user_id === selectedUser.escra_public_user_id)
  }, [userKeysData, selectedUser])

  // Calculate key statistics
  const activeKeysCount = useMemo(() => {
    return userKeys.filter((key: Key) => key.status === KeyStatus.ACTIVE).length
  }, [userKeys])

  const signingKeysCount = useMemo(() => {
    return userKeys.filter((key: Key) => key.type === KeyType.SIGNING).length
  }, [userKeys])

  const walletKeysCount = useMemo(() => {
    return userKeys.filter((key: Key) => key.type === KeyType.WALLET).length
  }, [userKeys])

  // Initialize key name when user keys are loaded
  useEffect(() => {
    if (userKeys.length > 0) {
      const primaryKey = userKeys.find((key: Key) => key.status === KeyStatus.ACTIVE) || userKeys[0]
      if (primaryKey) {
        setKeyName(primaryKey.name || '')
      }
    }
  }, [userKeys])



  // Determine if a user is in onboarding status
  // Only show users with account status 'onboarding'
  const isUserOnboarding = (user: User): boolean => {
    return user.status === UserStatus.ONBOARDING
  }

  // Determine if a tenant is in onboarding status
  // Check for tenants with ONBOARDING status
  const isTenantOnboarding = (tenant: Tenant): boolean => {
    return tenant.status === TenantStatus.ONBOARDING
  }

  // Filter onboarding users and tenants
  const onboardingUsers = useMemo(() => {
    return (usersData?.items || []).filter(isUserOnboarding)
  }, [usersData?.items])

  const onboardingTenants = useMemo(() => {
    return (tenantsData?.items || []).filter(isTenantOnboarding)
  }, [tenantsData?.items])

  // Create combined table rows
  const tableRows = useMemo(() => {
    const rows: OnboardingRow[] = []

    // Add tenant rows if showing all or organizations
    if (typeFilter === 'all' || typeFilter === 'organizations') {
      onboardingTenants.forEach((tenant) => {
        // Find the primary user/admin for this tenant
        const tenantUsers = onboardingUsers.filter((u) => u.tenant_id === tenant.escra_public_org_id)
        const primaryUser = tenantUsers[0] // Get first user as primary

        rows.push({
          id: `tenant-${tenant.id}`,
          type: 'tenant',
          tenant,
          organization_id: tenant.escra_public_org_id,
          organization_name: tenant.name,
          user_id: primaryUser?.escra_public_user_id,
          user_name: primaryUser
            ? primaryUser.first_name && primaryUser.last_name
              ? `${primaryUser.first_name} ${primaryUser.last_name}`
              : primaryUser.email
            : undefined,
          user_email: primaryUser?.email,
          status: getTenantAccountStatus(tenant),
          verification_status: getTenantVerificationStatus(tenant),
          verification_type: 'KYB',
          tier: tenant.plan,
        })
      })
    }

    // Add user rows if showing all or users
    if (typeFilter === 'all' || typeFilter === 'users') {
      onboardingUsers.forEach((user) => {
        const tenant = tenantsData?.items?.find((t) => t.escra_public_org_id === user.tenant_id)

        rows.push({
          id: `user-${user.id}`,
          type: 'user',
          user,
          organization_id: user.tenant_id,
          organization_name: tenant?.name,
          user_id: user.escra_public_user_id,
          user_name: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email,
          user_email: user.email,
          status: user.status,
          verification_status: getUserVerificationStatus(user),
          verification_type: 'KYC',
          tier: user.tier,
        })
      })
    }

    return rows
  }, [typeFilter, onboardingUsers, onboardingTenants, tenantsData?.items])

  // Calculate stats
  const stats = useMemo(() => {
    const totalOnboarding = onboardingUsers.length + onboardingTenants.length
    const usersPendingVerification = onboardingUsers.filter((u) => u.status === UserStatus.ONBOARDING).length
    const usersPendingPersona = onboardingUsers.filter((u) => {
      const personaStatus = (u as any).persona_verification_status
      return !personaStatus || personaStatus === 'pending' || personaStatus === 'action_required'
    }).length
    const tenantsTrial = onboardingTenants.length

    return {
      totalOnboarding,
      usersPendingVerification,
      usersPendingPersona,
      tenantsTrial,
    }
  }, [onboardingUsers, onboardingTenants])

  const columns: Column<OnboardingRow>[] = [
    {
      key: 'organization',
      header: 'Organization',
      render: (row) => {
        // KYC records show "-" in organization column
        if (row.verification_type === 'KYC') {
          return <span className="text-sm text-gray-400">-</span>
        }
        if (!row.organization_id) return <span className="text-sm text-gray-400">N/A</span>
        return (
          <div className="flex flex-col">
            <button
              onClick={async (e) => {
                e.stopPropagation()
                try {
                  const tenant = await apiClient.getTenant(row.organization_id!)
                  setSelectedTenant(tenant)
                } catch (error) {
                  console.error('Failed to fetch tenant:', error)
                }
              }}
              className="text-sm font-mono text-primary-600 hover:text-primary-900 hover:underline text-left"
            >
              {formatOrganizationId(row.organization_id)}
            </button>
            {row.organization_name && (
              <span className="text-xs text-gray-500 mt-0.5">{row.organization_name}</span>
            )}
            {row.type === 'tenant' && row.user_name && (
              <span className="text-xs text-gray-500 mt-0.5">{row.user_name}</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'user',
      header: 'User',
      width: '15%',
      render: (row) => {
        // KYB records show "-" in user column
        if (row.verification_type === 'KYB') {
          return <span className="text-sm text-gray-400">-</span>
        }
        if (!row.user_id) return <span className="text-sm text-gray-400">-</span>
        return (
          <div className="flex flex-col">
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (row.user) {
                  setSelectedUser(row.user)
                }
              }}
              className="text-sm font-mono text-primary-600 hover:text-primary-900 hover:underline text-left"
            >
              {formatEscraUserId(row.user_id)}
            </button>
            {row.user_name && <span className="text-xs text-gray-500 mt-0.5">{row.user_name}</span>}
            {row.user_email && <span className="text-xs text-gray-500 mt-0.5">{row.user_email}</span>}
          </div>
        )
      },
    },
    {
      key: 'verification_type',
      header: 'KYC/KYB',
      sortable: true,
      align: 'center',
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">
          {row.verification_type}
        </span>
      ),
    },
    {
      key: 'verification_status',
      header: (
        <div>
          <div>Verification</div>
          <div>Status</div>
        </div>
      ),
      sortable: true,
      align: 'center',
      render: (row) => {
        const status = row.verification_status
        let colorClass = 'text-gray-600'
        if (status === 'approved') {
          colorClass = 'text-green-600'
        } else if (status === 'pending') {
          colorClass = 'text-yellow-600'
        } else if (status === 'failed') {
          colorClass = 'text-red-600'
        }
        return (
          <span className={`text-sm font-medium capitalize ${colorClass}`}>
            {status}
          </span>
        )
      },
    },
    {
      key: 'tier',
      header: 'Tier',
      sortable: true,
      align: 'center',
      render: (row) => {
        if (!row.tier) return <span className="text-sm text-gray-400">N/A</span>
        return (
          <span className="text-sm font-medium text-gray-900 capitalize">
            {row.tier}
          </span>
        )
      },
    },
    {
      key: 'status',
      header: (
        <div>
          <div>Account</div>
          <div>Status</div>
        </div>
      ),
      sortable: true,
      align: 'center',
      render: (row) => <StatusChip status={row.status} />,
    },
  ]

  const isLoading = usersLoading || tenantsLoading

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Onboarding</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage users and organizations in the onboarding process
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <KPICard
          title="Total Onboarding"
          value={stats.totalOnboarding}
          subtitle={`${onboardingUsers.length} users, ${onboardingTenants.length} orgs`}
        />
        <KPICard
          title="Users Pending Verification"
          value={stats.usersPendingVerification}
          subtitle="Awaiting account verification"
        />
        <KPICard
          title="Users Pending Persona"
          value={stats.usersPendingPersona}
          subtitle="Awaiting identity verification"
        />
        <KPICard
          title="Trial Organizations"
          value={stats.tenantsTrial}
          subtitle="In trial period"
        />
      </div>

      {/* Table Container */}
      <div
        className="mb-6 rounded-lg bg-white p-6"
        style={{
          boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Toggle */}
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
              onClick={() => setTypeFilter('organizations')}
              className={`px-4 py-2 text-sm font-medium border-t border-b ${
                typeFilter === 'organizations'
                  ? 'bg-primary-50 text-primary-700 border-primary-500 z-10'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Organizations
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('users')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${
                typeFilter === 'users'
                  ? 'bg-primary-50 text-primary-700 border-primary-500 z-10'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Users
            </button>
          </div>
        </div>

        {/* Table */}
        <div
          className="rounded-lg bg-white overflow-hidden"
          style={{
            boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
        >
          <DataTable
            columns={columns}
            data={tableRows}
            loading={isLoading}
            emptyMessage="No accounts in onboarding status"
          />
        </div>
      </div>

      {/* Tenant Detail Drawer */}
      {selectedTenant && (
        <Drawer
          isOpen={!!selectedTenant}
          onClose={() => {
            if (!selectedUserRef.current && !isClosingUserDrawerRef.current) {
              setSelectedTenant(null)
              setDrawerTab('overview')
            }
          }}
          title={selectedTenant.name}
          size="3xl"
        >
          <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {(['overview', 'users_roles', 'kyb'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDrawerTab(tab)}
                    className={`
                      whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium capitalize
                      ${
                        drawerTab === tab
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }
                    `}
                  >
                    {tab === 'kyb' ? 'KYB' : tab === 'users_roles' ? 'Users & Roles' : tab}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            {drawerTab === 'overview' && (
              <div className="space-y-6">
                {/* Tenant Information */}
                <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Public Organization ID</dt>
                      <dd className="mt-1 text-sm font-mono text-gray-900">
                        {formatOrganizationId(selectedTenant.escra_public_org_id)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Private Organization ID</dt>
                      <dd className="mt-1 text-sm font-mono text-gray-900">
                        {selectedTenant.escra_private_org_id || 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Status</dt>
                      <dd className="mt-1">
                        <StatusChip status={getTenantAccountStatus(selectedTenant)} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Tier</dt>
                      <dd className="mt-1 text-sm text-gray-900 capitalize">
                        {selectedTenant.status === 'trial' 
                          ? 'Trial' 
                          : selectedTenant.plan}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Verification Level</dt>
                      <dd className="mt-1">
                        <StatusChip
                          status={(selectedTenant.metadata as any)?.verification_level || 'none'}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Verification Status</dt>
                      <dd className="mt-1">
                        <StatusChip
                          status={getTenantVerificationStatus(selectedTenant)}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Timezone</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedTenant.timezone}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Region</dt>
                      <dd className="mt-1 text-sm text-gray-900">{selectedTenant.region}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Created Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {selectedTenant.created_at ? new Date(selectedTenant.created_at).toLocaleDateString() : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Created Time</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {selectedTenant.created_at 
                          ? `${new Date(selectedTenant.created_at).toLocaleTimeString('en-US', { timeZone: 'UTC' })} UTC`
                          : 'N/A'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Organization Details */}
                <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {(selectedTenant.metadata as any)?.is_personal === true || (selectedTenant.metadata as any)?.tenant_type === 'personal'
                        ? 'Personal Details'
                        : 'Organization Details'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setTenantOrgDetailsEditMode(!tenantOrgDetailsEditMode)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title={tenantOrgDetailsEditMode ? 'Disable editing' : 'Enable editing'}
                    >
                      {tenantOrgDetailsEditMode ? (
                        <IconEditOff className="w-5 h-5" />
                      ) : (
                        <IconEdit className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <dl className="grid grid-cols-1 gap-4">
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-900">Legal Entity</dt>
                        <dd className="mt-1">
                          <input
                            type="text"
                            value={legalEntityName}
                            onChange={(e) => setLegalEntityName(e.target.value)}
                            readOnly={!tenantOrgDetailsEditMode}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                            placeholder="Not set"
                          />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-900">EIN/TIN</dt>
                        <dd className="mt-1">
                          <input
                            type="text"
                            value={taxId}
                            onChange={(e) => setTaxId(e.target.value)}
                            readOnly={!tenantOrgDetailsEditMode}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                            placeholder="Not set"
                          />
                        </dd>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-900">Primary Contact</dt>
                        <dd className="mt-1">
                          <input
                            type="email"
                            value={primaryContactEmail}
                            onChange={(e) => setPrimaryContactEmail(e.target.value)}
                            readOnly={!tenantOrgDetailsEditMode}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                            placeholder="Not set"
                          />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-900">Billing Contact</dt>
                        <dd className="mt-1">
                          <input
                            type="email"
                            value={billingEmail}
                            onChange={(e) => setBillingEmail(e.target.value)}
                            readOnly={!tenantOrgDetailsEditMode}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                            placeholder="Not set"
                          />
                        </dd>
                      </div>
                    </div>
                  </dl>
                </div>

                {/* Address */}
                <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Address</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setTenantMailingAddressEditMode(!tenantMailingAddressEditMode)
                        setTenantBillingAddressEditMode(!tenantBillingAddressEditMode)
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title={tenantMailingAddressEditMode ? 'Disable editing' : 'Enable editing'}
                    >
                      {tenantMailingAddressEditMode ? (
                        <IconEditOff className="w-5 h-5" />
                      ) : (
                        <IconEdit className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <dl className="grid grid-cols-1 gap-4">
                    {/* Mailing Address */}
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Mailing Address</h4>
                      <div className="space-y-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Address 1</dt>
                          <dd className="mt-1">
                            <input
                              type="text"
                              value={address1}
                              onChange={(e) => setAddress1(e.target.value)}
                              readOnly={!tenantMailingAddressEditMode}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                              placeholder="Not set"
                            />
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Address 2</dt>
                          <dd className="mt-1">
                            <input
                              type="text"
                              value={address2}
                              onChange={(e) => setAddress2(e.target.value)}
                              readOnly={!tenantMailingAddressEditMode}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                              placeholder="Not set"
                            />
                          </dd>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-900">City</dt>
                            <dd className="mt-1">
                              <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                readOnly={!tenantMailingAddressEditMode}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                                placeholder="Not set"
                              />
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-900">State</dt>
                            <dd className="mt-1">
                              <select
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                disabled={!tenantMailingAddressEditMode}
                                className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              >
                                <option value="">Select state</option>
                                {US_STATES.map((stateAbbr) => (
                                  <option key={stateAbbr} value={stateAbbr}>
                                    {stateAbbr}
                                  </option>
                                ))}
                              </select>
                            </dd>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-900">Zip Code</dt>
                            <dd className="mt-1">
                              <input
                                type="text"
                                value={zipCode}
                                onChange={(e) => setZipCode(e.target.value)}
                                readOnly={!tenantMailingAddressEditMode}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                                placeholder="Not set"
                              />
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-900">Country</dt>
                            <dd className="mt-1">
                              <select
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                disabled={!tenantMailingAddressEditMode}
                                className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              >
                                <option value="">Select country</option>
                                {COUNTRIES.map((countryName) => (
                                  <option key={countryName} value={countryName}>
                                    {countryName}
                                  </option>
                                ))}
                              </select>
                            </dd>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Billing Address */}
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Billing Address</h4>
                      <div className="space-y-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Address 1</dt>
                          <dd className="mt-1">
                            <input
                              type="text"
                              value={billingAddress1}
                              onChange={(e) => setBillingAddress1(e.target.value)}
                              readOnly={!tenantBillingAddressEditMode}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                              placeholder="Not set"
                            />
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Address 2</dt>
                          <dd className="mt-1">
                            <input
                              type="text"
                              value={billingAddress2}
                              onChange={(e) => setBillingAddress2(e.target.value)}
                              readOnly={!tenantBillingAddressEditMode}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                              placeholder="Not set"
                            />
                          </dd>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-900">City</dt>
                            <dd className="mt-1">
                              <input
                                type="text"
                                value={billingCity}
                                onChange={(e) => setBillingCity(e.target.value)}
                                readOnly={!tenantBillingAddressEditMode}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                                placeholder="Not set"
                              />
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-900">State</dt>
                            <dd className="mt-1">
                              <select
                                value={billingState}
                                onChange={(e) => setBillingState(e.target.value)}
                                disabled={!tenantBillingAddressEditMode}
                                className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              >
                                <option value="">Select state</option>
                                {US_STATES.map((stateAbbr) => (
                                  <option key={stateAbbr} value={stateAbbr}>
                                    {stateAbbr}
                                  </option>
                                ))}
                              </select>
                            </dd>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <dt className="text-sm font-medium text-gray-900">Zip Code</dt>
                            <dd className="mt-1">
                              <input
                                type="text"
                                value={billingZipCode}
                                onChange={(e) => setBillingZipCode(e.target.value)}
                                readOnly={!tenantBillingAddressEditMode}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                                placeholder="Not set"
                              />
                            </dd>
                          </div>
                          <div>
                            <dt className="text-sm font-medium text-gray-900">Country</dt>
                            <dd className="mt-1">
                              <select
                                value={billingCountry}
                                onChange={(e) => setBillingCountry(e.target.value)}
                                disabled={!tenantBillingAddressEditMode}
                                className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                              >
                                <option value="">Select country</option>
                                {COUNTRIES.map((countryName) => (
                                  <option key={countryName} value={countryName}>
                                    {countryName}
                                  </option>
                                ))}
                              </select>
                            </dd>
                          </div>
                        </div>
                      </div>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {drawerTab === 'users_roles' && (
              <div className="space-y-6">
                <div className="overflow-hidden rounded-lg bg-white" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <DataTable
                    columns={[
                      {
                        key: 'user_id',
                        header: 'User ID',
                        sortable: true,
                        render: (user: User) => (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedUser(user)
                            }}
                            className="text-sm font-mono text-primary-600 hover:text-primary-900 hover:underline"
                          >
                            {formatEscraUserId(user.escra_public_user_id)}
                          </button>
                        ),
                      },
                      {
                        key: 'public_key',
                        header: 'Public Key',
                        sortable: true,
                        render: (user: User) => {
                          if (user.status !== UserStatus.ACTIVE) {
                            return <span className="text-sm font-mono text-gray-900">N/A</span>
                          }
                          
                          const verificationStatus = getUserVerificationStatus(user)
                          if (verificationStatus !== 'approved') {
                            return <span className="text-sm font-mono text-gray-900">N/A</span>
                          }
                          
                          if (!selectedTenant || selectedTenant.status !== TenantStatus.ACTIVE) {
                            return <span className="text-sm font-mono text-gray-900">N/A</span>
                          }
                          
                          const userKeys = (allKeysForTenantDrawer?.items || []).filter((key: Key) => 
                            key.user_id === user.escra_public_user_id && key.status === KeyStatus.ACTIVE
                          )
                          const activeKey = userKeys.find((key: Key) => key.wallet_address) || userKeys[0]
                          const publicKey = activeKey?.wallet_address || (user as any).public_key
                          
                          if (!publicKey) {
                            return <span className="text-sm font-mono text-gray-900">N/A</span>
                          }
                          
                          const truncated = publicKey.length > 10
                            ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}`
                            : publicKey
                          
                          return (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono text-gray-900">{truncated}</span>
                              <CopyButton text={publicKey} />
                            </div>
                          )
                        },
                      },
                      {
                        key: 'name',
                        header: 'Name',
                        sortable: true,
                        render: (user: User) => (
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        ),
                      },
                      {
                        key: 'roles',
                        header: 'Roles',
                        render: (user: User) => (
                          <div className="flex flex-wrap gap-1">
                            {user.roles.slice(0, 2).map((role) => {
                              const roleInfo = getRoleBadgeColors(role)
                              return (
                                <span
                                  key={role}
                                  className={`inline-flex items-center rounded ${roleInfo.bg} px-2 py-0.5 text-xs font-medium ${roleInfo.text}`}
                                >
                                  {roleInfo.displayName}
                                </span>
                              )
                            })}
                            {user.roles.length > 2 && (
                              <span className="text-xs text-gray-500">+{user.roles.length - 2}</span>
                            )}
                            {user.roles.length === 0 && (
                              <span className="text-xs text-gray-500">No roles</span>
                            )}
                          </div>
                        ),
                      },
                      {
                        key: 'status',
                        header: (
                          <div>
                            <div>Account</div>
                            <div className="text-xs font-normal">Status</div>
                          </div>
                        ),
                        sortable: true,
                        align: 'center',
                        render: (user: User) => <StatusChip status={user.status} />,
                      },
                      {
                        key: 'verification_status',
                        header: (
                          <div>
                            <div>Verification</div>
                            <div className="text-xs font-normal">Status</div>
                          </div>
                        ),
                        sortable: true,
                        render: (user: User) => {
                          const status = getUserVerificationStatus(user)
                          
                          let colorClass = 'text-gray-600'
                          let displayStatus = status
                          if (status === 'approved') {
                            colorClass = 'text-green-600'
                            displayStatus = 'Verified'
                          } else if (status === 'pending') {
                            colorClass = 'text-yellow-600'
                            displayStatus = 'pending'
                          } else if (status === 'action_required') {
                            colorClass = 'text-red-600'
                            displayStatus = 'Action Required'
                          } else if (status === 'failed' || status === 'canceled') {
                            colorClass = 'text-red-600'
                            displayStatus = status === 'canceled' ? 'failed' : 'failed'
                          }
                          
                          return (
                            <span className={`text-sm font-bold ${status === 'action_required' ? '' : 'capitalize'} ${colorClass}`}>
                              {displayStatus}
                            </span>
                          )
                        },
                      },
                      {
                        key: 'actions',
                        header: 'Actions',
                        render: (user: User) => (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedUser(user)
                                setUserDrawerTab('profile')
                              }}
                              className="text-primary-600 hover:text-primary-900 transition-colors"
                              title="Edit"
                            >
                              <IconUserCog className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`Are you sure you want to remove ${user.first_name} ${user.last_name}?`)) {
                                  // Handle remove user
                                }
                              }}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Remove"
                            >
                              <IconUserMinus className="w-5 h-5" />
                            </button>
                          </div>
                        ),
                      },
                    ]}
                    data={tenantUsersData?.items || []}
                    loading={tenantUsersLoading}
                    emptyMessage="No users found for this tenant"
                  />
                  {tenantUsersData && (
                    <Pagination
                      page={usersPage}
                      totalPages={tenantUsersData.total_pages}
                      onPageChange={setUsersPage}
                      pageSize={tenantUsersData.page_size}
                      total={tenantUsersData.total}
                    />
                  )}
                </div>
              </div>
            )}


            {drawerTab === 'kyb' && (
              <div className="space-y-6">
                {/* Verification Details */}
                <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Verification Level</dt>
                      <dd className="mt-1">
                        <StatusChip
                          status={(selectedTenant.metadata as any)?.verification_level || 'none'}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Verification Status</dt>
                      <dd className="mt-1">
                        <StatusChip
                          status={getTenantVerificationStatus(selectedTenant)}
                        />
                      </dd>
                      <div className="mt-4">
                        <dt className="text-sm font-medium text-gray-900">Provider</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          {(selectedTenant.metadata as any)?.kyb_provider || 'Persona'}
                        </dd>
                      </div>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Risk Signals</h3>
                  {(selectedTenant.metadata as any)?.risk_signals && 
                   Array.isArray((selectedTenant.metadata as any)?.risk_signals) && 
                   (selectedTenant.metadata as any)?.risk_signals.length > 0 ? (
                    <div className="space-y-2">
                      {(selectedTenant.metadata as any).risk_signals.map((signal: string, index: number) => (
                        <div
                          key={index}
                          className="rounded-lg border border-yellow-200 bg-yellow-50 p-3"
                        >
                          <div className="text-sm font-medium text-yellow-800">{signal}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                      No risk signals detected
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Provider Information</h3>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">
                      KYB verification details will be displayed here once backend integration is complete.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Drawer>
      )}

      {/* User Detail Drawer */}
      {selectedUser && (
        <Drawer
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title={`${selectedUser.first_name || ''} ${selectedUser.last_name || ''}`.trim() || selectedUser.email}
          size="3xl"
        >
          <div className="space-y-6">
            {/* Back Button */}
            {selectedTenant && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  isClosingUserDrawerRef.current = true
                  setSelectedUser(null)
                }}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
              >
                <svg
                  className="mr-2 h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                Back to Tenant
              </button>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {(
                  [
                    'profile',
                    'roles',
                    'identity',
                    'keys',
                    'security',
                    'sessions',
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setUserDrawerTab(tab)}
                    className={`
                      whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium capitalize
                      ${
                        userDrawerTab === tab
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      }
                    `}
                  >
                    {tab === 'roles' ? 'Organizations & Roles' : tab === 'identity' ? 'KYC' : tab}
                  </button>
                ))}
              </nav>
            </div>

            {/* Profile Tab */}
            {userDrawerTab === 'profile' && (
              <div className="space-y-6">
                {/* User Information */}
                <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Public User ID</dt>
                      <dd className="mt-1 text-sm font-mono text-gray-900">
                        {formatEscraUserId(selectedUser.escra_public_user_id)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Private User ID</dt>
                      <dd className="mt-1 text-sm font-mono text-gray-900">
                        {selectedUser.escra_private_user_id || 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Status</dt>
                      <dd className="mt-1">
                        {selectedUser.status === 'pending_verification' ? (
                          <StatusChip status="inactive" />
                        ) : (
                          <StatusChip status={selectedUser.status} />
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Email Verified</dt>
                      <dd className="mt-1">
                        {selectedUser.email_verified ? (
                          <span className="text-sm text-green-600">Verified</span>
                        ) : (
                          <span className="text-sm text-red-600">Not Verified</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Verification Level</dt>
                      <dd className="mt-1">
                        <StatusChip
                          status={selectedUser.verification_level}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Verification Status</dt>
                      <dd className="mt-1">
                        <StatusChip status={getUserVerificationStatus(selectedUser)} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Tier</dt>
                      <dd className="mt-1 text-sm text-gray-900 capitalize">
                        {userTenant?.status === 'trial' 
                          ? 'Trial' 
                          : userTenant?.plan 
                            ? userTenant.plan 
                            : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Timezone</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {(selectedUser as any).timezone || (userTenant?.timezone || 'N/A')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Region</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {(selectedUser as any).region || (userTenant?.region || 'N/A')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Created Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Created Time</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {selectedUser.created_at 
                          ? `${new Date(selectedUser.created_at).toLocaleTimeString('en-US', { timeZone: 'UTC' })} UTC`
                          : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Last Login</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {selectedUser.last_login_at
                          ? new Date(selectedUser.last_login_at).toLocaleString()
                          : 'Never'}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* User Details */}
                <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">User Details</h3>
                    <button
                      type="button"
                      onClick={() => setUserDetailsEditMode(!userDetailsEditMode)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title={userDetailsEditMode ? 'Disable editing' : 'Enable editing'}
                    >
                      {userDetailsEditMode ? (
                        <IconEditOff className="w-5 h-5" />
                      ) : (
                        <IconEdit className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <dl className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-900">First Name</dt>
                        <dd className="mt-1">
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            readOnly={!userDetailsEditMode}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                            placeholder="Not set"
                          />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-900">Last Name</dt>
                        <dd className="mt-1">
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            readOnly={!userDetailsEditMode}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                            placeholder="Not set"
                          />
                        </dd>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-900">Email</dt>
                        <dd className="mt-1">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            readOnly={!userDetailsEditMode}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                            placeholder="Not set"
                          />
                        </dd>
                      </div>
                    </div>
                  </dl>
                </div>

                {/* Address */}
                <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Address</h3>
                    <button
                      type="button"
                      onClick={() => setUserAddressEditMode(!userAddressEditMode)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title={userAddressEditMode ? 'Disable editing' : 'Enable editing'}
                    >
                      {userAddressEditMode ? (
                        <IconEditOff className="w-5 h-5" />
                      ) : (
                        <IconEdit className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <dl className="grid grid-cols-1 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Address 1</dt>
                      <dd className="mt-1">
                        <input
                          type="text"
                          value={userAddress1}
                          onChange={(e) => setUserAddress1(e.target.value)}
                          readOnly={!userAddressEditMode}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                          placeholder="Not set"
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Address 2</dt>
                      <dd className="mt-1">
                        <input
                          type="text"
                          value={userAddress2}
                          onChange={(e) => setUserAddress2(e.target.value)}
                          readOnly={!userAddressEditMode}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                          placeholder="Not set"
                        />
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-900">City</dt>
                        <dd className="mt-1">
                          <input
                            type="text"
                            value={userCity}
                            onChange={(e) => setUserCity(e.target.value)}
                            readOnly={!userAddressEditMode}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                            placeholder="Not set"
                          />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-900">State</dt>
                        <dd className="mt-1">
                          <select
                            value={userState}
                            onChange={(e) => setUserState(e.target.value)}
                            disabled={!userAddressEditMode}
                            className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Select state</option>
                            {US_STATES.map((stateAbbr) => (
                              <option key={stateAbbr} value={stateAbbr}>
                                {stateAbbr}
                              </option>
                            ))}
                          </select>
                        </dd>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-900">Zip Code</dt>
                        <dd className="mt-1">
                          <input
                            type="text"
                            value={userZipCode}
                            onChange={(e) => setUserZipCode(e.target.value)}
                            readOnly={!userAddressEditMode}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-500"
                            placeholder="Not set"
                          />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-900">Country</dt>
                        <dd className="mt-1">
                          <select
                            value={userCountry}
                            onChange={(e) => setUserCountry(e.target.value)}
                            disabled={!userAddressEditMode}
                            className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                          >
                            <option value="">Select country</option>
                            {COUNTRIES.map((countryName) => (
                              <option key={countryName} value={countryName}>
                                {countryName}
                              </option>
                            ))}
                          </select>
                        </dd>
                      </div>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {/* Organizations & Roles Tab */}
            {userDrawerTab === 'roles' && (
              <div className="space-y-6">
                <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Organizations & Roles</h3>
                    <button
                      type="button"
                      onClick={() => setUserRolesEditMode(!userRolesEditMode)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title={userRolesEditMode ? 'Disable editing' : 'Enable editing'}
                    >
                      {userRolesEditMode ? (
                        <IconEditOff className="w-5 h-5" />
                      ) : (
                        <IconEdit className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Organization ID</dt>
                      <dd className="mt-1 text-sm font-mono text-gray-900">
                        {userTenant ? formatOrganizationId(userTenant.escra_public_org_id) : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Organization</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {userTenant?.name || 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Current Role</dt>
                      <dd className="mt-1">
                        <div className="flex flex-wrap gap-2">
                          {selectedUser.roles.map((role) => {
                            const roleInfo = getRoleBadgeColors(role)
                            return (
                              <span
                                key={role}
                                className={`inline-flex items-center rounded ${roleInfo.bg} px-2.5 py-0.5 text-xs font-medium ${roleInfo.text}`}
                              >
                                {roleInfo.displayName}
                              </span>
                            )
                          })}
                          {selectedUser.roles.length === 0 && (
                            <span className="text-sm text-gray-500">No roles assigned</span>
                          )}
                        </div>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Role</dt>
                      <dd className="mt-1">
                        <select
                          value={userRole}
                          onChange={(e) => setUserRole(e.target.value)}
                          disabled={!userRolesEditMode}
                          className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="">Select a role</option>
                          <option value="admin">Org Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                          <option value="auditor">Auditor</option>
                          <option value="org_admin">Admin (Paid)</option>
                          <option value="admin_trial">Admin (Trial)</option>
                          <option value="admin_unpaid">Admin (Unpaid)</option>
                        </select>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}

            {/* KYC Tab */}
            {userDrawerTab === 'identity' && (
              <div className="space-y-6">
                <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Verification Level</dt>
                      <dd className="mt-1">
                        <StatusChip
                          status={selectedUser.verification_level}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Verification Status</dt>
                      <dd className="mt-1">
                        <StatusChip status={getUserVerificationStatus(selectedUser)} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Provider</dt>
                      <dd className="mt-1 text-sm text-gray-900">Persona</dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Risk Signals</h3>
                  {selectedUser.persona_risk_signals && selectedUser.persona_risk_signals.length > 0 ? (
                    <div className="space-y-2">
                      {selectedUser.persona_risk_signals.map((signal) => (
                        <div
                          key={signal}
                          className="rounded-lg border border-yellow-200 bg-yellow-50 p-3"
                        >
                          <div className="text-sm font-medium text-yellow-800">{signal}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                      No risk signals detected
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Provider Information</h3>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-sm text-gray-600">
                      Persona verification details will be displayed here once backend integration is complete.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Keys Tab */}
            {userDrawerTab === 'keys' && (
              <div className="space-y-6">
                {/* Key Summary Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <div className="text-2xl font-bold text-gray-900">{userKeys.length}</div>
                    <div className="text-xs text-gray-500 mt-1">Total Keys</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <div className="text-2xl font-bold text-gray-900">{activeKeysCount}</div>
                    <div className="text-xs text-gray-500 mt-1">Active Keys</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <div className="text-2xl font-bold text-gray-900">{signingKeysCount}</div>
                    <div className="text-xs text-gray-500 mt-1">Signing Keys</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <div className="text-2xl font-bold text-gray-900">{walletKeysCount}</div>
                    <div className="text-xs text-gray-500 mt-1">Wallet Keys</div>
                  </div>
                </div>

                {/* Primary Public Key */}
                <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <dl className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-900 mb-2">Key Name</dt>
                        <dd className="mt-1">
                          {(() => {
                            const primaryKey = userKeys.find((key: Key) => key.status === KeyStatus.ACTIVE) || userKeys[0]
                            if (!primaryKey) {
                              return <span className="text-sm text-gray-900">N/A</span>
                            }
                            return (
                              <div className="flex items-center gap-2">
                                {keyNameEditMode ? (
                                  <input
                                    type="text"
                                    value={keyName}
                                    onChange={(e) => setKeyName(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-900"
                                    onBlur={async () => {
                                      setKeyNameEditMode(false)
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        setKeyNameEditMode(false)
                                      } else if (e.key === 'Escape') {
                                        const primaryKey = userKeys.find((key: Key) => key.status === KeyStatus.ACTIVE) || userKeys[0]
                                        if (primaryKey) {
                                          setKeyName(primaryKey.name || '')
                                        }
                                        setKeyNameEditMode(false)
                                      }
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-gray-900">{keyName || primaryKey.name}</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (keyNameEditMode) {
                                      setKeyNameEditMode(false)
                                    } else {
                                      setKeyNameEditMode(true)
                                    }
                                  }}
                                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                                  title={keyNameEditMode ? 'Save changes' : 'Edit key name'}
                                >
                                  {keyNameEditMode ? (
                                    <IconEditOff className="w-4 h-4" />
                                  ) : (
                                    <IconEdit className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            )
                          })()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-900 mb-2">Public Key</dt>
                        <dd className="mt-1">
                          {(() => {
                            // Only show public key if user meets criteria
                            if (selectedUser.status !== UserStatus.ACTIVE) {
                              return <span className="text-sm font-mono text-gray-900">N/A</span>
                            }
                            
                            const verificationStatus = getUserVerificationStatus(selectedUser)
                            if (verificationStatus !== 'approved') {
                              return <span className="text-sm font-mono text-gray-900">N/A</span>
                            }
                            
                            if (userTenant && userTenant.status !== TenantStatus.ACTIVE) {
                              return <span className="text-sm font-mono text-gray-900">N/A</span>
                            }
                            
                            const primaryKey = userKeys.find((key: Key) => key.status === KeyStatus.ACTIVE) || userKeys[0]
                            const publicKey = primaryKey?.wallet_address || (selectedUser as any).public_key
                            if (!publicKey) {
                              return <span className="text-sm font-mono text-gray-900">N/A</span>
                            }
                            
                            return (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-gray-900 break-all">{publicKey}</span>
                                <CopyButton text={publicKey} className="flex-shrink-0" />
                              </div>
                            )
                          })()}
                        </dd>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div></div>
                      <div>
                        <dt className="text-sm font-medium text-gray-900 mb-2">Security Module</dt>
                        <dd className="mt-1 space-y-1">
                          <div className="text-sm text-gray-900">
                            <span className="font-medium">HSM:</span> <span className="text-gray-600">No</span>
                          </div>
                          <div className="text-sm text-gray-900">
                            <span className="font-medium">CSM (Cloud Security Module):</span> <span className="text-gray-600">Yes</span>
                          </div>
                        </dd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div>
                        <dt className="text-sm font-medium text-gray-900 mb-1">Key Status</dt>
                        <dd className="mt-1">
                          <StatusChip status="active" size="sm" />
                        </dd>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            console.log('Rekey clicked for user:', selectedUser?.id)
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                        >
                          Rekey
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to remove this key? This action cannot be undone.')) {
                              console.log('Remove key clicked for user:', selectedUser?.id)
                            }
                          }}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-700 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                        >
                          Remove Key
                        </button>
                      </div>
                    </div>
                  </dl>
                </div>

                {/* Keys Table */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Cryptographic Keys</h3>
                  <div className="overflow-hidden rounded-lg bg-white" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <DataTable
                      columns={[
                        {
                          key: 'name',
                          header: 'Key Name',
                          sortable: true,
                          render: (key: Key) => (
                            <span className="text-sm font-medium text-gray-900">{key.name}</span>
                          ),
                        },
                        {
                          key: 'wallet_address',
                          header: 'Public Key',
                          render: (key: Key) => {
                            if (!key.wallet_address) return <span className="text-sm text-gray-500">N/A</span>
                            const truncated = key.wallet_address.length > 12
                              ? `${key.wallet_address.slice(0, 6)}...${key.wallet_address.slice(-6)}`
                              : key.wallet_address
                            return (
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-gray-900">{truncated}</span>
                                <CopyButton text={key.wallet_address!} />
                              </div>
                            )
                          },
                        },
                        {
                          key: 'type',
                          header: 'Type',
                          sortable: true,
                          render: (key: Key) => (
                            <span className="text-sm text-gray-900 capitalize">{key.type}</span>
                          ),
                        },
                        {
                          key: 'status',
                          header: 'Account Status',
                          sortable: true,
                          render: (key: Key) => <StatusChip status={key.status} />,
                        },
                        {
                          key: 'algorithm',
                          header: 'Algorithm',
                          sortable: true,
                          render: (key: Key) => (
                            <span className="text-sm text-gray-900">{key.algorithm}</span>
                          ),
                        },
                        {
                          key: 'vault_path',
                          header: 'Vault Path',
                          render: (key: Key) => {
                            if (!key.vault_path) return <span className="text-sm text-gray-500">N/A</span>
                            const truncated = key.vault_path.length > 30
                              ? `...${key.vault_path.slice(-27)}`
                              : key.vault_path
                            return (
                              <span className="text-sm font-mono text-gray-900" title={key.vault_path}>
                                {truncated}
                              </span>
                            )
                          },
                        },
                        {
                          key: 'created_at',
                          header: 'Created',
                          sortable: true,
                          render: (key: Key) => (
                            <span className="text-sm text-gray-900">
                              {new Date(key.created_at).toLocaleDateString()}
                            </span>
                          ),
                        },
                        {
                          key: 'last_used_at',
                          header: 'Last Used',
                          sortable: true,
                          render: (key: Key) => (
                            <span className="text-sm text-gray-900">
                              {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                            </span>
                          ),
                        },
                        {
                          key: 'expires_at',
                          header: 'Expires',
                          sortable: true,
                          render: (key: Key) => {
                            if (!key.expires_at) return <span className="text-sm text-gray-500">Never</span>
                            const expiresDate = new Date(key.expires_at)
                            const isExpiringSoon = expiresDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
                            return (
                              <span className={`text-sm ${isExpiringSoon ? 'text-orange-600' : 'text-gray-900'}`}>
                                {expiresDate.toLocaleDateString()}
                              </span>
                            )
                          },
                        },
                      ]}
                      data={userKeys}
                      loading={userKeysLoading}
                      emptyMessage="No keys found for this user"
                    />
                  </div>
                </div>

                {/* Recent Security Events */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Security Events</h3>
                  <div 
                    className="space-y-2 max-h-64 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded [&:hover::-webkit-scrollbar-thumb]:bg-gray-400"
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: 'transparent transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.scrollbarColor = 'rgb(156 163 175) transparent'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.scrollbarColor = 'transparent transparent'
                    }}
                  >
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">Login from new device</div>
                          <div className="text-xs text-gray-500 mt-1">2 hours ago</div>
                        </div>
                        <StatusChip status="active" size="sm" />
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">Key rotation completed</div>
                          <div className="text-xs text-gray-500 mt-1">5 days ago</div>
                        </div>
                        <StatusChip status="approved" size="sm" />
                      </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">API key accessed from new IP</div>
                          <div className="text-xs text-gray-500 mt-1">1 week ago</div>
                        </div>
                        <StatusChip status="pending" size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {userDrawerTab === 'security' && (
              <div className="space-y-6">
                {/* Two-Factor Authentication */}
                <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Two-Factor Authentication</h3>
                      <p className="text-xs text-gray-500 mt-1">Add an extra layer of security to your account</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${twoFactorEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                        {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      {twoFactorEnabled ? (
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to disable Two-Factor Authentication? This will reduce the security of this account.')) {
                              setTwoFactorEnabled(false)
                            }
                          }}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                        >
                          Disable 2FA
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setTwoFactorEnabled(true)
                          }}
                          className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                        >
                          Enable 2FA
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {twoFactorEnabled && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <dl className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Method</dt>
                          <dd className="mt-1 text-sm text-gray-900">Authenticator App</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Configured</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {new Date('2024-01-15T00:00:00Z').toLocaleDateString()}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Backup Codes</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            <span className="text-green-600">5 remaining</span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Last Used</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {new Date('2024-01-28T10:30:00Z').toLocaleDateString()}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>

                {/* Passkeys */}
                <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Passkeys</h3>
                      <p className="text-xs text-gray-500 mt-1">Manage your passwordless authentication devices</p>
                    </div>
                    <button
                      onClick={() => {
                        // TODO: Implement passkey registration
                        console.log('Add passkey clicked')
                      }}
                      className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                    >
                      Add Passkey
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">MacBook Pro Touch ID</div>
                          <div className="text-xs text-gray-500 mt-1">Added Jan 15, 2024</div>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to remove this passkey?')) {
                              console.log('Remove passkey')
                            }
                          }}
                          className="text-sm text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Sessions Tab */}
            {userDrawerTab === 'sessions' && (
              <div className="space-y-6">
                <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <p className="text-sm text-gray-600">
                    Session management will be displayed here once backend integration is complete.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Drawer>
      )}
    </div>
  )
}
