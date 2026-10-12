'use client'

/**
 * Users Tab - Enhanced with detail drawer per escra-frontend-enhancement-plan.md
 */

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { IconUserCog, IconUserMinus, IconEdit, IconEditOff } from '@tabler/icons-react'
import { apiClient } from '@/lib/api-client'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusChip } from '@/components/shared/StatusChip'
import { Pagination } from '@/components/shared/Pagination'
import { KPICard } from '@/components/shared/KPICard'
import { Drawer } from '@/components/shared/Drawer'
import { CopyButton } from '@/components/shared/CopyButton'
import { User, UserStatus, Tenant, TenantStatus, TenantPlan, Key, KeyType, KeyStatus } from '@/types'
import { getUserVerificationStatus } from '@/utils/verification'

// Helper function to get Escra Public User ID (already formatted as USR-XXXX-XXXX)
function formatEscraUserId(escraPublicUserId: string): string {
  // Public IDs are already formatted, just return as-is
  return escraPublicUserId
}

// Helper function to get Escra Public Organization ID (already formatted as ORG-XXXX-XXXX)
function formatOrganizationId(escraPublicOrgId: string): string {
  // Public IDs are already formatted, just return as-is
  return escraPublicOrgId
}

// Helper function to format private ID (UUIDv7) for display
function formatPrivateId(privateId: string, truncate: boolean = true): string {
  if (!privateId) return 'N/A'
  // UUIDv7 format - display as-is, optionally truncate for display
  if (truncate && privateId.length > 20) {
    return `${privateId.slice(0, 8)}...${privateId.slice(-8)}`
  }
  return privateId
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

export default function UsersPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [selectedSignatureRequest, setSelectedSignatureRequest] = useState<any | null>(null)
  const [drawerTab, setDrawerTab] = useState<
    'profile' | 'roles' | 'identity' | 'keys' | 'security' | 'usage' | 'sessions'
  >('profile')
  const [tenantDrawerTab, setTenantDrawerTab] = useState<'overview' | 'users_roles' | 'usage' | 'kyb'>('overview')
  const [usageTab, setUsageTab] = useState<'contracts' | 'documents' | 'signature_requests' | 'signatures'>('contracts')
  const [tenantUsageTab, setTenantUsageTab] = useState<'contracts' | 'documents' | 'signature_requests'>('contracts')
  const selectedSignatureRequestRef = useRef<any | null>(null)
  const [usersPage, setUsersPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all')
  const [tenantFilter, setTenantFilter] = useState<string[]>([])
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [verificationFilter, setVerificationFilter] = useState<string>('all')
  const [dateRangeStart, setDateRangeStart] = useState<string>('')
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('')
  const [search, setSearch] = useState('')
  
  // Search states for tenant filter
  const [tenantSearch, setTenantSearch] = useState<string>('')
  const [showTenantDropdown, setShowTenantDropdown] = useState(false)
  const tenantDropdownRef = useRef<HTMLDivElement>(null)
  
  // Fetch tenants for the organization filter
  const { data: tenantsData } = useQuery({
    queryKey: ['tenants-for-users-filter'],
    queryFn: () => apiClient.listTenants({ page_size: 1000 }),
  })
  
  // Keep refs in sync with state
  useEffect(() => {
    selectedSignatureRequestRef.current = selectedSignatureRequest
  }, [selectedSignatureRequest])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tenantDropdownRef.current && !tenantDropdownRef.current.contains(event.target as Node)) {
        setShowTenantDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
  // Editable fields state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  
  // Address fields state
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [country, setCountry] = useState('')
  
  // Role state
  const [userRole, setUserRole] = useState<string>('')
  
  // Edit mode state for user boxes
  const [userDetailsEditMode, setUserDetailsEditMode] = useState(false)
  const [userAddressEditMode, setUserAddressEditMode] = useState(false)
  const [userRolesEditMode, setUserRolesEditMode] = useState(false)
  const [keyNameEditMode, setKeyNameEditMode] = useState(false)
  const [keyName, setKeyName] = useState('')
  
  // Tenant drawer edit mode states
  const [tenantOrgDetailsEditMode, setTenantOrgDetailsEditMode] = useState(false)
  const [tenantMailingAddressEditMode, setTenantMailingAddressEditMode] = useState(false)
  const [tenantBillingAddressEditMode, setTenantBillingAddressEditMode] = useState(false)
  
  // Tenant editable fields state
  const [legalEntityName, setLegalEntityName] = useState('')
  const [primaryContactEmail, setPrimaryContactEmail] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [taxId, setTaxId] = useState('')
  const [tenantAddress1, setTenantAddress1] = useState('')
  const [tenantAddress2, setTenantAddress2] = useState('')
  const [tenantCity, setTenantCity] = useState('')
  const [tenantState, setTenantState] = useState('')
  const [tenantZipCode, setTenantZipCode] = useState('')
  const [tenantCountry, setTenantCountry] = useState('')
  const [billingAddress1, setBillingAddress1] = useState('')
  const [billingAddress2, setBillingAddress2] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingState, setBillingState] = useState('')
  const [billingZipCode, setBillingZipCode] = useState('')
  const [billingCountry, setBillingCountry] = useState('')
  
  // Initialize tenant editable fields when tenant is selected
  useEffect(() => {
    if (selectedTenant) {
      setLegalEntityName(selectedTenant.legal_entity_name || '')
      setPrimaryContactEmail(selectedTenant.primary_contact_email || '')
      setBillingEmail(selectedTenant.billing_email || '')
      setTaxId(selectedTenant.tax_id || '')
      const metadata = selectedTenant.metadata as any
      setTenantAddress1(metadata?.address_1 || '')
      setTenantAddress2(metadata?.address_2 || '')
      setTenantCity(metadata?.city || '')
      setTenantState(metadata?.state || '')
      setTenantZipCode(metadata?.zip_code || '')
      setTenantCountry(metadata?.country || '')
      setBillingAddress1(metadata?.billing_address_1 || '')
      setBillingAddress2(metadata?.billing_address_2 || '')
      setBillingCity(metadata?.billing_city || '')
      setBillingState(metadata?.billing_state || '')
      setBillingZipCode(metadata?.billing_zip_code || '')
      setBillingCountry(metadata?.billing_country || '')
    }
  }, [selectedTenant])
  
  // Security state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(false)
  const [passkeys, setPasskeys] = useState<Array<{
    id: string
    name: string
    created_at: string
    last_used_at?: string
    device_type?: string
  }>>([])
  
  // Initialize editable fields when user is selected
  React.useEffect(() => {
    if (selectedUser) {
      setFirstName(selectedUser.first_name || '')
      setLastName(selectedUser.last_name || '')
      setEmail(selectedUser.email || '')
      
      // Initialize address fields from user metadata
      const metadata = (selectedUser as any).metadata || {}
      setAddress1(metadata.address_1 || '')
      setAddress2(metadata.address_2 || '')
      setCity(metadata.city || '')
      setState(metadata.state || '')
      setZipCode(metadata.zip_code || '')
      setCountry(metadata.country || '')
      
      // Initialize role - use first role if multiple exist
      setUserRole(selectedUser.roles && selectedUser.roles.length > 0 ? selectedUser.roles[0] : '')
    }
  }, [selectedUser])

  // Fetch tenant data for selected user (for Tier)
  const { data: userTenant } = useQuery({
    queryKey: ['user-tenant', selectedUser?.tenant_id],
    queryFn: () => apiClient.getTenant(selectedUser!.tenant_id),
    enabled: !!selectedUser,
  })

  // Fetch all contracts, documents, and signature requests for selected user (for KPI calculations)
  const { data: allContractsData } = useQuery({
    queryKey: ['user-all-contracts', selectedUser?.escra_public_user_id],
    queryFn: () => apiClient.listContracts({ page_size: 1000 }),
    enabled: !!selectedUser && drawerTab === 'usage',
  })

  const { data: allDocumentsData } = useQuery({
    queryKey: ['user-all-documents', selectedUser?.escra_public_user_id],
    queryFn: () => apiClient.listDocuments({ page_size: 1000 }),
    enabled: !!selectedUser && drawerTab === 'usage',
  })

  const { data: allSignatureRequestsData } = useQuery({
    queryKey: ['user-all-signature-requests', selectedUser?.escra_public_user_id],
    queryFn: () => apiClient.listSignatureRequests({ page_size: 1000 }),
    enabled: !!selectedUser && drawerTab === 'usage',
  })

  // Filter contracts, documents, and signature requests by user_creator_id (which contains escra_public_user_id)
  const userContractsData = useMemo(() => {
    if (!allContractsData || !selectedUser) return { items: [], total: 0, total_pages: 0, page_size: 20 }
    const filtered = allContractsData.items.filter((contract: any) => contract.user_creator_id === selectedUser.escra_public_user_id)
    return {
      ...allContractsData,
      items: filtered,
      total: filtered.length,
    }
  }, [allContractsData, selectedUser])

  const userDocumentsData = useMemo(() => {
    if (!allDocumentsData || !selectedUser) return { items: [], total: 0, total_pages: 0, page_size: 20 }
    const filtered = allDocumentsData.items.filter((document: any) => document.user_creator_id === selectedUser.escra_public_user_id)
    return {
      ...allDocumentsData,
      items: filtered,
      total: filtered.length,
    }
  }, [allDocumentsData, selectedUser])

  const userSignatureRequestsData = useMemo(() => {
    if (!allSignatureRequestsData || !selectedUser) return { items: [], total: 0, total_pages: 0, page_size: 20 }
    const filtered = allSignatureRequestsData.items.filter((request: any) => request.user_creator_id === selectedUser.escra_public_user_id)
    return {
      ...allSignatureRequestsData,
      items: filtered,
      total: filtered.length,
    }
  }, [allSignatureRequestsData, selectedUser])

  // Fetch contracts, documents, and signature requests for selected user (for table display)
  const { data: contractsData, isLoading: contractsLoading } = useQuery({
    queryKey: ['user-contracts', selectedUser?.escra_public_user_id],
    queryFn: () => apiClient.listContracts({ page_size: 1000 }),
    enabled: !!selectedUser && drawerTab === 'usage' && usageTab === 'contracts',
  })

  const { data: documentsData, isLoading: documentsLoading } = useQuery({
    queryKey: ['user-documents', selectedUser?.escra_public_user_id],
    queryFn: () => apiClient.listDocuments({ page_size: 1000 }),
    enabled: !!selectedUser && drawerTab === 'usage' && usageTab === 'documents',
  })

  const { data: signatureRequestsData, isLoading: signatureRequestsLoading } = useQuery({
    queryKey: ['user-signature-requests', selectedUser?.escra_public_user_id],
    queryFn: () => apiClient.listSignatureRequests({ page_size: 1000 }),
    enabled: !!selectedUser && drawerTab === 'usage' && usageTab === 'signature_requests',
  })

  const { data: signatureEventsData, isLoading: signatureEventsLoading } = useQuery({
    queryKey: ['user-signature-events', selectedUser?.escra_public_user_id],
    queryFn: () => apiClient.listSignatureEvents({ page_size: 1000, user_id: selectedUser?.escra_public_user_id }),
    enabled: !!selectedUser && drawerTab === 'usage' && usageTab === 'signatures',
  })

  // Filter table data by user
  const filteredContractsData = useMemo(() => {
    if (!contractsData || !selectedUser) return { items: [], total: 0, total_pages: 0, page_size: 20 }
    const filtered = contractsData.items.filter((contract: any) => contract.user_creator_id === selectedUser.escra_public_user_id)
    return {
      ...contractsData,
      items: filtered,
      total: filtered.length,
    }
  }, [contractsData, selectedUser])

  const filteredDocumentsData = useMemo(() => {
    if (!documentsData || !selectedUser) return { items: [], total: 0, total_pages: 0, page_size: 20 }
    const filtered = documentsData.items.filter((document: any) => document.user_creator_id === selectedUser.escra_public_user_id)
    return {
      ...documentsData,
      items: filtered,
      total: filtered.length,
    }
  }, [documentsData, selectedUser])

  const filteredSignatureRequestsData = useMemo(() => {
    if (!signatureRequestsData || !selectedUser) return { items: [], total: 0, total_pages: 0, page_size: 20 }
    const filtered = signatureRequestsData.items.filter((request: any) => request.user_creator_id === selectedUser.escra_public_user_id)
    return {
      ...signatureRequestsData,
      items: filtered,
      total: filtered.length,
    }
  }, [signatureRequestsData, selectedUser])

  // Calculate totals from actual user data
  const totalAlgoLockup = useMemo(() => {
    const contractsLockup = (userContractsData?.items || []).reduce((sum, contract) => sum + (contract.lockup || 0), 0)
    const documentsLockup = (userDocumentsData?.items || []).reduce((sum, doc) => sum + (doc.lockup || 0), 0)
    return contractsLockup + documentsLockup
  }, [userContractsData, userDocumentsData])

  const totalTransactions = useMemo(() => {
    const contractsTransactions = (userContractsData?.items || []).reduce((sum, contract) => sum + (contract.transaction_count || 0), 0)
    const documentsTransactions = (userDocumentsData?.items || []).reduce((sum, doc) => sum + (doc.transaction_count || 0), 0)
    const signatureRequestsTransactions = (userSignatureRequestsData?.items || []).reduce((sum, sig) => sum + (sig.transaction_count || 0), 0)
    return contractsTransactions + documentsTransactions + signatureRequestsTransactions
  }, [userContractsData, userDocumentsData, userSignatureRequestsData])

  const totalTransactionCost = useMemo(() => {
    const contractsCost = (userContractsData?.items || []).reduce((sum, contract) => sum + ((contract as any).transaction_cost || 0), 0)
    const documentsCost = (userDocumentsData?.items || []).reduce((sum, doc) => sum + ((doc as any).transaction_cost || 0), 0)
    const signatureRequestsCost = (userSignatureRequestsData?.items || []).reduce((sum, sig) => sum + ((sig as any).transaction_cost || 0), 0)
    return contractsCost + documentsCost + signatureRequestsCost
  }, [userContractsData, userDocumentsData, userSignatureRequestsData])

  // Calculate counts from actual user data
  const totalContracts = useMemo(() => {
    return userContractsData?.items?.length || 0
  }, [userContractsData])

  const totalDocuments = useMemo(() => {
    return userDocumentsData?.items?.length || 0
  }, [userDocumentsData])

  const totalSignatureRequests = useMemo(() => {
    return userSignatureRequestsData?.items?.length || 0
  }, [userSignatureRequestsData])

  const totalSigners = useMemo(() => {
    return (userSignatureRequestsData?.items || []).reduce((sum, sig) => sum + (sig.signer_count || 0), 0)
  }, [userSignatureRequestsData])

  const storageUsedGB = useMemo(() => {
    // Sum all document file sizes (in bytes) and convert to GB
    const totalBytes = (userDocumentsData?.items || []).reduce((sum, doc) => sum + ((doc as any).file_size || 0), 0)
    return totalBytes / (1024 * 1024 * 1024) // Convert bytes to GB
  }, [userDocumentsData])

  // Fetch keys for selected user
  const { data: keysData, isLoading: keysLoading } = useQuery({
    queryKey: ['user-keys', selectedUser?.escra_public_user_id],
    queryFn: () => apiClient.listKeys({ page_size: 1000 }),
    enabled: !!selectedUser && drawerTab === 'keys',
  })

  // Filter keys by user_id (using escra_public_user_id)
  const userKeys = useMemo(() => {
    if (!keysData || !selectedUser) return []
    return keysData.items.filter((key: Key) => key.user_id === selectedUser.escra_public_user_id)
  }, [keysData, selectedUser])

  // Initialize key name when user keys are loaded
  React.useEffect(() => {
    if (userKeys.length > 0) {
      const primaryKey = userKeys.find((key: Key) => key.status === KeyStatus.ACTIVE) || userKeys[0]
      if (primaryKey) {
        setKeyName(primaryKey.name || '')
      }
    }
  }, [userKeys])

  // Queries for tenant drawer
  const { data: tenantUsersData, isLoading: tenantUsersLoading } = useQuery({
    queryKey: ['tenant-users-users-page', selectedTenant?.escra_public_org_id, usersPage],
    queryFn: () =>
      apiClient.listUsers({
        page: usersPage,
        page_size: 20,
        tenant_id: selectedTenant?.escra_public_org_id,
      }),
    enabled: !!selectedTenant && tenantDrawerTab === 'users_roles',
  })

  // Fetch all users for tenant (for usage calculations and signer classification)
  const { data: allTenantUsersData } = useQuery({
    queryKey: ['tenant-all-users-users-page', selectedTenant?.escra_public_org_id],
    queryFn: () => apiClient.listUsers({ tenant_id: selectedTenant?.escra_public_org_id, page_size: 1000 }),
    enabled: !!selectedTenant && (tenantDrawerTab === 'usage' || !!selectedSignatureRequest),
  })

  // Fetch contracts, documents, signature requests for tenant usage tab
  const { data: allTenantContractsData } = useQuery({
    queryKey: ['tenant-all-contracts-users-page', selectedTenant?.id],
    queryFn: () => apiClient.listContracts({ page_size: 1000 }),
    enabled: !!selectedTenant && tenantDrawerTab === 'usage',
  })

  const { data: allTenantDocumentsData } = useQuery({
    queryKey: ['tenant-all-documents-users-page', selectedTenant?.id],
    queryFn: () => apiClient.listDocuments({ page_size: 1000 }),
    enabled: !!selectedTenant && tenantDrawerTab === 'usage',
  })

  const { data: allTenantSignatureRequestsData } = useQuery({
    queryKey: ['tenant-all-signature-requests-users-page', selectedTenant?.id],
    queryFn: () => apiClient.listSignatureRequests({ page_size: 1000 }),
    enabled: !!selectedTenant && tenantDrawerTab === 'usage',
  })

  // Filter data by tenant
  const tenantUserIds = useMemo(() => {
    if (!allTenantUsersData) return new Set<string>()
    return new Set((allTenantUsersData.items || []).map((user: any) => user.escra_public_user_id))
  }, [allTenantUsersData])

  const filteredTenantContractsData = useMemo(() => {
    if (!allTenantContractsData || !selectedTenant) return { items: [], total: 0 }
    const items = (allTenantContractsData.items || []).filter((contract: any) => {
      return contract.tenant_id === selectedTenant.escra_public_org_id || 
             (contract.user_creator_id && tenantUserIds.has(contract.user_creator_id))
    })
    return { ...allTenantContractsData, items, total: items.length }
  }, [allTenantContractsData, selectedTenant, tenantUserIds])

  const filteredTenantDocumentsData = useMemo(() => {
    if (!allTenantDocumentsData || !selectedTenant) return { items: [], total: 0 }
    const items = (allTenantDocumentsData.items || []).filter((doc: any) => {
      return doc.tenant_id === selectedTenant.escra_public_org_id || 
             (doc.user_creator_id && tenantUserIds.has(doc.user_creator_id))
    })
    return { ...allTenantDocumentsData, items, total: items.length }
  }, [allTenantDocumentsData, selectedTenant, tenantUserIds])

  const filteredTenantSignatureRequestsData = useMemo(() => {
    if (!allTenantSignatureRequestsData || !selectedTenant) return { items: [], total: 0 }
    const items = (allTenantSignatureRequestsData.items || []).filter((sig: any) => {
      return sig.tenant_id === selectedTenant.escra_public_org_id || 
             (sig.user_creator_id && tenantUserIds.has(sig.user_creator_id))
    })
    return { ...allTenantSignatureRequestsData, items, total: items.length }
  }, [allTenantSignatureRequestsData, selectedTenant, tenantUserIds])

  // Table data for tenant usage tab
  const { data: tenantContractsTableData, isLoading: tenantContractsLoading } = useQuery({
    queryKey: ['tenant-contracts-table-users-page', selectedTenant?.id, tenantUsageTab],
    queryFn: () => apiClient.listContracts({ page_size: 1000 }),
    enabled: !!selectedTenant && tenantDrawerTab === 'usage' && tenantUsageTab === 'contracts',
  })

  const { data: tenantDocumentsTableData, isLoading: tenantDocumentsLoading } = useQuery({
    queryKey: ['tenant-documents-table-users-page', selectedTenant?.id, tenantUsageTab],
    queryFn: () => apiClient.listDocuments({ page_size: 1000 }),
    enabled: !!selectedTenant && tenantDrawerTab === 'usage' && tenantUsageTab === 'documents',
  })

  const { data: tenantSignatureRequestsTableData, isLoading: tenantSignatureRequestsLoading } = useQuery({
    queryKey: ['tenant-signature-requests-table-users-page', selectedTenant?.id, tenantUsageTab],
    queryFn: () => apiClient.listSignatureRequests({ page_size: 1000 }),
    enabled: !!selectedTenant && tenantDrawerTab === 'usage' && tenantUsageTab === 'signature_requests',
  })

  // Fetch document and contract for selected signature request
  const { data: signatureRequestDocumentData } = useQuery({
    queryKey: ['signature-request-document-users', selectedSignatureRequest?.document_id],
    queryFn: async () => {
      if (!selectedSignatureRequest?.document_id) return { document: null, contractId: null }
      const documentsResponse = await apiClient.listDocuments({ page_size: 1000 })
      const document = documentsResponse.items?.find((doc: any) => doc.escra_public_document_id === selectedSignatureRequest.document_id) || null
      
      // Try to find contract_id from signature events for this document
      let contractId = null
      if (document) {
        const eventsResponse = await apiClient.listSignatureEvents({ page_size: 1000 })
        const event = eventsResponse.items?.find((evt: any) => evt.document_id === selectedSignatureRequest.document_id)
        contractId = event?.contract_id || null
      }
      
      return { document, contractId }
    },
    enabled: !!selectedSignatureRequest?.document_id,
  })

  // Fetch signature events for selected signature request
  const { data: signatureRequestEventsData, isLoading: signatureRequestEventsLoading } = useQuery({
    queryKey: ['signature-request-events-users', selectedSignatureRequest?.escra_public_signature_request_id],
    queryFn: () => apiClient.listSignatureEvents({ 
      page_size: 1000,
      request_id: selectedSignatureRequest?.escra_public_signature_request_id 
    }),
    enabled: !!selectedSignatureRequest,
  })

  const filteredSignatureRequestEvents = useMemo(() => {
    if (!signatureRequestEventsData) return []
    return signatureRequestEventsData.items || []
  }, [signatureRequestEventsData])

  const isInternalSigner = (userId: string) => {
    if (!userId) return false
    return tenantUserIds.has(userId)
  }

  // Filter table data
  const filteredTenantContractsTableData = useMemo(() => {
    if (!tenantContractsTableData || !selectedTenant) return { items: [], total: 0 }
    const items = (tenantContractsTableData.items || []).filter((contract: any) => {
      return contract.tenant_id === selectedTenant.escra_public_org_id || 
             (contract.user_creator_id && tenantUserIds.has(contract.user_creator_id))
    })
    return { ...tenantContractsTableData, items, total: items.length }
  }, [tenantContractsTableData, selectedTenant, tenantUserIds])

  const filteredTenantDocumentsTableData = useMemo(() => {
    if (!tenantDocumentsTableData || !selectedTenant) return { items: [], total: 0 }
    const items = (tenantDocumentsTableData.items || []).filter((doc: any) => {
      return doc.tenant_id === selectedTenant.escra_public_org_id || 
             (doc.user_creator_id && tenantUserIds.has(doc.user_creator_id))
    })
    return { ...tenantDocumentsTableData, items, total: items.length }
  }, [tenantDocumentsTableData, selectedTenant, tenantUserIds])

  const filteredTenantSignatureRequestsTableData = useMemo(() => {
    if (!tenantSignatureRequestsTableData || !selectedTenant) return { items: [], total: 0 }
    const items = (tenantSignatureRequestsTableData.items || []).filter((sig: any) => {
      return sig.tenant_id === selectedTenant.escra_public_org_id || 
             (sig.user_creator_id && tenantUserIds.has(sig.user_creator_id))
    })
    return { ...tenantSignatureRequestsTableData, items, total: items.length }
  }, [tenantSignatureRequestsTableData, selectedTenant, tenantUserIds])

  // Calculate tenant usage stats
  const tenantTotalContracts = useMemo(() => filteredTenantContractsData?.items?.length || 0, [filteredTenantContractsData])
  const tenantTotalDocuments = useMemo(() => filteredTenantDocumentsData?.items?.length || 0, [filteredTenantDocumentsData])
  const tenantTotalSignatureRequests = useMemo(() => filteredTenantSignatureRequestsData?.items?.length || 0, [filteredTenantSignatureRequestsData])
  const tenantTotalSigners = useMemo(() => {
    return (filteredTenantSignatureRequestsData?.items || []).reduce((sum, sig) => sum + (sig.signer_count || 0), 0)
  }, [filteredTenantSignatureRequestsData])
  
  const tenantStorageUsedGB = useMemo(() => {
    const totalBytes = (filteredTenantDocumentsData?.items || []).reduce((sum, doc) => sum + ((doc as any).file_size || 0), 0)
    return totalBytes / (1024 * 1024 * 1024)
  }, [filteredTenantDocumentsData])
  
  const tenantTotalAlgoLockup = useMemo(() => {
    const contractsLockup = (filteredTenantContractsData?.items || []).reduce((sum, contract) => sum + (contract.lockup || 0), 0)
    const documentsLockup = (filteredTenantDocumentsData?.items || []).reduce((sum, doc) => sum + (doc.lockup || 0), 0)
    return contractsLockup + documentsLockup
  }, [filteredTenantContractsData, filteredTenantDocumentsData])
  
  const tenantTotalTransactions = useMemo(() => {
    const contractsTransactions = (filteredTenantContractsData?.items || []).reduce((sum, contract) => sum + (contract.transaction_count || 0), 0)
    const documentsTransactions = (filteredTenantDocumentsData?.items || []).reduce((sum, doc) => sum + (doc.transaction_count || 0), 0)
    const signatureRequestsTransactions = (filteredTenantSignatureRequestsData?.items || []).reduce((sum, sig) => sum + (sig.transaction_count || 0), 0)
    return contractsTransactions + documentsTransactions + signatureRequestsTransactions
  }, [filteredTenantContractsData, filteredTenantDocumentsData, filteredTenantSignatureRequestsData])
  
  const tenantTotalTransactionCost = useMemo(() => {
    const contractsCost = (filteredTenantContractsData?.items || []).reduce((sum, contract) => sum + ((contract as any).transaction_cost || 0), 0)
    const documentsCost = (filteredTenantDocumentsData?.items || []).reduce((sum, doc) => sum + ((doc as any).transaction_cost || 0), 0)
    const signatureRequestsCost = (filteredTenantSignatureRequestsData?.items || []).reduce((sum, sig) => sum + ((sig as any).transaction_cost || 0), 0)
    return contractsCost + documentsCost + signatureRequestsCost
  }, [filteredTenantContractsData, filteredTenantDocumentsData, filteredTenantSignatureRequestsData])

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

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, statusFilter],
    queryFn: () =>
      apiClient.listUsers({
        page,
        page_size: 1000, // Get more results for client-side filtering
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
  })

  // Filter users by tenant filter, verification status filter, and search (name, public ID, organization name, organization ID) on the client side
  const users = useMemo(() => {
    const allUsers = data?.items || []
    
    // First filter by tenant/organization
    let filtered = allUsers
    if (tenantFilter.length > 0) {
      filtered = allUsers.filter((user: User) => tenantFilter.includes(user.tenant_id))
    }
    
    // Then filter by role
    if (roleFilter !== 'all') {
      filtered = filtered.filter((user: User) => {
        return user.roles && user.roles.includes(roleFilter)
      })
    }
    
    // Then filter by verification status
    if (verificationFilter !== 'all') {
      filtered = filtered.filter((user: User) => {
        const personaStatus = (user as any).persona_verification_status
        // Handle suspended users showing as failed verification
        if (verificationFilter === 'failed') {
          return personaStatus === 'failed' || (user.status === 'suspended')
        }
        // For other statuses, match directly or handle pending
        if (verificationFilter === 'pending') {
          return !personaStatus || personaStatus === 'pending' || personaStatus === 'action_required' ||
                 (user.status === 'onboarding' && !personaStatus)
        }
        return personaStatus === verificationFilter
      })
    }
    
    // Then filter by date range
    if (dateRangeStart || dateRangeEnd) {
      filtered = filtered.filter((user: User) => {
        const userDate = user.created_at ? new Date(user.created_at) : null
        if (userDate) {
          if (dateRangeStart && userDate < new Date(dateRangeStart)) {
            return false
          }
          if (dateRangeEnd) {
            const endDate = new Date(dateRangeEnd)
            endDate.setHours(23, 59, 59, 999) // Include the entire end date
            if (userDate > endDate) {
              return false
            }
          }
          return true
        } else {
          return false // Exclude users without dates if date filter is active
        }
      })
    }
    
    // Then filter by search
    if (!search) return filtered
    
    const searchLower = search.toLowerCase().trim()
    if (!searchLower) return filtered
    
    return filtered.filter((user: User) => {
      // Search by name (first, last, full name, or email)
      const nameMatch = 
        (user.first_name && user.first_name.toLowerCase().includes(searchLower)) ||
        (user.last_name && user.last_name.toLowerCase().includes(searchLower)) ||
        (user.email && user.email.toLowerCase().includes(searchLower)) ||
        (user.first_name && user.last_name && `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchLower))
      
      // Search by public user ID
      const idMatch = user.escra_public_user_id && user.escra_public_user_id.toLowerCase().includes(searchLower)
      
      // Search by organization name and ID
      const tenant = tenantsData?.items?.find((t: Tenant) => t.escra_public_org_id === user.tenant_id)
      const orgNameMatch = tenant?.name?.toLowerCase().includes(searchLower) || false
      const orgIdMatch = user.tenant_id?.toLowerCase().includes(searchLower) || false
      
      return nameMatch || idMatch || orgNameMatch || orgIdMatch
    })
  }, [data?.items, search, tenantFilter, roleFilter, verificationFilter, dateRangeStart, dateRangeEnd, tenantsData?.items])

  // Fetch all contracts and documents for table stats
  const { data: allContractsForTable } = useQuery({
    queryKey: ['all-contracts-users-table'],
    queryFn: () => apiClient.listContracts({ page_size: 1000 }),
  })

  const { data: allDocumentsForTable } = useQuery({
    queryKey: ['all-documents-users-table'],
    queryFn: () => apiClient.listDocuments({ page_size: 1000 }),
  })

  const { data: allSignatureRequestsForTable } = useQuery({
    queryKey: ['all-signature-requests-users-table'],
    queryFn: () => apiClient.listSignatureRequests({ page_size: 1000 }),
  })

  const { data: allKeysForTable } = useQuery({
    queryKey: ['all-keys-users-table'],
    queryFn: () => apiClient.listKeys({ page_size: 1000 }),
  })

  // Calculate stats per user for table display
  const userStats = useMemo(() => {
    const stats: Record<string, { 
      contracts: number
      documents: number
      storageGB: number
      algoLockup: number
      transactionCount: number
      transactionCost: number
    }> = {}

    // Group contracts by user_creator_id
    const contractsByUser: Record<string, any[]> = {}
    ;(allContractsForTable?.items || []).forEach((contract: any) => {
      const userId = contract.user_creator_id
      if (userId) {
        if (!contractsByUser[userId]) contractsByUser[userId] = []
        contractsByUser[userId].push(contract)
      }
    })

    // Group documents by user_creator_id
    const documentsByUser: Record<string, any[]> = {}
    ;(allDocumentsForTable?.items || []).forEach((document: any) => {
      const userId = document.user_creator_id
      if (userId) {
        if (!documentsByUser[userId]) documentsByUser[userId] = []
        documentsByUser[userId].push(document)
      }
    })

    // Group signature requests by user_creator_id
    const signatureRequestsByUser: Record<string, any[]> = {}
    ;(allSignatureRequestsForTable?.items || []).forEach((sig: any) => {
      const userId = sig.user_creator_id
      if (userId) {
        if (!signatureRequestsByUser[userId]) signatureRequestsByUser[userId] = []
        signatureRequestsByUser[userId].push(sig)
      }
    })

    // Calculate stats for each user
    Object.keys(contractsByUser).forEach(userId => {
      const contracts = contractsByUser[userId] || []
      const documents = documentsByUser[userId] || []
      const signatureRequests = signatureRequestsByUser[userId] || []
      
      // Calculate storage from documents (file sizes in bytes, convert to GB)
      const totalBytes = documents.reduce((sum, doc) => sum + ((doc as any).file_size || 0), 0)
      const storageGB = totalBytes / (1024 * 1024 * 1024)

      // Calculate ALGO lockup
      const contractsLockup = contracts.reduce((sum, contract) => sum + (contract.lockup || 0), 0)
      const documentsLockup = documents.reduce((sum, doc) => sum + (doc.lockup || 0), 0)
      const algoLockup = contractsLockup + documentsLockup

      // Calculate transactions
      const contractsTransactions = contracts.reduce((sum, contract) => sum + (contract.transaction_count || 0), 0)
      const documentsTransactions = documents.reduce((sum, doc) => sum + (doc.transaction_count || 0), 0)
      const signatureRequestsTransactions = signatureRequests.reduce((sum, sig) => sum + (sig.transaction_count || 0), 0)
      const transactionCount = contractsTransactions + documentsTransactions + signatureRequestsTransactions

      // Calculate transaction cost
      const contractsCost = contracts.reduce((sum, contract) => sum + ((contract as any).transaction_cost || 0), 0)
      const documentsCost = documents.reduce((sum, doc) => sum + ((doc as any).transaction_cost || 0), 0)
      const signatureRequestsCost = signatureRequests.reduce((sum, sig) => sum + ((sig as any).transaction_cost || 0), 0)
      const transactionCost = contractsCost + documentsCost + signatureRequestsCost

      stats[userId] = {
        contracts: contracts.length,
        documents: documents.length,
        storageGB,
        algoLockup,
        transactionCount,
        transactionCost,
      }
    })

    // Also include users that have documents but no contracts
    Object.keys(documentsByUser).forEach(userId => {
      if (!stats[userId]) {
        const documents = documentsByUser[userId] || []
        const signatureRequests = signatureRequestsByUser[userId] || []
        const totalBytes = documents.reduce((sum, doc) => sum + ((doc as any).file_size || 0), 0)
        const storageGB = totalBytes / (1024 * 1024 * 1024)
        
        // Calculate ALGO lockup
        const documentsLockup = documents.reduce((sum, doc) => sum + (doc.lockup || 0), 0)
        
        // Calculate transactions
        const documentsTransactions = documents.reduce((sum, doc) => sum + (doc.transaction_count || 0), 0)
        const signatureRequestsTransactions = signatureRequests.reduce((sum, sig) => sum + (sig.transaction_count || 0), 0)
        const transactionCount = documentsTransactions + signatureRequestsTransactions

        // Calculate transaction cost
        const documentsCost = documents.reduce((sum, doc) => sum + ((doc as any).transaction_cost || 0), 0)
        const signatureRequestsCost = signatureRequests.reduce((sum, sig) => sum + ((sig as any).transaction_cost || 0), 0)
        const transactionCost = documentsCost + signatureRequestsCost
        
        stats[userId] = {
          contracts: 0,
          documents: documents.length,
          storageGB,
          algoLockup: documentsLockup,
          transactionCount,
          transactionCost,
        }
      }
    })

    // Also include users that have signature requests but no contracts or documents
    Object.keys(signatureRequestsByUser).forEach(userId => {
      if (!stats[userId]) {
        const signatureRequests = signatureRequestsByUser[userId] || []
        const signatureRequestsTransactions = signatureRequests.reduce((sum, sig) => sum + (sig.transaction_count || 0), 0)
        const signatureRequestsCost = signatureRequests.reduce((sum, sig) => sum + ((sig as any).transaction_cost || 0), 0)
        
        stats[userId] = {
          contracts: 0,
          documents: 0,
          storageGB: 0,
          algoLockup: 0,
          transactionCount: signatureRequestsTransactions,
          transactionCost: signatureRequestsCost,
        }
      }
    })

      return stats
  }, [allContractsForTable, allDocumentsForTable, allSignatureRequestsForTable])

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'User',
      sortable: true,
      render: (user) => {
        const tenant = tenantsData?.items?.find((t: Tenant) => t.escra_public_org_id === user.tenant_id)
        const isPersonal = tenant && ((tenant.metadata as any)?.is_personal === true || (tenant.metadata as any)?.tenant_type === 'personal')
        const isTrial = user.tier === TenantPlan.TRIAL || tenant?.plan === TenantPlan.TRIAL
        return (
          <div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedUser(user)
              }}
              className="text-sm font-mono text-primary-600 hover:text-primary-900 hover:underline"
            >
              {formatEscraUserId(user.escra_public_user_id)}
            </button>
            <div className="mt-1">
              <span className="font-medium text-gray-900">
                {user.first_name} {user.last_name}
              </span>
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
            <div className="flex items-center gap-2 mt-1">
              {isPersonal && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                  Personal
                </span>
              )}
              {isTrial && (
                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                  Trial
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'public_key',
      header: 'Public Key',
      sortable: true,
      render: (user) => {
        // Only show public key for users who meet criteria:
        // 1. User status is active
        // 2. User verification status is approved
        // 3. Tenant status is active
        // 4. User has keys
        if (user.status !== UserStatus.ACTIVE) {
          return <span className="text-sm font-mono text-gray-900">N/A</span>
        }
        
        const verificationStatus = getUserVerificationStatus(user)
        if (verificationStatus !== 'approved') {
          return <span className="text-sm font-mono text-gray-900">N/A</span>
        }
        
        // Check if tenant is active
        const tenant = tenantsData?.items?.find((t: Tenant) => t.escra_public_org_id === user.tenant_id)
        if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
          return <span className="text-sm font-mono text-gray-900">N/A</span>
        }
        
        // Get public key from user's keys (wallet_address from active key)
        const userKeys = (allKeysForTable?.items || []).filter((key: Key) => 
          key.user_id === user.escra_public_user_id && key.status === KeyStatus.ACTIVE
        )
        const activeKey = userKeys.find((key: Key) => key.wallet_address) || userKeys[0]
        const publicKey = activeKey?.wallet_address || (user as any).public_key
        
        if (!publicKey) {
          return <span className="text-sm font-mono text-gray-900">N/A</span>
        }
        
        // Truncate: show first 6 and last 4 characters
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
      key: 'tenant_id',
      header: 'Organization',
      sortable: true,
      render: (user) => {
        const tenant = tenantsData?.items?.find((t: Tenant) => t.escra_public_org_id === user.tenant_id)
        const isPersonal = tenant && ((tenant.metadata as any)?.is_personal === true || (tenant.metadata as any)?.tenant_type === 'personal')
        const isTrial = user.tier === TenantPlan.TRIAL || tenant?.plan === TenantPlan.TRIAL
        return (
          <div>
            <button
              onClick={async (e) => {
                e.stopPropagation()
                try {
                  const tenant = await apiClient.getTenant(user.tenant_id)
                  setSelectedTenant(tenant)
                  setTenantDrawerTab('overview')
                } catch (error) {
                  console.error('Failed to fetch tenant:', error)
                }
              }}
              className="text-sm font-mono text-primary-600 hover:text-primary-900 hover:underline"
            >
              {formatOrganizationId(user.tenant_id)}
            </button>
            {tenant?.name && (
              <div className="mt-1">
                <div className="font-medium text-gray-900">{tenant.name}</div>
                {isTrial && (
                  <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800 mt-1">
                    Trial
                  </span>
                )}
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (user) => (
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
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Account Status',
      sortable: true,
      align: 'center',
      render: (user) => <StatusChip status={user.status} />,
    },
    {
      key: 'verification_status',
      header: 'Verification Status',
      sortable: true,
      align: 'center',
      width: '8%',
      render: (user) => {
        const status = getUserVerificationStatus(user)
        
        // Apply same color scheme as tenants table
        let colorClass = 'text-gray-600' // Default
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
      key: 'storage',
      header: 'Storage Used',
      render: (user) => {
        const stats = userStats[user.escra_public_user_id] || { contracts: 0, documents: 0, storageGB: 0, algoLockup: 0, transactionCount: 0, transactionCost: 0 }
        
        // Format storage with appropriate precision
        const formatStorage = (gb: number) => {
          if (gb < 1) {
            // Show in MB if less than 1 GB for better readability
            const mb = gb * 1024
            return `${mb.toFixed(2)} MB`
          } else {
            // Show 2 decimal places for values 1 GB or more
            return `${gb.toFixed(2)} GB`
          }
        }
        
        return (
          <div className="text-sm text-gray-900">
            <div>{formatStorage(stats.storageGB)}</div>
            <div className="text-xs text-gray-500">
              {stats.contracts} contracts
            </div>
            <div className="text-xs text-gray-500">
              {stats.documents} documents
            </div>
          </div>
        )
      },
    },
    {
      key: 'algo_lockup',
      header: 'Algo Lockup',
      sortable: true,
      render: (user) => {
        const stats = userStats[user.escra_public_user_id] || { contracts: 0, documents: 0, storageGB: 0, algoLockup: 0, transactionCount: 0, transactionCost: 0 }
        return (
          <span className="text-sm text-gray-900">
            {stats.algoLockup} ALGO
          </span>
        )
      },
    },
    {
      key: 'transactions',
      header: 'Transactions',
      sortable: true,
      render: (user) => {
        const stats = userStats[user.escra_public_user_id] || { contracts: 0, documents: 0, storageGB: 0, algoLockup: 0, transactionCount: 0, transactionCost: 0 }
        return (
          <div className="text-sm text-gray-900">
            <div>${stats.transactionCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="text-xs text-gray-500">
              {stats.transactionCount.toLocaleString()} transactions
            </div>
          </div>
        )
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user) => (
        <div className="flex gap-2">
          <button
          onClick={(e) => {
            e.stopPropagation()
            setSelectedUser(user)
            setDrawerTab('profile')
          }}
          className="text-gray-600 hover:text-gray-900 transition-colors"
          title="Edit"
        >
          <IconUserCog className="w-5 h-5" />
        </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              // TODO: Implement remove user functionality
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
  ]

  return (
    <div>
      <div className="mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage users, identities, and access controls
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KPICard title="Total Users" value={data?.total || 0} subtitle="All users" />
          <KPICard
            title="Active Users"
            value={users.filter(u => u.status === UserStatus.ACTIVE).length}
            subtitle="Currently active"
          />
          <KPICard
            title="Inactive Users"
            value={users.filter(u => u.status === UserStatus.INACTIVE || u.status === UserStatus.SUSPENDED).length}
            subtitle="Currently inactive"
          />
          <KPICard
            title="Verified Users"
            value={users.filter(u => u.verification_level === 'enhanced').length}
            subtitle="Enhanced verification"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KPICard
            title="Onboarding Users"
            value={users.filter(u => u.status === UserStatus.PENDING_VERIFICATION).length}
            subtitle="Pending verification"
          />
          <KPICard
            title="With Risk Signals"
            value={users.filter(u => (u.persona_risk_signals?.length || 0) > 0).length}
            subtitle="Flagged users"
          />
          <KPICard
            title="Suspended Users"
            value={users.filter(u => u.status === UserStatus.SUSPENDED).length}
            subtitle="Currently suspended"
          />
        </div>
      </div>

      {/* Filters, Search & Table Container */}
      <div
        className="mb-6 rounded-lg bg-white p-6"
        style={{
          boxShadow:
            '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Filters */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-4">
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
            <div className="w-full sm:flex-1 sm:min-w-[160px]">
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'all')}
                className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
              >
                <option value="all">All</option>
                <option value={UserStatus.PENDING_VERIFICATION}>Onboarding</option>
                <option value={UserStatus.ACTIVE}>Active</option>
                <option value={UserStatus.INACTIVE}>Inactive</option>
                <option value={UserStatus.SUSPENDED}>Suspended</option>
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
            <div className="w-full sm:flex-1 sm:min-w-[160px]">
              <label className="block text-sm font-medium text-gray-700">Verification Status</label>
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Verified</option>
                <option value="failed">Failed</option>
                <option value="expired">Expired</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
            <div className="w-full sm:w-auto sm:min-w-[240px]">
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
          <div className="mt-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user name or ID & organization name or ID..."
              className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500 placeholder:text-gray-400 py-2 px-3"
            />
          </div>
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
            data={users}
            loading={isLoading}
            onRowClick={(user) => setSelectedUser(user)}
            emptyMessage="No users found"
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

      {/* User Detail Drawer */}
      {selectedUser && (
        <Drawer
          isOpen={!!selectedUser}
          onClose={() => {
            // Don't close user drawer if signature request drawer is open
            if (!selectedSignatureRequestRef.current) {
              setSelectedUser(null)
            }
          }}
          title={`${selectedUser.first_name} ${selectedUser.last_name}`}
          size="3xl"
        >
          <div className="space-y-6">
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
                    'usage',
                    'sessions',
                  ] as const
                ).map((tab) => (
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
                    {tab === 'roles' ? 'Organizations & Roles' : tab === 'identity' ? 'KYC' : tab}
                  </button>
                ))}
              </nav>
            </div>

            {/* Profile Tab */}
            {drawerTab === 'profile' && (
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
                        {userTenant?.status === 'trial' ? 'Trial' : userTenant?.plan ? userTenant.plan : 'N/A'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Timezone</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {(selectedUser as any).timezone || (userTenant?.timezone || selectedTenant?.timezone || 'N/A')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-900">Region</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {(selectedUser as any).region || (userTenant?.region || selectedTenant?.region || 'N/A')}
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
                          value={address1}
                          onChange={(e) => setAddress1(e.target.value)}
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
                          value={address2}
                          onChange={(e) => setAddress2(e.target.value)}
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
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
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
                            value={zipCode}
                            onChange={(e) => setZipCode(e.target.value)}
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
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
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
            {drawerTab === 'roles' && (
              <div className="space-y-6">
                {/* Organizations */}
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
            {drawerTab === 'identity' && (
              <div className="space-y-6">
                {/* Verification Details */}
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

            {/* Keys & Security Tab */}
            {drawerTab === 'keys' && (
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
                                      // Save the key name
                                      // TODO: Implement API call to update key name
                                      setKeyNameEditMode(false)
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        // Save the key name
                                        // TODO: Implement API call to update key name
                                        setKeyNameEditMode(false)
                                      } else if (e.key === 'Escape') {
                                        // Revert changes
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
                                      // Save the key name
                                      // TODO: Implement API call to update key name
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
                            const publicKey = (selectedUser as any).public_key
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
                            // TODO: Implement rekey functionality
                            console.log('Rekey clicked for user:', selectedUser?.id)
                            // await apiClient.rekeyUser(selectedUser?.id)
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                        >
                          Rekey
                        </button>
                        <button
                          onClick={async () => {
                            // TODO: Implement remove key functionality
                            if (confirm('Are you sure you want to remove this key? This action cannot be undone.')) {
                              console.log('Remove key clicked for user:', selectedUser?.id)
                              // await apiClient.removeUserKey(selectedUser?.id)
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
                            const isExpiringSoon = expiresDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000 // 30 days
                            return (
                              <span className={`text-sm ${isExpiringSoon ? 'text-orange-600' : 'text-gray-900'}`}>
                                {expiresDate.toLocaleDateString()}
                              </span>
                            )
                          },
                        },
                      ]}
                      data={userKeys}
                      loading={keysLoading}
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
            {drawerTab === 'security' && (
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
                            // In a real app, this would trigger a setup flow
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
                        // In a real app, this would trigger passkey registration
                        const newPasskey = {
                          id: `passkey-${Date.now()}`,
                          name: 'New Device',
                          created_at: new Date().toISOString(),
                          device_type: 'unknown'
                        }
                        setPasskeys([...passkeys, newPasskey])
                      }}
                      className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                    >
                      Add Passkey
                    </button>
                  </div>
                  
                  {passkeys.length > 0 ? (
                    <div className="space-y-3">
                      {passkeys.map((passkey) => (
                        <div
                          key={passkey.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                              <svg
                                className="h-5 w-5 text-gray-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{passkey.name}</div>
                              <div className="text-xs text-gray-500">
                                Created {new Date(passkey.created_at).toLocaleDateString()}
                                {passkey.last_used_at && (
                                  <> · Last used {new Date(passkey.last_used_at).toLocaleDateString()}</>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove the passkey "${passkey.name}"?`)) {
                                setPasskeys(passkeys.filter(p => p.id !== passkey.id))
                              }
                            }}
                            className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
                      <p className="text-sm text-gray-600">No passkeys configured</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Passkeys allow you to sign in without a password using your device's biometric authentication
                      </p>
                    </div>
                  )}
                </div>

                {/* Account Management */}
                <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Account Management</h3>
                      <p className="text-xs text-gray-500 mt-1">Unlock account and manage password reset access</p>
                    </div>
                  </div>

                  {/* Account Lock Status */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-900">Account Status</dt>
                        <dd className="mt-1">
                          {(() => {
                            // Mock: Check if account is locked (in real app, this would come from user data)
                            const isLocked = (selectedUser as any).account_locked || false
                            const lockReason = (selectedUser as any).lock_reason || 'Not locked'
                            const lockedAt = (selectedUser as any).locked_at
                            const lockedBy = (selectedUser as any).locked_by || 'System'
                            
                            return (
                              <div className="space-y-2">
                                {isLocked ? (
                                  <>
                                    <StatusChip status="suspended" size="sm" />
                                    <div className="text-xs text-gray-500 mt-1">
                                      <div>Reason: {lockReason}</div>
                                      {lockedAt && (
                                        <div>Locked: {new Date(lockedAt).toLocaleString()}</div>
                                      )}
                                      <div>Locked by: {lockedBy}</div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <StatusChip status="active" size="sm" />
                                    <div className="text-xs text-gray-500 mt-1">Account is active and accessible</div>
                                  </>
                                )}
                              </div>
                            )
                          })()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-900">Password Reset Status</dt>
                        <dd className="mt-1">
                          {(() => {
                            // Mock: Check if password reset is enabled
                            const resetEnabled = (selectedUser as any).password_reset_enabled !== false
                            const lastResetRequest = (selectedUser as any).last_password_reset_request
                            
                            return (
                              <div className="space-y-2">
                                {resetEnabled ? (
                                  <>
                                    <StatusChip status="active" size="sm" />
                                    {lastResetRequest && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Last request: {new Date(lastResetRequest).toLocaleString()}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <StatusChip status="inactive" size="sm" />
                                )}
                              </div>
                            )
                          })()}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Unlock Account</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Remove account lock to allow user to sign in again
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to unlock this account? The user will be able to sign in immediately.')) {
                            // TODO: Implement unlock account functionality
                            console.log('Unlock account for user:', selectedUser?.id)
                            // await apiClient.unlockUserAccount(selectedUser?.id)
                            // Show success message
                            alert('Account unlocked successfully')
                          }
                        }}
                        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        disabled={!(selectedUser as any).account_locked}
                      >
                        Unlock Account
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Send Password Reset Email</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Send a password reset link to the user's email address
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm(`Send password reset email to ${selectedUser.email}?`)) {
                            // TODO: Implement send password reset email functionality
                            console.log('Send password reset email for user:', selectedUser?.id)
                            // await apiClient.sendPasswordResetEmail(selectedUser?.id)
                            // Show success message
                            alert('Password reset email sent successfully')
                          }
                        }}
                        className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
                      >
                        Send Reset Email
                      </button>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">Enable Password Reset</div>
                        <div className="text-xs text-gray-500 mt-1">
                          Allow user to request password reset via email
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const currentStatus = (selectedUser as any).password_reset_enabled !== false
                          const action = currentStatus ? 'disable' : 'enable'
                          if (confirm(`Are you sure you want to ${action} password reset for this user?`)) {
                            // TODO: Implement enable/disable password reset functionality
                            console.log(`${action} password reset for user:`, selectedUser?.id)
                            // await apiClient.setPasswordResetEnabled(selectedUser?.id, !currentStatus)
                            // Show success message
                            alert(`Password reset ${action}d successfully`)
                          }
                        }}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          (selectedUser as any).password_reset_enabled !== false
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                        }`}
                      >
                        {(selectedUser as any).password_reset_enabled !== false ? 'Disable Reset' : 'Enable Reset'}
                      </button>
                    </div>
                  </div>

                  {/* Lock History */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Lock Events</h4>
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
                      {(() => {
                        // Mock lock history data
                        const lockHistory = [
                          {
                            id: '1',
                            action: 'locked',
                            reason: 'Too many failed login attempts',
                            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                            performed_by: 'System',
                            ip_address: '192.168.1.100'
                          },
                          {
                            id: '2',
                            action: 'unlocked',
                            reason: 'Admin unlock',
                            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
                            performed_by: 'Admin User',
                            ip_address: '10.0.0.1'
                          }
                        ]

                        if (lockHistory.length === 0) {
                          return (
                            <div className="rounded-lg border border-gray-200 bg-white p-3 text-center">
                              <p className="text-sm text-gray-600">No lock events recorded</p>
                            </div>
                          )
                        }

                        return lockHistory.map((event) => (
                          <div
                            key={event.id}
                            className="rounded-lg border border-gray-200 bg-white p-3"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium text-gray-900 capitalize">
                                    Account {event.action}
                                  </span>
                                  <StatusChip 
                                    status={event.action === 'locked' ? 'suspended' : 'active'} 
                                    size="sm" 
                                  />
                                </div>
                                <div className="text-xs text-gray-500">
                                  <div>Reason: {event.reason}</div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                <div className="mb-1">
                                  <span className="font-medium text-gray-700">By:</span> {event.performed_by}
                                </div>
                                <div className="mb-1">
                                  <span className="font-medium text-gray-700">IP:</span> {event.ip_address}
                                </div>
                                <div>
                                  <span className="font-medium text-gray-700">Time:</span> {new Date(event.timestamp).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sessions Tab */}
            {drawerTab === 'sessions' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Active Sessions</h3>
                  <div className="space-y-2">
                    <div className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="font-medium text-gray-900">Chrome on macOS</div>
                          <StatusChip status="active" size="sm" />
                        </div>
                        <div className="text-sm text-gray-500">{selectedUser.last_login_ip}</div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-gray-500">
                          Last active: {selectedUser.last_login_at ? new Date(selectedUser.last_login_at).toLocaleString() : 'Never'}
                        </div>
                        <button
                          onClick={async () => {
                            if (confirm('Are you sure you want to revoke this session? The user will be signed out immediately.')) {
                              // TODO: Implement revoke session functionality
                              console.log('Revoke session for user:', selectedUser?.id)
                              // await apiClient.revokeUserSession(selectedUser?.id, sessionId)
                              // Show success message
                              alert('Session revoked successfully')
                            }
                          }}
                          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Logins</h3>
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
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                      <div key={i} className="rounded-lg border border-gray-200 p-3">
                        <div className="text-sm text-gray-900">IP: {selectedUser.last_login_ip || 'N/A'}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {i === 1 ? 'Today' : `${i} days ago`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Usage Tab */}
            {drawerTab === 'usage' && (
              <div className="space-y-6">
                {/* KPI Cards */}
              <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    {(() => {
                      const allotments = userTenant?.plan ? getPlanAllotments(userTenant.plan) : { contracts: null, signers: null, storage: null }
                      const contractsAllotment = allotments.contracts
                      
                      return (
                        <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <div className="text-2xl font-bold text-gray-900">
                            {contractsAllotment !== null 
                              ? `${totalContracts} / ${contractsAllotment}`
                              : totalContracts.toLocaleString()
                            }
                      </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Total Contracts
                            {contractsAllotment === null && <span className="ml-1">(Unlimited)</span>}
                    </div>
                        </div>
                      )
                    })()}
                    <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <div className="text-2xl font-bold text-gray-900">
                        {totalDocuments}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Total Documents</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <div className="text-2xl font-bold text-gray-900">
                        {totalSignatureRequests}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Signature Requests</div>
                    </div>
                    {(() => {
                      const allotments = userTenant?.plan ? getPlanAllotments(userTenant.plan) : { contracts: null, signers: null, storage: null }
                      const signersAllotment = allotments.signers
                      
                      return (
                        <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                          <div className="text-2xl font-bold text-gray-900">
                            {signersAllotment !== null 
                              ? `${totalSigners} / ${signersAllotment}`
                              : totalSigners.toLocaleString()
                            }
                  </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Total Signers
                            {signersAllotment === null && <span className="ml-1">(Unlimited)</span>}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {(() => {
                      const allotments = userTenant?.plan ? getPlanAllotments(userTenant.plan) : { contracts: null, signers: null, storage: null }
                      const storageAllotment = allotments.storage
                      
                      // Format storage with appropriate precision
                      const formatStorage = (gb: number) => {
                        if (gb < 1) {
                          // Show in MB if less than 1 GB for better readability
                          const mb = gb * 1024
                          return `${mb.toFixed(2)} MB`
                        } else {
                          // Show 2 decimal places for values 1 GB or more
                          return `${gb.toFixed(2)} GB`
                        }
                      }
                      
                      return (
                        <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                          <div className="text-2xl font-bold text-gray-900">
                            {storageAllotment !== null 
                              ? `${formatStorage(storageUsedGB)} / ${storageAllotment} GB`
                              : formatStorage(storageUsedGB)
                            }
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Storage Used
                            {storageAllotment === null && <span className="ml-1">(Unlimited)</span>}
                          </div>
                        </div>
                      )
                    })()}
                    <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <div className="text-2xl font-bold text-gray-900">
                        {totalTransactions}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Total Transactions</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <div className="text-2xl font-bold text-gray-900">
                        ${totalTransactionCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Total Transaction Cost</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <div className="text-2xl font-bold text-gray-900">
                        {totalAlgoLockup} ALGO
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Total Algo Lockup</div>
                    </div>
                  </div>
                </div>

                {/* Tabbed Table */}
                <div className="space-y-4">
                  {/* Tabs */}
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                      {(['contracts', 'documents', 'signature_requests', 'signatures'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setUsageTab(tab)}
                          className={`
                            whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium capitalize
                            ${
                              usageTab === tab
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }
                          `}
                        >
                          {tab === 'signature_requests' ? 'Signature Requests' : tab}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Table Content */}
                  <div className="overflow-hidden rounded-lg bg-white" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    {usageTab === 'contracts' && (
                      <DataTable
                        columns={[
                          {
                            key: 'escra_public_contract_id',
                            header: 'Contract ID',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm font-mono text-gray-900">{item.escra_public_contract_id || 'N/A'}</span>
                            ),
                          },
                          {
                            key: 'on_chain_id',
                            header: 'On-Chain ID',
                            sortable: true,
                            render: (item: any) => renderCopyableOnChainId(item.on_chain_id),
                          },
                          {
                            key: 'user_creator_id',
                            header: 'Creator ID',
                            sortable: true,
                            render: (item: any) => {
                              if (!item.user_creator_id) {
                                return <span className="text-sm font-mono text-gray-900">N/A</span>
                              }
                              return (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    try {
                                      const user = await apiClient.getUser(item.user_creator_id)
                                      setSelectedUser(user)
                                    } catch (error) {
                                      console.error('Failed to fetch user:', error)
                                    }
                                  }}
                                  className="text-sm font-mono text-primary-600 hover:text-primary-900 hover:underline"
                                >
                                  {formatEscraUserId(item.user_creator_id)}
                                </button>
                              )
                            },
                          },
                          {
                            key: 'status',
                            header: (
                              <div className="normal-case">
                                <div>CONTRACT</div>
                                <div className="text-xs font-normal">STATUS</div>
                              </div>
                            ),
                            sortable: true,
                            render: (item: any) => (
                              <StatusChip status={item.status || 'N/A'} />
                            ),
                          },
                          {
                            key: 'collaborator_count',
                            header: 'Collaborator Count',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.collaborator_count || 0}</span>
                            ),
                          },
                          {
                            key: 'document_count',
                            header: 'Document Count',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.document_count || 0}</span>
                            ),
                          },
                          {
                            key: 'created_date',
                            header: 'Created Date',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">
                                {item.created_date ? new Date(item.created_date).toLocaleDateString() : 'N/A'}
                              </span>
                            ),
                          },
                          {
                            key: 'last_update',
                            header: 'Last Update',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">
                                {item.last_update ? new Date(item.last_update).toLocaleDateString() : 'N/A'}
                              </span>
                            ),
                          },
                          {
                            key: 'transaction_count',
                            header: 'Transaction Count',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.transaction_count || 0}</span>
                            ),
                          },
                          {
                            key: 'lockup',
                            header: 'Lockup',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.lockup || 0} ALGO</span>
                            ),
                          },
                        ]}
                        data={filteredContractsData?.items || []}
                        loading={contractsLoading}
                        emptyMessage="No contracts found"
                      />
                    )}

                    {usageTab === 'documents' && (
                      <DataTable
                        columns={[
                          {
                            key: 'escra_public_document_id',
                            header: 'Document ID',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm font-mono text-gray-900">{item.escra_public_document_id || 'N/A'}</span>
                            ),
                          },
                          {
                            key: 'on_chain_id',
                            header: 'On-Chain ID',
                            sortable: true,
                            render: (item: any) => renderCopyableOnChainId(item.on_chain_id),
                          },
                          {
                            key: 'user_creator_id',
                            header: 'Creator ID',
                            sortable: true,
                            render: (item: any) => {
                              if (!item.user_creator_id) {
                                return <span className="text-sm font-mono text-gray-900">N/A</span>
                              }
                              return (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    try {
                                      const user = await apiClient.getUser(item.user_creator_id)
                                      setSelectedUser(user)
                                    } catch (error) {
                                      console.error('Failed to fetch user:', error)
                                    }
                                  }}
                                  className="text-sm font-mono text-primary-600 hover:text-primary-900 hover:underline"
                                >
                                  {formatEscraUserId(item.user_creator_id)}
                                </button>
                              )
                            },
                          },
                          {
                            key: 'status',
                            header: (
                              <div className="normal-case">
                                <div>DOCUMENT</div>
                                <div className="text-xs font-normal">STATUS</div>
                              </div>
                            ),
                            sortable: true,
                            render: (item: any) => (
                              <StatusChip status={item.status || 'N/A'} />
                            ),
                          },
                          {
                            key: 'file_type',
                            header: 'File Type',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{(item.file_type || 'N/A').toUpperCase()}</span>
                            ),
                          },
                          {
                            key: 'file_size',
                            header: 'File Size',
                            sortable: true,
                            render: (item: any) => {
                              const sizeBytes = item.file_size || 0
                              const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2)
                              return <span className="text-sm text-gray-900">{sizeMB} MB</span>
                            },
                          },
                          {
                            key: 'created_date',
                            header: 'Created Date',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">
                                {item.created_date ? new Date(item.created_date).toLocaleDateString() : 'N/A'}
                              </span>
                            ),
                          },
                          {
                            key: 'last_update',
                            header: 'Last Update',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">
                                {item.last_update ? new Date(item.last_update).toLocaleDateString() : 'N/A'}
                              </span>
                            ),
                          },
                          {
                            key: 'transaction_count',
                            header: 'Transaction Count',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.transaction_count || 0}</span>
                            ),
                          },
                          {
                            key: 'lockup',
                            header: 'Lockup',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.lockup || 0} ALGO</span>
                            ),
                          },
                        ]}
                        data={filteredDocumentsData?.items || []}
                        loading={documentsLoading}
                        emptyMessage="No documents found"
                      />
                    )}

                    {usageTab === 'signature_requests' && (
                      <DataTable
                        columns={[
                          {
                            key: 'escra_public_signature_request_id',
                            header: 'Request ID',
                            sortable: true,
                            render: (item: any) => (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedSignatureRequest(item)
                                }}
                                className="text-sm font-mono text-primary-600 hover:text-primary-900 hover:underline"
                              >
                                {item.escra_public_signature_request_id || 'N/A'}
                              </button>
                            ),
                          },
                          {
                            key: 'document_id',
                            header: 'Document ID',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm font-mono text-gray-900">{item.document_id || 'N/A'}</span>
                            ),
                          },
                          {
                            key: 'user_creator_id',
                            header: 'Creator ID',
                            sortable: true,
                            render: (item: any) => {
                              if (!item.user_creator_id) {
                                return <span className="text-sm font-mono text-gray-900">N/A</span>
                              }
                              return (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    try {
                                      const user = await apiClient.getUser(item.user_creator_id)
                                      setSelectedUser(user)
                                    } catch (error) {
                                      console.error('Failed to fetch user:', error)
                                    }
                                  }}
                                  className="text-sm font-mono text-primary-600 hover:text-primary-900 hover:underline"
                                >
                                  {formatEscraUserId(item.user_creator_id)}
                                </button>
                              )
                            },
                          },
                          {
                            key: 'signer_count',
                            header: 'Required Signers',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.signer_count || 0}</span>
                            ),
                          },
                          {
                            key: 'signed_count',
                            header: 'Signed Count',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.signed_count || 0}</span>
                            ),
                          },
                          {
                            key: 'created_date',
                            header: 'Created Date',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">
                                {item.created_date ? new Date(item.created_date).toLocaleDateString() : 'N/A'}
                              </span>
                            ),
                          },
                          {
                            key: 'last_update',
                            header: 'Last Update',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">
                                {item.last_update ? new Date(item.last_update).toLocaleDateString() : 'N/A'}
                              </span>
                            ),
                          },
                          {
                            key: 'transaction_count',
                            header: 'Transaction Count',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.transaction_count || 0}</span>
                            ),
                          },
                        ]}
                        data={filteredSignatureRequestsData?.items || []}
                        loading={signatureRequestsLoading}
                        emptyMessage="No signature requests found"
                      />
                    )}

                    {usageTab === 'signatures' && (
                      <DataTable
                        columns={[
                          {
                            key: 'escra_public_signature_id',
                            header: 'Signature ID',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm font-mono text-gray-900">{item.escra_public_signature_id || 'N/A'}</span>
                            ),
                          },
                          {
                            key: 'request_id',
                            header: 'Request ID',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm font-mono text-gray-900">{item.request_id || 'N/A'}</span>
                            ),
                          },
                          {
                            key: 'document_id',
                            header: 'Document ID',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm font-mono text-gray-900">{item.document_id || 'N/A'}</span>
                            ),
                          },
                          {
                            key: 'contract_id',
                            header: 'Contract ID',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm font-mono text-gray-900">{item.contract_id || 'N/A'}</span>
                            ),
                          },
                          {
                            key: 'signer_user_id',
                            header: 'User ID',
                            sortable: true,
                            render: (item: any) => {
                              if (!item.signer_user_id) {
                                return <span className="text-sm font-mono text-gray-900">N/A</span>
                              }
                              return (
                                <span className="text-sm font-mono text-gray-900">
                                  {formatEscraUserId(item.signer_user_id)}
                                </span>
                              )
                            },
                          },
                          {
                            key: 'timestamp',
                            header: 'Timestamp',
                            sortable: true,
                            render: (item: any) => {
                              if (!item.timestamp) return <span className="text-sm text-gray-900">N/A</span>
                              try {
                                const date = new Date(item.timestamp)
                                const dateStr = date.toLocaleDateString('en-US', { timeZone: 'UTC' })
                                const timeStr = date.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false })
                                return (
                                  <span className="text-sm text-gray-900">
                                    {dateStr} {timeStr} UTC
                                  </span>
                                )
                              } catch (error) {
                                return <span className="text-sm text-gray-900">Invalid Date</span>
                              }
                            },
                          },
                        ]}
                        data={signatureEventsData?.items || []}
                        loading={signatureEventsLoading}
                        emptyMessage="No signatures found"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </Drawer>
      )}

      {/* Tenant Detail Drawer */}
      {selectedTenant && (
        <Drawer
          isOpen={!!selectedTenant}
          onClose={() => {
            // Don't close tenant drawer if signature request drawer is open
            if (!selectedSignatureRequestRef.current) {
              setSelectedTenant(null)
              setTenantDrawerTab('overview')
            }
          }}
          title={selectedTenant.name}
          size="3xl"
        >
          <div className="space-y-6">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {(['overview', 'users_roles', 'usage', 'kyb'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTenantDrawerTab(tab)}
                    className={`
                      whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium capitalize
                      ${
                        tenantDrawerTab === tab
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
            {tenantDrawerTab === 'overview' && (
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
                        {selectedTenant.status === 'trial' ? (
                          <StatusChip status="inactive" />
                        ) : (
                          <StatusChip status={selectedTenant.status} />
                        )}
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
                          status={(selectedTenant.metadata as any)?.verification_status || 'pending'}
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
                      onClick={() => setTenantMailingAddressEditMode(!tenantMailingAddressEditMode)}
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
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Mailing Address</h4>
                      <div className="space-y-4">
                        <div>
                          <dt className="text-sm font-medium text-gray-900">Address 1</dt>
                          <dd className="mt-1">
                            <input
                              type="text"
                              value={tenantAddress1}
                              onChange={(e) => setTenantAddress1(e.target.value)}
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
                              value={tenantAddress2}
                              onChange={(e) => setTenantAddress2(e.target.value)}
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
                                value={tenantCity}
                                onChange={(e) => setTenantCity(e.target.value)}
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
                                value={tenantState}
                                onChange={(e) => setTenantState(e.target.value)}
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
                                value={tenantZipCode}
                                onChange={(e) => setTenantZipCode(e.target.value)}
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
                                value={tenantCountry}
                                onChange={(e) => setTenantCountry(e.target.value)}
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

            {tenantDrawerTab === 'users_roles' && (
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
                          // Only show public key for users who meet criteria:
                          // 1. User status is active
                          // 2. User verification status is approved
                          // 3. Tenant status is active
                          // 4. User has keys
                          if (user.status !== UserStatus.ACTIVE) {
                            return <span className="text-sm font-mono text-gray-900">N/A</span>
                          }
                          
                          const verificationStatus = getUserVerificationStatus(user)
                          if (verificationStatus !== 'approved') {
                            return <span className="text-sm font-mono text-gray-900">N/A</span>
                          }
                          
                          // Check if tenant is active
                          const tenant = tenantsData?.items?.find((t: Tenant) => t.escra_public_org_id === user.tenant_id)
                          if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
                            return <span className="text-sm font-mono text-gray-900">N/A</span>
                          }
                          
                          // Get public key from user's keys (wallet_address from active key)
                          const userKeys = (allKeysForTable?.items || []).filter((key: Key) => 
                            key.user_id === user.escra_public_user_id && key.status === KeyStatus.ACTIVE
                          )
                          const activeKey = userKeys.find((key: Key) => key.wallet_address) || userKeys[0]
                          const publicKey = activeKey?.wallet_address || (user as any).public_key
                          
                          if (!publicKey) {
                            return <span className="text-sm font-mono text-gray-900">N/A</span>
                          }
                          
                          // Truncate: show first 6 and last 4 characters
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
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {user.first_name} {user.last_name}
                              </span>
                              {user.tier === TenantPlan.TRIAL && (
                                <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                                  Trial
                                </span>
                              )}
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
                          <div className="normal-case">
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
                          <div className="normal-case">
                            <div>Verification</div>
                            <div className="text-xs font-normal">Status</div>
                          </div>
                        ),
                        sortable: true,
                        render: (user: User) => {
                          const status = getUserVerificationStatus(user)
                          
                          // Apply same color scheme as users table
                          let colorClass = 'text-gray-600' // Default
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
                                setDrawerTab('profile') // Reset to profile tab when opening
                              }}
                              className="text-primary-600 hover:text-primary-900 transition-colors"
                              title="Edit"
                            >
                              <IconUserCog className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                // TODO: Implement remove user functionality
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

            {tenantDrawerTab === 'usage' && (
              <div className="space-y-6">
                {/* KPI Cards */}
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    {(() => {
                      const allotments = getPlanAllotments(selectedTenant.plan)
                      const contractsAllotment = allotments.contracts
                      
                      return (
                        <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                          <div className="text-2xl font-bold text-gray-900">
                            {contractsAllotment !== null 
                              ? `${tenantTotalContracts} / ${contractsAllotment}`
                              : tenantTotalContracts.toLocaleString()
                            }
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Total Contracts
                            {contractsAllotment === null && <span className="ml-1">(Unlimited)</span>}
                          </div>
                        </div>
                      )
                    })()}
                    <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <div className="text-2xl font-bold text-gray-900">
                        {tenantTotalDocuments}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Total Documents</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <div className="text-2xl font-bold text-gray-900">
                        {tenantTotalSignatureRequests}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Signature Requests</div>
                    </div>
                    {(() => {
                      const allotments = getPlanAllotments(selectedTenant.plan)
                      const signersAllotment = allotments.signers
                      
                      return (
                        <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                          <div className="text-2xl font-bold text-gray-900">
                            {signersAllotment !== null 
                              ? `${tenantTotalSigners} / ${signersAllotment}`
                              : tenantTotalSigners.toLocaleString()
                            }
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Total Signers
                            {signersAllotment === null && <span className="ml-1">(Unlimited)</span>}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {(() => {
                      const allotments = getPlanAllotments(selectedTenant.plan)
                      const storageAllotment = allotments.storage
                      
                      const formatStorage = (gb: number) => {
                        if (gb < 1) {
                          const mb = gb * 1024
                          return `${mb.toFixed(2)} MB`
                        } else {
                          return `${gb.toFixed(2)} GB`
                        }
                      }
                      
                      return (
                        <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                          <div className="text-2xl font-bold text-gray-900">
                            {storageAllotment !== null 
                              ? `${formatStorage(tenantStorageUsedGB)} / ${storageAllotment} GB`
                              : formatStorage(tenantStorageUsedGB)
                            }
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Storage Used
                            {storageAllotment === null && <span className="ml-1">(Unlimited)</span>}
                          </div>
                        </div>
                      )
                    })()}
                    <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <div className="text-2xl font-bold text-gray-900">
                        {tenantTotalTransactions}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Total Transactions</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <div className="text-2xl font-bold text-gray-900">
                        ${tenantTotalTransactionCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Total Transaction Cost</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                      <div className="text-2xl font-bold text-gray-900">
                        {tenantTotalAlgoLockup} ALGO
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Total Algo Lockup</div>
                    </div>
                  </div>
                </div>

                {/* Tabbed Table */}
                <div className="space-y-4">
                  {/* Tabs */}
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                      {(['contracts', 'documents', 'signature_requests'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setTenantUsageTab(tab)}
                          className={`
                            whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium capitalize
                            ${
                              tenantUsageTab === tab
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                            }
                          `}
                        >
                          {tab === 'signature_requests' ? 'Signature Requests' : tab}
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Table Content */}
                  <div className="overflow-hidden rounded-lg bg-white" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    {tenantUsageTab === 'contracts' && (
                      <DataTable
                        columns={[
                          {
                            key: 'escra_public_contract_id',
                            header: 'Contract ID',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm font-mono text-gray-900">{item.escra_public_contract_id || 'N/A'}</span>
                            ),
                          },
                          {
                            key: 'on_chain_id',
                            header: 'On-Chain ID',
                            sortable: true,
                            render: (item: any) => renderCopyableOnChainId(item.on_chain_id),
                          },
                          {
                            key: 'user_creator_id',
                            header: 'Creator ID',
                            sortable: true,
                            render: (item: any) => {
                              if (!item.user_creator_id) {
                                return <span className="text-sm font-mono text-gray-900">N/A</span>
                              }
                              return (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    try {
                                      const user = await apiClient.getUser(item.user_creator_id)
                                      setSelectedUser(user)
                                    } catch (error) {
                                      console.error('Failed to fetch user:', error)
                                    }
                                  }}
                                  className="text-sm font-mono text-primary-600 hover:text-primary-900 hover:underline"
                                >
                                  {formatEscraUserId(item.user_creator_id)}
                                </button>
                              )
                            },
                          },
                          {
                            key: 'status',
                            header: (
                              <div className="normal-case">
                                <div>CONTRACT</div>
                                <div className="text-xs font-normal">STATUS</div>
                              </div>
                            ),
                            sortable: true,
                            render: (item: any) => (
                              <StatusChip status={item.status || 'N/A'} />
                            ),
                          },
                          {
                            key: 'collaborator_count',
                            header: 'Collaborator Count',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.collaborator_count || 0}</span>
                            ),
                          },
                          {
                            key: 'document_count',
                            header: 'Document Count',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.document_count || 0}</span>
                            ),
                          },
                          {
                            key: 'created_date',
                            header: 'Created Date',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">
                                {item.created_date ? new Date(item.created_date).toLocaleDateString() : 'N/A'}
                              </span>
                            ),
                          },
                          {
                            key: 'transaction_count',
                            header: 'Transaction Count',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.transaction_count || 0}</span>
                            ),
                          },
                          {
                            key: 'lockup',
                            header: 'Lockup',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.lockup || 0} ALGO</span>
                            ),
                          },
                        ]}
                        data={filteredTenantContractsTableData?.items || []}
                        loading={tenantContractsLoading}
                        emptyMessage="No contracts found"
                      />
                    )}

                    {tenantUsageTab === 'documents' && (
                      <DataTable
                        columns={[
                          {
                            key: 'escra_public_document_id',
                            header: 'Document ID',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm font-mono text-gray-900">{item.escra_public_document_id || 'N/A'}</span>
                            ),
                          },
                          {
                            key: 'on_chain_id',
                            header: 'On-Chain ID',
                            sortable: true,
                            render: (item: any) => renderCopyableOnChainId(item.on_chain_id),
                          },
                          {
                            key: 'user_creator_id',
                            header: 'Creator ID',
                            sortable: true,
                            render: (item: any) => {
                              if (!item.user_creator_id) {
                                return <span className="text-sm font-mono text-gray-900">N/A</span>
                              }
                              return (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    try {
                                      const user = await apiClient.getUser(item.user_creator_id)
                                      setSelectedUser(user)
                                    } catch (error) {
                                      console.error('Failed to fetch user:', error)
                                    }
                                  }}
                                  className="text-sm font-mono text-primary-600 hover:text-primary-900 hover:underline"
                                >
                                  {formatEscraUserId(item.user_creator_id)}
                                </button>
                              )
                            },
                          },
                          {
                            key: 'status',
                            header: (
                              <div className="normal-case">
                                <div>DOCUMENT</div>
                                <div className="text-xs font-normal">STATUS</div>
                              </div>
                            ),
                            sortable: true,
                            render: (item: any) => (
                              <StatusChip status={item.status || 'N/A'} />
                            ),
                          },
                          {
                            key: 'file_type',
                            header: 'File Type',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.file_type || 'N/A'}</span>
                            ),
                          },
                          {
                            key: 'file_size',
                            header: 'File Size',
                            sortable: true,
                            render: (item: any) => {
                              const sizeBytes = item.file_size || 0
                              const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2)
                              return <span className="text-sm text-gray-900">{sizeMB} MB</span>
                            },
                          },
                          {
                            key: 'created_date',
                            header: 'Created Date',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">
                                {item.created_date ? new Date(item.created_date).toLocaleDateString() : 'N/A'}
                              </span>
                            ),
                          },
                          {
                            key: 'transaction_count',
                            header: 'Transaction Count',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.transaction_count || 0}</span>
                            ),
                          },
                          {
                            key: 'lockup',
                            header: 'Lockup',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.lockup || 0} ALGO</span>
                            ),
                          },
                        ]}
                        data={filteredTenantDocumentsTableData?.items || []}
                        loading={tenantDocumentsLoading}
                        emptyMessage="No documents found"
                      />
                    )}

                    {tenantUsageTab === 'signature_requests' && (
                      <DataTable
                        columns={[
                          {
                            key: 'escra_public_signature_request_id',
                            header: 'Request ID',
                            sortable: true,
                            render: (item: any) => (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedSignatureRequest(item)
                                }}
                                className="text-sm font-mono text-primary-600 hover:text-primary-900 hover:underline"
                              >
                                {item.escra_public_signature_request_id || 'N/A'}
                              </button>
                            ),
                          },
                          {
                            key: 'document_id',
                            header: 'Document ID',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm font-mono text-gray-900">{item.document_id || 'N/A'}</span>
                            ),
                          },
                          {
                            key: 'user_creator_id',
                            header: 'Creator ID',
                            sortable: true,
                            render: (item: any) => {
                              if (!item.user_creator_id) {
                                return <span className="text-sm font-mono text-gray-900">N/A</span>
                              }
                              return (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    try {
                                      const user = await apiClient.getUser(item.user_creator_id)
                                      setSelectedUser(user)
                                    } catch (error) {
                                      console.error('Failed to fetch user:', error)
                                    }
                                  }}
                                  className="text-sm font-mono text-primary-600 hover:text-primary-900 hover:underline"
                                >
                                  {formatEscraUserId(item.user_creator_id)}
                                </button>
                              )
                            },
                          },
                          {
                            key: 'signer_count',
                            header: 'Required Signers',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.signer_count || 0}</span>
                            ),
                          },
                          {
                            key: 'signed_count',
                            header: 'Signed Count',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.signed_count || 0}</span>
                            ),
                          },
                          {
                            key: 'created_date',
                            header: 'Created Date',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">
                                {item.created_date ? new Date(item.created_date).toLocaleDateString() : 'N/A'}
                              </span>
                            ),
                          },
                          {
                            key: 'transaction_count',
                            header: 'Transaction Count',
                            sortable: true,
                            render: (item: any) => (
                              <span className="text-sm text-gray-900">{item.transaction_count || 0}</span>
                            ),
                          },
                        ]}
                        data={filteredTenantSignatureRequestsTableData?.items || []}
                        loading={tenantSignatureRequestsLoading}
                        emptyMessage="No signature requests found"
                      />
                    )}

                  </div>
                </div>
              </div>
            )}

            {tenantDrawerTab === 'kyb' && (
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
                          status={(selectedTenant.metadata as any)?.verification_status || 'pending'}
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

      {/* Signature Request Detail Drawer */}
      {selectedSignatureRequest && (
        <Drawer
          isOpen={!!selectedSignatureRequest}
          onClose={() => setSelectedSignatureRequest(null)}
          title="Signature Request Details"
          size="2xl"
          zIndex={70}
        >
          <div className="space-y-6">
            {/* Back Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedSignatureRequest(null)
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
              {selectedTenant ? 'Back to Tenant' : 'Back to User'}
            </button>

            {/* Request ID */}
            <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
              <dl className="grid grid-cols-4 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-900">Request ID</dt>
                  <dd className="mt-1">
                    <span className="text-sm font-mono text-gray-900">{selectedSignatureRequest.escra_public_signature_request_id || 'N/A'}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-900">Creator ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {selectedSignatureRequest.user_creator_id ? (
                      <span className="font-mono">{formatEscraUserId(selectedSignatureRequest.user_creator_id)}</span>
                    ) : (
                      'N/A'
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-900">Document ID</dt>
                  <dd className="mt-1">
                    <span className="text-sm font-mono text-gray-900">{selectedSignatureRequest.document_id || 'N/A'}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-900">Contract ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {signatureRequestDocumentData?.contractId ? (
                      <span className="font-mono">{signatureRequestDocumentData.contractId}</span>
                    ) : (
                      'N/A'
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Required Signers Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Required Signers ({selectedSignatureRequest.signer_count || 0})
              </h3>
              {selectedSignatureRequest.required_signers && selectedSignatureRequest.required_signers.length > 0 ? (
                <div className="rounded-lg bg-white border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                          User ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/3">
                          Public Key
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        // Separate internal and external signers
                        const internalSigners: any[] = []
                        const externalSigners: any[] = []
                        
                        selectedSignatureRequest.required_signers.forEach((requiredSigner: any) => {
                          const isInternal = isInternalSigner(requiredSigner.user_id)
                          if (isInternal) {
                            internalSigners.push(requiredSigner)
                          } else {
                            externalSigners.push(requiredSigner)
                          }
                        })
                        
                        return (
                          <>
                            {/* Internal Signers */}
                            {internalSigners.length > 0 && (
                              <>
                                <tr>
                                  <td colSpan={2} className="px-6 py-1 bg-gray-50 border-t border-b border-gray-200">
                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                      Internal ({internalSigners.length})
                                    </span>
                                  </td>
                                </tr>
                                {internalSigners.map((requiredSigner: any, index: number) => {
                                  const publicKey = requiredSigner.address || ''
                                  const truncated = publicKey.length > 24
                                    ? `${publicKey.slice(0, 12)}...${publicKey.slice(-12)}`
                                    : publicKey
                                  
                                  return (
                                    <tr key={`internal-${index}`}>
                                      <td className="px-6 py-4 text-sm">
                                        <span className="font-mono text-gray-900">
                                          {requiredSigner.user_id ? formatEscraUserId(requiredSigner.user_id) : 'N/A'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm">
                                        {publicKey ? (
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-gray-900">{truncated}</span>
                                            <CopyButton text={publicKey} />
                                          </div>
                                        ) : (
                                          <span className="text-gray-500">N/A</span>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </>
                            )}
                            
                            {/* External Signers */}
                            {externalSigners.length > 0 && (
                              <>
                                <tr>
                                  <td colSpan={2} className="px-6 py-1 bg-gray-50 border-t border-b border-gray-200">
                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                      External ({externalSigners.length})
                                    </span>
                                  </td>
                                </tr>
                                {externalSigners.map((requiredSigner: any, index: number) => {
                                  const publicKey = requiredSigner.address || ''
                                  const truncated = publicKey.length > 24
                                    ? `${publicKey.slice(0, 12)}...${publicKey.slice(-12)}`
                                    : publicKey
                                  
                                  return (
                                    <tr key={`external-${index}`}>
                                      <td className="px-6 py-4 text-sm">
                                        <span className="font-mono text-gray-900">
                                          {requiredSigner.user_id ? formatEscraUserId(requiredSigner.user_id) : 'N/A'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm">
                                        {publicKey ? (
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-gray-900">{truncated}</span>
                                            <CopyButton text={publicKey} />
                                          </div>
                                        ) : (
                                          <span className="text-gray-500">N/A</span>
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </>
                            )}
                          </>
                        )
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                  <p className="text-sm text-gray-600">
                    {selectedSignatureRequest.signer_count || 0} signer{selectedSignatureRequest.signer_count !== 1 ? 's' : ''} required
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Required signer details are not available for this request.
                  </p>
                </div>
              )}
            </div>

            {/* Signers Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Signers ({filteredSignatureRequestEvents.length})
              </h3>
              {signatureRequestEventsLoading ? (
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  Loading signatures...
                </div>
              ) : filteredSignatureRequestEvents.length > 0 ? (
                <div className="rounded-lg bg-white border border-gray-200 overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                          User ID
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                          Public Key
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                          Timestamp
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        // Separate internal and external signers
                        const internalSigners: any[] = []
                        const externalSigners: any[] = []
                        
                        filteredSignatureRequestEvents.forEach((event: any) => {
                          const isInternal = event.signer_user_id ? isInternalSigner(event.signer_user_id) : false
                          if (isInternal) {
                            internalSigners.push(event)
                          } else {
                            externalSigners.push(event)
                          }
                        })
                        
                        return (
                          <>
                            {/* Internal Signers */}
                            {internalSigners.length > 0 && (
                              <>
                                <tr>
                                  <td colSpan={3} className="px-6 py-1 bg-gray-50 border-t border-b border-gray-200">
                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                      Internal ({internalSigners.length})
                                    </span>
                                  </td>
                                </tr>
                                {internalSigners.map((event: any) => {
                                  const publicKey = event.signer_address || ''
                                  const truncated = publicKey.length > 24
                                    ? `${publicKey.slice(0, 12)}...${publicKey.slice(-12)}`
                                    : publicKey
                                  
                                  return (
                                    <tr key={event.id}>
                                      <td className="px-6 py-4 text-sm">
                                        <span className="font-mono text-gray-900">
                                          {event.signer_user_id ? formatEscraUserId(event.signer_user_id) : 'N/A'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm">
                                        {publicKey ? (
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-gray-900">{truncated}</span>
                                            <CopyButton text={publicKey} />
                                          </div>
                                        ) : (
                                          <span className="text-gray-500">N/A</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-900">
                                        {event.timestamp ? (
                                          (() => {
                                            try {
                                              const date = new Date(event.timestamp)
                                              const dateStr = date.toLocaleDateString('en-US', { timeZone: 'UTC' })
                                              const timeStr = date.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false })
                                              return `${dateStr} ${timeStr} UTC`
                                            } catch {
                                              return 'Invalid Date'
                                            }
                                          })()
                                        ) : (
                                          'N/A'
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </>
                            )}
                            
                            {/* External Signers */}
                            {externalSigners.length > 0 && (
                              <>
                                <tr>
                                  <td colSpan={3} className="px-6 py-1 bg-gray-50 border-t border-b border-gray-200">
                                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                      External ({externalSigners.length})
                                    </span>
                                  </td>
                                </tr>
                                {externalSigners.map((event: any) => {
                                  const publicKey = event.signer_address || ''
                                  const truncated = publicKey.length > 24
                                    ? `${publicKey.slice(0, 12)}...${publicKey.slice(-12)}`
                                    : publicKey
                                  
                                  return (
                                    <tr key={event.id}>
                                      <td className="px-6 py-4 text-sm">
                                        <span className="font-mono text-gray-900">
                                          {event.signer_user_id ? formatEscraUserId(event.signer_user_id) : 'N/A'}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-sm">
                                        {publicKey ? (
                                          <div className="flex items-center gap-2">
                                            <span className="font-mono text-gray-900">{truncated}</span>
                                            <CopyButton text={publicKey} />
                                          </div>
                                        ) : (
                                          <span className="text-gray-500">N/A</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 text-sm text-gray-900">
                                        {event.timestamp ? (
                                          (() => {
                                            try {
                                              const date = new Date(event.timestamp)
                                              const dateStr = date.toLocaleDateString('en-US', { timeZone: 'UTC' })
                                              const timeStr = date.toLocaleTimeString('en-US', { timeZone: 'UTC', hour12: false })
                                              return `${dateStr} ${timeStr} UTC`
                                            } catch {
                                              return 'Invalid Date'
                                            }
                                          })()
                                        ) : (
                                          'N/A'
                                        )}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </>
                            )}
                          </>
                        )
                      })()}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  No signatures have been submitted yet for this request.
                </div>
              )}
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}
