'use client'

/**
 * Billing & Usage - Split into Billing and Usage sub-tabs per escra-frontend-enhancement-plan.md
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconEdit, IconEditOff, IconUserCog, IconUserMinus, IconChevronDown } from '@tabler/icons-react'
import { KPICard } from '@/components/shared/KPICard'
import { StatusChip } from '@/components/shared/StatusChip'
import { Drawer } from '@/components/shared/Drawer'
import { CopyButton } from '@/components/shared/CopyButton'
import { DataTable } from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { TenantPlan, TenantStatus, Tenant, User, Key, KeyType, KeyStatus, UserStatus } from '@/types'
import { apiClient } from '@/lib/api-client'
import { getTenantAccountStatus, getUserVerificationStatus } from '@/utils/verification'

// Plan pricing (monthly)
const PLAN_PRICING: Record<TenantPlan, number> = {
  [TenantPlan.ESSENTIAL]: 99,
  [TenantPlan.PRO]: 299,
  [TenantPlan.GROWTH]: 799,
  [TenantPlan.ENTERPRISE]: 2500, // Custom pricing, using average for calculation
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

// Helper function to format organization ID
function formatOrganizationId(escraPublicOrgId: string): string {
  return escraPublicOrgId
}

// Helper function to format Escra User ID
function formatEscraUserId(escraPublicUserId: string): string {
  return escraPublicUserId
}

// Helper function to render copyable on-chain ID
function renderCopyableOnChainId(onChainId: number | string | null | undefined) {
  if (!onChainId) {
    return <span className="text-sm font-mono text-gray-900">N/A</span>
  }
  
  const idString = String(onChainId)
  const truncated = idString.length > 12 
    ? `${idString.slice(0, 6)}...${idString.slice(-6)}`
    : idString
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(idString)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono text-gray-900">{truncated}</span>
      <button
        onClick={handleCopy}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        title="Copy full on-chain ID"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      </button>
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
        signers: null, // Unlimited
        storage: 1000, // 1 TB = 1000 GB
      }
    default:
      return {
        contracts: null,
        signers: null,
        storage: null,
      }
  }
}

// US State abbreviations
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

// Countries list
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

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'billing' | 'costs'>('billing')
  const [billingEventsTab, setBillingEventsTab] = useState<'organizations' | 'billing_events'>('organizations')
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [drawerTab, setDrawerTab] = useState<'overview' | 'users_roles' | 'usage' | 'kyb'>('overview')
  const [usageTab, setUsageTab] = useState<'contracts' | 'documents' | 'signature_requests'>('contracts')
  const [usersPage, setUsersPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  
  // Filter states
  const [organizationFilter, setOrganizationFilter] = useState<string[]>([])
  const [organizationSearch, setOrganizationSearch] = useState<string>('')
  const [showOrganizationDropdown, setShowOrganizationDropdown] = useState(false)
  const [dateRangeStart, setDateRangeStart] = useState<string>('')
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('')
  const [costTimeFilter, setCostTimeFilter] = useState<string>('all')
  const organizationDropdownRef = useRef<HTMLDivElement>(null)
  
  // Edit mode states
  const [tenantOrgDetailsEditMode, setTenantOrgDetailsEditMode] = useState(false)
  const [tenantMailingAddressEditMode, setTenantMailingAddressEditMode] = useState(false)
  const [tenantBillingAddressEditMode, setTenantBillingAddressEditMode] = useState(false)
  
  // Editable fields state
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
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (organizationDropdownRef.current && !organizationDropdownRef.current.contains(event.target as Node)) {
        setShowOrganizationDropdown(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Initialize editable fields when tenant is selected
  useEffect(() => {
    if (selectedTenant) {
      setLegalEntityName(selectedTenant.legal_entity_name || '')
      setPrimaryContactEmail(selectedTenant.primary_contact_email || '')
      setBillingEmail(selectedTenant.billing_email || '')
      setTaxId(selectedTenant.tax_id || '')
      const metadata = selectedTenant.metadata as any
      setAddress1(metadata?.address_1 || '')
      setAddress2(metadata?.address_2 || '')
      setCity(metadata?.city || '')
      setState(metadata?.state || '')
      setZipCode(metadata?.zip_code || '')
      setCountry(metadata?.country || '')
      setBillingAddress1(metadata?.billing_address_1 || '')
      setBillingAddress2(metadata?.billing_address_2 || '')
      setBillingCity(metadata?.billing_city || '')
      setBillingState(metadata?.billing_state || '')
      setBillingZipCode(metadata?.billing_zip_code || '')
      setBillingCountry(metadata?.billing_country || '')
    }
  }, [selectedTenant])

  // Fetch all tenants for billing calculations
  const { data: tenantsData } = useQuery({
    queryKey: ['all-tenants-billing'],
    queryFn: () => apiClient.listTenants({ page_size: 1000 }),
  })

  // Fetch additional data for tenant stats
  const { data: allUsersForTable } = useQuery({
    queryKey: ['all-users-billing'],
    queryFn: () => apiClient.listUsers({ page_size: 1000 }),
  })

  // Fetch ALL contracts, documents, and signature requests for accurate cost calculations
  // Using large page_size to get as many items as possible (backend may have limits)
  const { data: allContractsForTable } = useQuery({
    queryKey: ['all-contracts-billing'],
    queryFn: () => apiClient.listContracts({ page_size: 10000 }),
  })

  const { data: allDocumentsForTable } = useQuery({
    queryKey: ['all-documents-billing'],
    queryFn: () => apiClient.listDocuments({ page_size: 10000 }),
  })

  const { data: allSignatureRequestsForTable } = useQuery({
    queryKey: ['all-signature-requests-billing'],
    queryFn: () => apiClient.listSignatureRequests({ page_size: 10000 }),
  })

  // Fetch all Persona inquiries for KYC/KYB cost calculation
  const { data: allPersonaInquiries } = useQuery({
    queryKey: ['all-persona-inquiries-billing'],
    queryFn: () => apiClient.listPersonaInquiries({ page_size: 1000 }),
  })

  // Fetch all keys for keyed users calculation
  const { data: allKeysForTable } = useQuery({
    queryKey: ['all-keys-billing'],
    queryFn: () => apiClient.listKeys({ page_size: 10000 }),
  })

  // Calculate billing stats from actual tenant data
  const billingStats = useMemo(() => {
    if (!tenantsData?.items) {
      return {
        mrr: 0,
        arr: 0,
        activePlans: 0,
        monthlyRevenue: 0,
        planCounts: {
          [TenantPlan.ESSENTIAL]: 0,
          [TenantPlan.PRO]: 0,
          [TenantPlan.GROWTH]: 0,
          [TenantPlan.ENTERPRISE]: 0,
          [TenantPlan.TRIAL]: 0,
        },
      }
    }

    const tenants = tenantsData.items
    let mrr = 0
    let activePlans = 0
    const planCounts = {
      [TenantPlan.ESSENTIAL]: 0,
      [TenantPlan.PRO]: 0,
      [TenantPlan.GROWTH]: 0,
      [TenantPlan.ENTERPRISE]: 0,
      [TenantPlan.TRIAL]: 0,
    }

    // Calculate MRR and plan counts (only count active tenants for MRR, but count all tenants for distribution)
    let inactivePlans = 0
    tenants.forEach((tenant) => {
      // Count all tenants by plan for distribution
      if (tenant.plan) {
        planCounts[tenant.plan]++
      }
      
      // Only count active tenants for MRR calculation
      if (tenant.status === TenantStatus.ACTIVE && tenant.plan !== TenantPlan.TRIAL) {
        const monthlyPrice = PLAN_PRICING[tenant.plan]
        mrr += monthlyPrice
        activePlans++
      } else {
        // Count all non-active tenants as inactive (INACTIVE, SUSPENDED, TRIAL, etc.)
        inactivePlans++
      }
    })

    const arr = mrr * 12
    const monthlyRevenue = mrr // For this month, use MRR

    return {
      mrr,
      arr,
      activePlans,
      inactivePlans,
      monthlyRevenue,
      planCounts,
    }
  }, [tenantsData])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Calculate plan distribution for visualization
  const planDistribution = useMemo(() => {
    const { planCounts } = billingStats
    const total = Object.values(planCounts).reduce((sum, count) => sum + count, 0)
    
    if (total === 0) {
      return []
    }

    const distribution = [
      { plan: 'Enterprise', count: planCounts[TenantPlan.ENTERPRISE], planEnum: TenantPlan.ENTERPRISE, color: 'bg-blue-600' },
      { plan: 'Growth', count: planCounts[TenantPlan.GROWTH], planEnum: TenantPlan.GROWTH, color: 'bg-green-600' },
      { plan: 'Pro', count: planCounts[TenantPlan.PRO], planEnum: TenantPlan.PRO, color: 'bg-yellow-600' },
      { plan: 'Essential', count: planCounts[TenantPlan.ESSENTIAL], planEnum: TenantPlan.ESSENTIAL, color: 'bg-gray-400' },
      { plan: 'Trial', count: planCounts[TenantPlan.TRIAL], planEnum: TenantPlan.TRIAL, color: 'bg-purple-600' },
    ]
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .map(item => ({
        ...item,
        width: `${(item.count / total) * 100}%`,
      }))

    return distribution
  }, [billingStats])

  // Queries for tenant drawer
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['tenant-users-billing', selectedTenant?.escra_public_org_id, usersPage],
    queryFn: () =>
      apiClient.listUsers({
        page: usersPage,
        page_size: 20,
        tenant_id: selectedTenant?.escra_public_org_id,
      }),
    enabled: !!selectedTenant && drawerTab === 'users_roles',
  })

  // Fetch all keys for tenant drawer users & roles tab (to get public keys)
  const { data: allKeysForTenantDrawer } = useQuery({
    queryKey: ['all-keys-tenant-drawer-billing'],
    queryFn: () => apiClient.listKeys({ page_size: 1000 }),
    enabled: !!selectedTenant && drawerTab === 'users_roles',
  })

  // Fetch all users for tenant (for usage calculations)
  const { data: allTenantUsersData } = useQuery({
    queryKey: ['tenant-all-users-billing', selectedTenant?.escra_public_org_id],
    queryFn: () => apiClient.listUsers({ tenant_id: selectedTenant?.escra_public_org_id, page_size: 1000 }),
    enabled: !!selectedTenant && drawerTab === 'usage',
  })

  // Fetch contracts, documents, signature requests for usage tab
  const { data: allContractsData } = useQuery({
    queryKey: ['tenant-all-contracts-billing', selectedTenant?.id],
    queryFn: () => apiClient.listContracts({ page_size: 1000 }),
    enabled: !!selectedTenant && drawerTab === 'usage',
  })

  const { data: allDocumentsData } = useQuery({
    queryKey: ['tenant-all-documents-billing', selectedTenant?.id],
    queryFn: () => apiClient.listDocuments({ page_size: 1000 }),
    enabled: !!selectedTenant && drawerTab === 'usage',
  })

  const { data: allSignatureRequestsData } = useQuery({
    queryKey: ['tenant-all-signature-requests-billing', selectedTenant?.id],
    queryFn: () => apiClient.listSignatureRequests({ page_size: 1000 }),
    enabled: !!selectedTenant && drawerTab === 'usage',
  })

  // Filter data by tenant
  const tenantUserIds = useMemo(() => {
    if (!allTenantUsersData) return new Set<string>()
    return new Set((allTenantUsersData.items || []).map((user: any) => user.escra_public_user_id))
  }, [allTenantUsersData])

  const filteredTenantContractsData = useMemo(() => {
    if (!allContractsData || !selectedTenant) return { items: [], total: 0 }
    const items = (allContractsData.items || []).filter((contract: any) => {
      return contract.tenant_id === selectedTenant.escra_public_org_id || 
             (contract.user_creator_id && tenantUserIds.has(contract.user_creator_id))
    })
    return { ...allContractsData, items, total: items.length }
  }, [allContractsData, selectedTenant, tenantUserIds])

  const filteredTenantDocumentsData = useMemo(() => {
    if (!allDocumentsData || !selectedTenant) return { items: [], total: 0 }
    const items = (allDocumentsData.items || []).filter((doc: any) => {
      return doc.tenant_id === selectedTenant.escra_public_org_id || 
             (doc.user_creator_id && tenantUserIds.has(doc.user_creator_id))
    })
    return { ...allDocumentsData, items, total: items.length }
  }, [allDocumentsData, selectedTenant, tenantUserIds])

  const filteredTenantSignatureRequestsData = useMemo(() => {
    if (!allSignatureRequestsData || !selectedTenant) return { items: [], total: 0 }
    const items = (allSignatureRequestsData.items || []).filter((sig: any) => {
      return sig.tenant_id === selectedTenant.escra_public_org_id || 
             (sig.user_creator_id && tenantUserIds.has(sig.user_creator_id))
    })
    return { ...allSignatureRequestsData, items, total: items.length }
  }, [allSignatureRequestsData, selectedTenant, tenantUserIds])

  // Table data for usage tab
  const { data: contractsTableData, isLoading: contractsLoading } = useQuery({
    queryKey: ['tenant-contracts-table-billing', selectedTenant?.id, usageTab],
    queryFn: () => apiClient.listContracts({ page_size: 1000 }),
    enabled: !!selectedTenant && drawerTab === 'usage' && usageTab === 'contracts',
  })

  const { data: documentsTableData, isLoading: documentsLoading } = useQuery({
    queryKey: ['tenant-documents-table-billing', selectedTenant?.id, usageTab],
    queryFn: () => apiClient.listDocuments({ page_size: 1000 }),
    enabled: !!selectedTenant && drawerTab === 'usage' && usageTab === 'documents',
  })

  const { data: signatureRequestsTableData, isLoading: signatureRequestsLoading } = useQuery({
    queryKey: ['tenant-signature-requests-table-billing', selectedTenant?.id, usageTab],
    queryFn: () => apiClient.listSignatureRequests({ page_size: 1000 }),
    enabled: !!selectedTenant && drawerTab === 'usage' && usageTab === 'signature_requests',
  })


  // Filter table data
  const filteredContractsTableData = useMemo(() => {
    if (!contractsTableData || !selectedTenant) return { items: [], total: 0 }
    const items = (contractsTableData.items || []).filter((contract: any) => {
      return contract.tenant_id === selectedTenant.escra_public_org_id || 
             (contract.user_creator_id && tenantUserIds.has(contract.user_creator_id))
    })
    return { ...contractsTableData, items, total: items.length }
  }, [contractsTableData, selectedTenant, tenantUserIds])

  const filteredDocumentsTableData = useMemo(() => {
    if (!documentsTableData || !selectedTenant) return { items: [], total: 0 }
    const items = (documentsTableData.items || []).filter((doc: any) => {
      return doc.tenant_id === selectedTenant.escra_public_org_id || 
             (doc.user_creator_id && tenantUserIds.has(doc.user_creator_id))
    })
    return { ...documentsTableData, items, total: items.length }
  }, [documentsTableData, selectedTenant, tenantUserIds])

  const filteredSignatureRequestsTableData = useMemo(() => {
    if (!signatureRequestsTableData || !selectedTenant) return { items: [], total: 0 }
    const items = (signatureRequestsTableData.items || []).filter((sig: any) => {
      return sig.tenant_id === selectedTenant.escra_public_org_id || 
             (sig.user_creator_id && tenantUserIds.has(sig.user_creator_id))
    })
    return { ...signatureRequestsTableData, items, total: items.length }
  }, [signatureRequestsTableData, selectedTenant, tenantUserIds])

  // Calculate usage stats
  const totalContracts = useMemo(() => filteredTenantContractsData?.items?.length || 0, [filteredTenantContractsData])
  const totalDocuments = useMemo(() => filteredTenantDocumentsData?.items?.length || 0, [filteredTenantDocumentsData])
  const totalSignatureRequests = useMemo(() => filteredTenantSignatureRequestsData?.items?.length || 0, [filteredTenantSignatureRequestsData])
  const totalSigners = useMemo(() => {
    return (filteredTenantSignatureRequestsData?.items || []).reduce((sum, sig) => sum + (sig.signer_count || 0), 0)
  }, [filteredTenantSignatureRequestsData])
  
  const storageUsedGB = useMemo(() => {
    const totalBytes = (filteredTenantDocumentsData?.items || []).reduce((sum, doc) => sum + ((doc as any).file_size || 0), 0)
    return totalBytes / (1024 * 1024 * 1024)
  }, [filteredTenantDocumentsData])
  
  const totalAlgoLockup = useMemo(() => {
    const contractsLockup = (filteredTenantContractsData?.items || []).reduce((sum, contract) => sum + (contract.lockup || 0), 0)
    const documentsLockup = (filteredTenantDocumentsData?.items || []).reduce((sum, doc) => sum + (doc.lockup || 0), 0)
    return contractsLockup + documentsLockup
  }, [filteredTenantContractsData, filteredTenantDocumentsData])
  
  const totalTransactions = useMemo(() => {
    const contractsTransactions = (filteredTenantContractsData?.items || []).reduce((sum, contract) => sum + (contract.transaction_count || 0), 0)
    const documentsTransactions = (filteredTenantDocumentsData?.items || []).reduce((sum, doc) => sum + (doc.transaction_count || 0), 0)
    const signatureRequestsTransactions = (filteredTenantSignatureRequestsData?.items || []).reduce((sum, sig) => sum + (sig.transaction_count || 0), 0)
    return contractsTransactions + documentsTransactions + signatureRequestsTransactions
  }, [filteredTenantContractsData, filteredTenantDocumentsData, filteredTenantSignatureRequestsData])
  
  const totalTransactionCost = useMemo(() => {
    const contractsCost = (filteredTenantContractsData?.items || []).reduce((sum, contract) => sum + ((contract as any).transaction_cost || 0), 0)
    const documentsCost = (filteredTenantDocumentsData?.items || []).reduce((sum, doc) => sum + ((doc as any).transaction_cost || 0), 0)
    const signatureRequestsCost = (filteredTenantSignatureRequestsData?.items || []).reduce((sum, sig) => sum + ((sig as any).transaction_cost || 0), 0)
    return contractsCost + documentsCost + signatureRequestsCost
  }, [filteredTenantContractsData, filteredTenantDocumentsData, filteredTenantSignatureRequestsData])

  // Calculate tenant stats for organizations table
  const tenantStats = useMemo(() => {
    const stats: Record<string, { 
      contracts: number
      documents: number
      storageGB: number
      algoLockup: number
      signerCount: number
      userCount: number
      permissionedUserCount: number
      transactionCost: number
      transactionCount: number
    }> = {}

    if (!tenantsData?.items || !allUsersForTable?.items) {
      return stats
    }

    // Group users by tenant_id (public org ID)
    const usersByTenant = (allUsersForTable.items || []).reduce((acc, user) => {
      const tenantId = user.tenant_id
      if (!acc[tenantId]) acc[tenantId] = []
      acc[tenantId].push(user)
      return acc
    }, {} as Record<string, any[]>)

    // Create a map of user public IDs to tenant public IDs for quick lookup
    const userIdToTenantId: Record<string, string> = {}
    Object.keys(usersByTenant).forEach(tenantId => {
      usersByTenant[tenantId].forEach((user: any) => {
        userIdToTenantId[user.escra_public_user_id] = tenantId
      })
    })

    // Count permissioned users (users with keys) per tenant
    const permissionedUsersByTenant: Record<string, Set<string>> = {}
    ;(allKeysForTable?.items || []).forEach((key: any) => {
      if (key.user_id) {
        const tenantId = userIdToTenantId[key.user_id] || key.tenant_id
        if (tenantId) {
          if (!permissionedUsersByTenant[tenantId]) {
            permissionedUsersByTenant[tenantId] = new Set()
          }
          permissionedUsersByTenant[tenantId].add(key.user_id)
        }
      }
    })

    // Group contracts by tenant
    const contractsByTenant: Record<string, any[]> = {}
    ;(allContractsForTable?.items || []).forEach((contract: any) => {
      const tenantId = contract.tenant_id || userIdToTenantId[contract.user_creator_id]
      if (tenantId) {
        if (!contractsByTenant[tenantId]) contractsByTenant[tenantId] = []
        contractsByTenant[tenantId].push(contract)
      }
    })

    // Group documents by tenant
    const documentsByTenant: Record<string, any[]> = {}
    ;(allDocumentsForTable?.items || []).forEach((doc: any) => {
      const tenantId = doc.tenant_id || userIdToTenantId[doc.user_creator_id]
      if (tenantId) {
        if (!documentsByTenant[tenantId]) documentsByTenant[tenantId] = []
        documentsByTenant[tenantId].push(doc)
      }
    })

    // Group signature requests by tenant
    const signatureRequestsByTenant: Record<string, any[]> = {}
    ;(allSignatureRequestsForTable?.items || []).forEach((sig: any) => {
      const tenantId = sig.tenant_id || userIdToTenantId[sig.user_creator_id]
      if (tenantId) {
        if (!signatureRequestsByTenant[tenantId]) signatureRequestsByTenant[tenantId] = []
        signatureRequestsByTenant[tenantId].push(sig)
      }
    })

    // Calculate stats for each tenant
    Object.keys(usersByTenant).forEach(tenantId => {
      const contracts = contractsByTenant[tenantId] || []
      const documents = documentsByTenant[tenantId] || []
      const signatureRequests = signatureRequestsByTenant[tenantId] || []

      const contractsLockup = contracts.reduce((sum, contract) => sum + (contract.lockup || 0), 0)
      const contractsTransactionCount = contracts.reduce((sum, contract) => sum + (contract.transaction_count || 0), 0)
      const contractsTransactionCost = contracts.reduce((sum, contract) => sum + ((contract as any).transaction_cost || 0), 0)
      const documentsLockup = documents.reduce((sum, doc) => sum + (doc.lockup || 0), 0)
      const documentsTransactionCount = documents.reduce((sum, doc) => sum + (doc.transaction_count || 0), 0)
      const documentsTransactionCost = documents.reduce((sum, doc) => sum + ((doc as any).transaction_cost || 0), 0)
      const totalBytes = documents.reduce((sum, doc) => sum + ((doc as any).file_size || 0), 0)
      const storageGB = totalBytes / (1024 * 1024 * 1024)
      const signerCount = signatureRequests.reduce((sum, sig) => sum + (sig.signer_count || 0), 0)
      const signatureRequestsTransactionCount = signatureRequests.reduce((sum, sig) => sum + (sig.transaction_count || 0), 0)
      const signatureRequestsTransactionCost = signatureRequests.reduce((sum, sig) => sum + ((sig as any).transaction_cost || 0), 0)

      stats[tenantId] = {
        contracts: contracts.length,
        documents: documents.length,
        storageGB,
        algoLockup: contractsLockup + documentsLockup,
        signerCount,
        userCount: usersByTenant[tenantId].length,
        permissionedUserCount: permissionedUsersByTenant[tenantId]?.size || 0,
        transactionCost: contractsTransactionCost + documentsTransactionCost + signatureRequestsTransactionCost,
        transactionCount: contractsTransactionCount + documentsTransactionCount + signatureRequestsTransactionCount,
      }
    })

    // Also include tenants that have contracts/documents/signature requests but no users yet
    Object.keys(contractsByTenant).forEach(tenantId => {
      if (!stats[tenantId]) {
        const contracts = contractsByTenant[tenantId] || []
        const documents = documentsByTenant[tenantId] || []
        const signatureRequests = signatureRequestsByTenant[tenantId] || []

        const contractsLockup = contracts.reduce((sum, contract) => sum + (contract.lockup || 0), 0)
        const contractsTransactionCount = contracts.reduce((sum, contract) => sum + (contract.transaction_count || 0), 0)
        const contractsTransactionCost = contracts.reduce((sum, contract) => sum + ((contract as any).transaction_cost || 0), 0)
        const documentsLockup = documents.reduce((sum, doc) => sum + (doc.lockup || 0), 0)
        const documentsTransactionCount = documents.reduce((sum, doc) => sum + (doc.transaction_count || 0), 0)
        const documentsTransactionCost = documents.reduce((sum, doc) => sum + ((doc as any).transaction_cost || 0), 0)
        const totalBytes = documents.reduce((sum, doc) => sum + ((doc as any).file_size || 0), 0)
        const storageGB = totalBytes / (1024 * 1024 * 1024)
        const signerCount = signatureRequests.reduce((sum, sig) => sum + (sig.signer_count || 0), 0)
        const signatureRequestsTransactionCount = signatureRequests.reduce((sum, sig) => sum + (sig.transaction_count || 0), 0)
        const signatureRequestsTransactionCost = signatureRequests.reduce((sum, sig) => sum + ((sig as any).transaction_cost || 0), 0)

        stats[tenantId] = {
          contracts: contracts.length,
          documents: documents.length,
          storageGB,
          algoLockup: contractsLockup + documentsLockup,
          signerCount,
          userCount: 0,
          permissionedUserCount: permissionedUsersByTenant[tenantId]?.size || 0,
          transactionCost: contractsTransactionCost + documentsTransactionCost + signatureRequestsTransactionCost,
          transactionCount: contractsTransactionCount + documentsTransactionCount + signatureRequestsTransactionCount,
        }
      }
    })

    return stats
  }, [tenantsData, allUsersForTable, allContractsForTable, allDocumentsForTable, allSignatureRequestsForTable, allKeysForTable])

  // Helper to calculate storage for a tenant using the same logic as tenants page
  const calculateTenantStorage = useMemo(() => {
    const storageByTenant: Record<string, number> = {}
    
    const usersByTenant: Record<string, any[]> = {}
    ;(allUsersForTable?.items || []).forEach((user: any) => {
      const tenantId = user.tenant_id
      if (tenantId) {
        if (!usersByTenant[tenantId]) usersByTenant[tenantId] = []
        usersByTenant[tenantId].push(user)
      }
    })
    
    const tenantUserIdsMap: Record<string, Set<string>> = {}
    Object.keys(usersByTenant).forEach(tenantId => {
      tenantUserIdsMap[tenantId] = new Set(usersByTenant[tenantId].map((user: any) => user.escra_public_user_id))
    })
    
    Object.keys(usersByTenant).forEach(tenantId => {
      const tenantUserIds = tenantUserIdsMap[tenantId]
      const documents = (allDocumentsForTable?.items || []).filter((doc: any) => {
        return doc.tenant_id === tenantId || 
               (doc.user_creator_id && tenantUserIds.has(doc.user_creator_id))
      })
      const totalBytes = documents.reduce((sum, doc) => sum + ((doc as any).file_size || 0), 0)
      storageByTenant[tenantId] = totalBytes / (1024 * 1024 * 1024)
    })
    
    ;(allDocumentsForTable?.items || []).forEach((doc: any) => {
      if (doc.tenant_id && !storageByTenant[doc.tenant_id]) {
        const documents = (allDocumentsForTable?.items || []).filter((d: any) => d.tenant_id === doc.tenant_id)
        const totalBytes = documents.reduce((sum, d) => sum + ((d as any).file_size || 0), 0)
        storageByTenant[doc.tenant_id] = totalBytes / (1024 * 1024 * 1024)
      }
    })
    
    return storageByTenant
  }, [allDocumentsForTable, allUsersForTable])

  // Helper to calculate ALGO lockup for each tenant
  const calculateTenantAlgoLockup = useMemo(() => {
    const algoLockupByTenant: Record<string, number> = {}
    
    const usersByTenant: Record<string, any[]> = {}
    ;(allUsersForTable?.items || []).forEach((user: any) => {
      const tenantId = user.tenant_id
      if (tenantId) {
        if (!usersByTenant[tenantId]) usersByTenant[tenantId] = []
        usersByTenant[tenantId].push(user)
      }
    })
    
    const tenantUserIdsMap: Record<string, Set<string>> = {}
    Object.keys(usersByTenant).forEach(tenantId => {
      tenantUserIdsMap[tenantId] = new Set(usersByTenant[tenantId].map((user: any) => user.escra_public_user_id))
    })
    
    Object.keys(usersByTenant).forEach(tenantId => {
      const tenantUserIds = tenantUserIdsMap[tenantId]
      const contracts = (allContractsForTable?.items || []).filter((contract: any) => {
        return contract.tenant_id === tenantId || 
               (contract.user_creator_id && tenantUserIds.has(contract.user_creator_id))
      })
      const documents = (allDocumentsForTable?.items || []).filter((doc: any) => {
        return doc.tenant_id === tenantId || 
               (doc.user_creator_id && tenantUserIds.has(doc.user_creator_id))
      })
      const contractsLockup = contracts.reduce((sum, contract) => sum + (contract.lockup || 0), 0)
      const documentsLockup = documents.reduce((sum, doc) => sum + (doc.lockup || 0), 0)
      algoLockupByTenant[tenantId] = contractsLockup + documentsLockup
    })
    
    ;(allContractsForTable?.items || []).forEach((contract: any) => {
      if (contract.tenant_id && !algoLockupByTenant[contract.tenant_id]) {
        const contracts = (allContractsForTable?.items || []).filter((c: any) => c.tenant_id === contract.tenant_id)
        const documents = (allDocumentsForTable?.items || []).filter((d: any) => d.tenant_id === contract.tenant_id)
        const contractsLockup = contracts.reduce((sum, c) => sum + (c.lockup || 0), 0)
        const documentsLockup = documents.reduce((sum, d) => sum + (d.lockup || 0), 0)
        algoLockupByTenant[contract.tenant_id] = contractsLockup + documentsLockup
      }
    })
    ;(allDocumentsForTable?.items || []).forEach((doc: any) => {
      if (doc.tenant_id && !algoLockupByTenant[doc.tenant_id]) {
        const contracts = (allContractsForTable?.items || []).filter((c: any) => c.tenant_id === doc.tenant_id)
        const documents = (allDocumentsForTable?.items || []).filter((d: any) => d.tenant_id === doc.tenant_id)
        const contractsLockup = contracts.reduce((sum, c) => sum + (c.lockup || 0), 0)
        const documentsLockup = documents.reduce((sum, d) => sum + (d.lockup || 0), 0)
        algoLockupByTenant[doc.tenant_id] = contractsLockup + documentsLockup
      }
    })
    
    return algoLockupByTenant
  }, [allContractsForTable, allDocumentsForTable, allUsersForTable])

  // Helper to calculate transactions for each tenant
  const calculateTenantTransactions = useMemo(() => {
    const transactionsByTenant: Record<string, number> = {}
    
    const usersByTenant: Record<string, any[]> = {}
    ;(allUsersForTable?.items || []).forEach((user: any) => {
      const tenantId = user.tenant_id
      if (tenantId) {
        if (!usersByTenant[tenantId]) usersByTenant[tenantId] = []
        usersByTenant[tenantId].push(user)
      }
    })
    
    const tenantUserIdsMap: Record<string, Set<string>> = {}
    Object.keys(usersByTenant).forEach(tenantId => {
      tenantUserIdsMap[tenantId] = new Set(usersByTenant[tenantId].map((user: any) => user.escra_public_user_id))
    })
    
    Object.keys(usersByTenant).forEach(tenantId => {
      const tenantUserIds = tenantUserIdsMap[tenantId]
      const contracts = (allContractsForTable?.items || []).filter((contract: any) => {
        return contract.tenant_id === tenantId || 
               (contract.user_creator_id && tenantUserIds.has(contract.user_creator_id))
      })
      const documents = (allDocumentsForTable?.items || []).filter((doc: any) => {
        return doc.tenant_id === tenantId || 
               (doc.user_creator_id && tenantUserIds.has(doc.user_creator_id))
      })
      const signatureRequests = (allSignatureRequestsForTable?.items || []).filter((sig: any) => {
        return sig.tenant_id === tenantId || 
               (sig.user_creator_id && tenantUserIds.has(sig.user_creator_id))
      })
      const contractsTransactions = contracts.reduce((sum, contract) => sum + (contract.transaction_count || 0), 0)
      const documentsTransactions = documents.reduce((sum, doc) => sum + (doc.transaction_count || 0), 0)
      const signatureRequestsTransactions = signatureRequests.reduce((sum, sig) => sum + (sig.transaction_count || 0), 0)
      transactionsByTenant[tenantId] = contractsTransactions + documentsTransactions + signatureRequestsTransactions
    })
    
    ;(allContractsForTable?.items || []).forEach((contract: any) => {
      if (contract.tenant_id && !transactionsByTenant[contract.tenant_id]) {
        const contracts = (allContractsForTable?.items || []).filter((c: any) => c.tenant_id === contract.tenant_id)
        const documents = (allDocumentsForTable?.items || []).filter((d: any) => d.tenant_id === contract.tenant_id)
        const signatureRequests = (allSignatureRequestsForTable?.items || []).filter((s: any) => s.tenant_id === contract.tenant_id)
        const contractsTransactions = contracts.reduce((sum, c) => sum + (c.transaction_count || 0), 0)
        const documentsTransactions = documents.reduce((sum, d) => sum + (d.transaction_count || 0), 0)
        const signatureRequestsTransactions = signatureRequests.reduce((sum, s) => sum + (s.transaction_count || 0), 0)
        transactionsByTenant[contract.tenant_id] = contractsTransactions + documentsTransactions + signatureRequestsTransactions
      }
    })
    ;(allDocumentsForTable?.items || []).forEach((doc: any) => {
      if (doc.tenant_id && !transactionsByTenant[doc.tenant_id]) {
        const contracts = (allContractsForTable?.items || []).filter((c: any) => c.tenant_id === doc.tenant_id)
        const documents = (allDocumentsForTable?.items || []).filter((d: any) => d.tenant_id === doc.tenant_id)
        const signatureRequests = (allSignatureRequestsForTable?.items || []).filter((s: any) => s.tenant_id === doc.tenant_id)
        const contractsTransactions = contracts.reduce((sum, c) => sum + (c.transaction_count || 0), 0)
        const documentsTransactions = documents.reduce((sum, d) => sum + (d.transaction_count || 0), 0)
        const signatureRequestsTransactions = signatureRequests.reduce((sum, s) => sum + (s.transaction_count || 0), 0)
        transactionsByTenant[doc.tenant_id] = contractsTransactions + documentsTransactions + signatureRequestsTransactions
      }
    })
    ;(allSignatureRequestsForTable?.items || []).forEach((sig: any) => {
      if (sig.tenant_id && !transactionsByTenant[sig.tenant_id]) {
        const contracts = (allContractsForTable?.items || []).filter((c: any) => c.tenant_id === sig.tenant_id)
        const documents = (allDocumentsForTable?.items || []).filter((d: any) => d.tenant_id === sig.tenant_id)
        const signatureRequests = (allSignatureRequestsForTable?.items || []).filter((s: any) => s.tenant_id === sig.tenant_id)
        const contractsTransactions = contracts.reduce((sum, c) => sum + (c.transaction_count || 0), 0)
        const documentsTransactions = documents.reduce((sum, d) => sum + (d.transaction_count || 0), 0)
        const signatureRequestsTransactions = signatureRequests.reduce((sum, s) => sum + (s.transaction_count || 0), 0)
        transactionsByTenant[sig.tenant_id] = contractsTransactions + documentsTransactions + signatureRequestsTransactions
      }
    })
    
    return transactionsByTenant
  }, [allContractsForTable, allDocumentsForTable, allSignatureRequestsForTable, allUsersForTable])

  // Helper to calculate transaction cost for each tenant
  const calculateTenantTransactionCost = useMemo(() => {
    const transactionCostByTenant: Record<string, number> = {}
    
    const usersByTenant: Record<string, any[]> = {}
    ;(allUsersForTable?.items || []).forEach((user: any) => {
      const tenantId = user.tenant_id
      if (tenantId) {
        if (!usersByTenant[tenantId]) usersByTenant[tenantId] = []
        usersByTenant[tenantId].push(user)
      }
    })
    
    const tenantUserIdsMap: Record<string, Set<string>> = {}
    Object.keys(usersByTenant).forEach(tenantId => {
      tenantUserIdsMap[tenantId] = new Set(usersByTenant[tenantId].map((user: any) => user.escra_public_user_id))
    })
    
    Object.keys(usersByTenant).forEach(tenantId => {
      const tenantUserIds = tenantUserIdsMap[tenantId]
      const contracts = (allContractsForTable?.items || []).filter((contract: any) => {
        return contract.tenant_id === tenantId || 
               (contract.user_creator_id && tenantUserIds.has(contract.user_creator_id))
      })
      const documents = (allDocumentsForTable?.items || []).filter((doc: any) => {
        return doc.tenant_id === tenantId || 
               (doc.user_creator_id && tenantUserIds.has(doc.user_creator_id))
      })
      const signatureRequests = (allSignatureRequestsForTable?.items || []).filter((sig: any) => {
        return sig.tenant_id === tenantId || 
               (sig.user_creator_id && tenantUserIds.has(sig.user_creator_id))
      })
      const contractsTransactionCost = contracts.reduce((sum, contract) => sum + ((contract as any).transaction_cost || 0), 0)
      const documentsTransactionCost = documents.reduce((sum, doc) => sum + ((doc as any).transaction_cost || 0), 0)
      const signatureRequestsTransactionCost = signatureRequests.reduce((sum, sig) => sum + ((sig as any).transaction_cost || 0), 0)
      transactionCostByTenant[tenantId] = contractsTransactionCost + documentsTransactionCost + signatureRequestsTransactionCost
    })
    
    ;(allContractsForTable?.items || []).forEach((contract: any) => {
      if (contract.tenant_id && !transactionCostByTenant[contract.tenant_id]) {
        const contracts = (allContractsForTable?.items || []).filter((c: any) => c.tenant_id === contract.tenant_id)
        const documents = (allDocumentsForTable?.items || []).filter((d: any) => d.tenant_id === contract.tenant_id)
        const signatureRequests = (allSignatureRequestsForTable?.items || []).filter((s: any) => s.tenant_id === contract.tenant_id)
        const contractsTransactionCost = contracts.reduce((sum, c) => sum + ((c as any).transaction_cost || 0), 0)
        const documentsTransactionCost = documents.reduce((sum, d) => sum + ((d as any).transaction_cost || 0), 0)
        const signatureRequestsTransactionCost = signatureRequests.reduce((sum, s) => sum + ((s as any).transaction_cost || 0), 0)
        transactionCostByTenant[contract.tenant_id] = contractsTransactionCost + documentsTransactionCost + signatureRequestsTransactionCost
      }
    })
    ;(allDocumentsForTable?.items || []).forEach((doc: any) => {
      if (doc.tenant_id && !transactionCostByTenant[doc.tenant_id]) {
        const contracts = (allContractsForTable?.items || []).filter((c: any) => c.tenant_id === doc.tenant_id)
        const documents = (allDocumentsForTable?.items || []).filter((d: any) => d.tenant_id === doc.tenant_id)
        const signatureRequests = (allSignatureRequestsForTable?.items || []).filter((s: any) => s.tenant_id === doc.tenant_id)
        const contractsTransactionCost = contracts.reduce((sum, c) => sum + ((c as any).transaction_cost || 0), 0)
        const documentsTransactionCost = documents.reduce((sum, d) => sum + ((d as any).transaction_cost || 0), 0)
        const signatureRequestsTransactionCost = signatureRequests.reduce((sum, s) => sum + ((s as any).transaction_cost || 0), 0)
        transactionCostByTenant[doc.tenant_id] = contractsTransactionCost + documentsTransactionCost + signatureRequestsTransactionCost
      }
    })
    ;(allSignatureRequestsForTable?.items || []).forEach((sig: any) => {
      if (sig.tenant_id && !transactionCostByTenant[sig.tenant_id]) {
        const contracts = (allContractsForTable?.items || []).filter((c: any) => c.tenant_id === sig.tenant_id)
        const documents = (allDocumentsForTable?.items || []).filter((d: any) => d.tenant_id === sig.tenant_id)
        const signatureRequests = (allSignatureRequestsForTable?.items || []).filter((s: any) => s.tenant_id === sig.tenant_id)
        const contractsTransactionCost = contracts.reduce((sum, c) => sum + ((c as any).transaction_cost || 0), 0)
        const documentsTransactionCost = documents.reduce((sum, d) => sum + ((d as any).transaction_cost || 0), 0)
        const signatureRequestsTransactionCost = signatureRequests.reduce((sum, s) => sum + ((s as any).transaction_cost || 0), 0)
        transactionCostByTenant[sig.tenant_id] = contractsTransactionCost + documentsTransactionCost + signatureRequestsTransactionCost
      }
    })
    
    return transactionCostByTenant
  }, [allContractsForTable, allDocumentsForTable, allSignatureRequestsForTable, allUsersForTable])

  // Filter organizations based on filters
  const filteredOrganizations = useMemo(() => {
    if (!tenantsData?.items) return []
    
    return tenantsData.items.filter((tenant: Tenant) => {
      // Organization filter
      if (organizationFilter.length > 0 && !organizationFilter.includes(tenant.escra_public_org_id)) {
        return false
      }
      
      // Date range filter (filter by created_at)
      if (dateRangeStart || dateRangeEnd) {
        const tenantDate = new Date(tenant.created_at)
        if (dateRangeStart && tenantDate < new Date(dateRangeStart)) {
          return false
        }
        if (dateRangeEnd) {
          const endDate = new Date(dateRangeEnd)
          endDate.setHours(23, 59, 59, 999) // Include entire end date
          if (tenantDate > endDate) {
            return false
          }
        }
      }
      
      return true
    })
  }, [tenantsData, organizationFilter, dateRangeStart, dateRangeEnd])

  // Calculate time filter date based on selected period
  const getCostTimeFilterDate = useMemo(() => {
    if (costTimeFilter === 'all') return null
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

  // Calculate total costs and usage metrics across ALL tenants/orgs/users
  // Aggregates data from all contracts, documents, and signature requests across all tenants/orgs/users
  // Note: Using page_size: 10000 to fetch as many items as possible (backend may have limits)
  const totalCostsAndUsage = useMemo(() => {
    // Filter by time period if filter is set
    const filterByDate = (item: any) => {
      if (!getCostTimeFilterDate) return true
      const itemDate = new Date(item.created_at || item.created_date || 0)
      return itemDate >= getCostTimeFilterDate
    }

    const allContracts = allContractsForTable?.items || []
    const allDocuments = allDocumentsForTable?.items || []
    const allSignatureRequests = allSignatureRequestsForTable?.items || []
    const allKeys = allKeysForTable?.items || []
    const allInquiries = allPersonaInquiries?.items || []

    // Apply time filter
    const contracts = allContracts.filter(filterByDate)
    const documents = allDocuments.filter(filterByDate)
    const signatureRequests = allSignatureRequests.filter(filterByDate)
    const keys = allKeys.filter(filterByDate)
    const inquiries = allInquiries.filter(filterByDate)

    // Total storage (sum of all document file sizes across all tenants/orgs/users)
    const totalStorageBytes = documents.reduce(
      (sum, doc) => {
        const fileSize = doc.file_size ?? 0
        return sum + (typeof fileSize === 'number' ? fileSize : 0)
      },
      0
    )
    const totalStorageGB = totalStorageBytes / (1024 * 1024 * 1024)

    // Total ALGO lockup (sum of all contract and document lockups across all tenants/orgs/users)
    const contractsLockup = contracts.reduce(
      (sum, contract) => {
        const lockup = contract.lockup ?? 0
        return sum + (typeof lockup === 'number' ? lockup : 0)
      },
      0
    )
    const documentsLockup = documents.reduce(
      (sum, doc) => {
        const lockup = doc.lockup ?? 0
        return sum + (typeof lockup === 'number' ? lockup : 0)
      },
      0
    )
    const totalAlgoLockup = contractsLockup + documentsLockup

    // Total transaction fees (sum of all transaction costs across all tenants/orgs/users)
    const contractsTransactionCost = contracts.reduce(
      (sum, contract) => {
        const cost = contract.transaction_cost ?? 0
        return sum + (typeof cost === 'number' ? cost : 0)
      },
      0
    )
    const documentsTransactionCost = documents.reduce(
      (sum, doc) => {
        const cost = doc.transaction_cost ?? 0
        return sum + (typeof cost === 'number' ? cost : 0)
      },
      0
    )
    const signatureRequestsTransactionCost = signatureRequests.reduce(
      (sum, sig) => {
        const cost = sig.transaction_cost ?? 0
        return sum + (typeof cost === 'number' ? cost : 0)
      },
      0
    )
    const totalTransactionFees = contractsTransactionCost + documentsTransactionCost + signatureRequestsTransactionCost

    // Total KYC/KYB inquiry costs - already filtered by time above
    const kycCount = inquiries.filter(
      (i) => ((i as any).verification_type || (i.metadata as any)?.verification_type || '').toLowerCase() === 'kyc'
    ).length
    const kybCount = inquiries.filter(
      (i) => ((i as any).verification_type || (i.metadata as any)?.verification_type || '').toLowerCase() === 'kyb'
    ).length
    
    // Pricing model:
    // - Base plan: $250/month for first 500 KYC → $0.50 effective per KYC
    // - Additional KYC beyond 500: $1.50 per verification
    // - KYB add-on services: $1.875 per attempt
    // For total costs, we'll calculate based on all-time usage
    // First 500 KYC are included in base plan, so we calculate as if all are supplemental
    // Actually, let's be more accurate: base cost is $250/month, so for all-time we'd need to know months
    // For simplicity, let's calculate supplemental costs (beyond 500 KYC) + all KYB
    const kycBeyondIncluded = Math.max(0, kycCount - 500)
    const kycCost = kycBeyondIncluded * 1.5
    const kybCost = kybCount * 1.875
    // Note: Base $250/month cost is not included here as it's a fixed monthly cost
    const totalKycKybCost = kycCost + kybCost

    // Usage metrics
    const totalContracts = contracts.length
    const totalDocuments = documents.length
    const totalSignatureRequests = signatureRequests.length
    const totalSigners = signatureRequests.reduce(
      (sum, sig) => {
        const count = sig.signer_count ?? 0
        return sum + (typeof count === 'number' ? count : 0)
      },
      0
    )
    const totalTransactions = contracts.reduce(
      (sum, contract) => {
        const count = contract.transaction_count ?? 0
        return sum + (typeof count === 'number' ? count : 0)
      },
      0
    ) + documents.reduce(
      (sum, doc) => {
        const count = doc.transaction_count ?? 0
        return sum + (typeof count === 'number' ? count : 0)
      },
      0
    ) + signatureRequests.reduce(
      (sum, sig) => {
        const count = sig.transaction_count ?? 0
        return sum + (typeof count === 'number' ? count : 0)
      },
      0
    )

    // Total keyed users (users with at least one key) - filtered by time
    const keyedUserIds = new Set<string>()
    keys.forEach((key: any) => {
      if (key.user_id) {
        keyedUserIds.add(key.user_id)
      }
    })
    const totalKeyedUsers = keyedUserIds.size

    return {
      totalStorageGB,
      totalAlgoLockup,
      totalTransactionFees,
      totalKycKybCost,
      kycCount,
      kybCount,
      totalContracts,
      totalDocuments,
      totalSignatureRequests,
      totalSigners,
      totalTransactions,
      totalKeyedUsers,
    }
  }, [allContractsForTable, allDocumentsForTable, allSignatureRequestsForTable, allPersonaInquiries, allKeysForTable, getCostTimeFilterDate])

  // Helper to format numbers
  const formatNumber = (num: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num)
  }

  // Helper to format ALGO
  const formatAlgo = (algo: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(algo)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Billing & Usage</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor billing, usage metrics, and plan management
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('billing')}
            className={`
              whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium
              ${
                activeTab === 'billing'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
            `}
          >
            Billing
          </button>
          <button
            onClick={() => setActiveTab('costs')}
            className={`
              whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium
              ${
                activeTab === 'costs'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }
            `}
          >
            Costs
          </button>
        </nav>
      </div>

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div>
          {/* KPI Strip */}
          <div className="mb-6 space-y-4">
            {/* First row: Active Plans and Inactive Plans */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <KPICard title="Active Plans" value={billingStats.activePlans} subtitle="Paid tenants" />
              <KPICard title="Inactive Plans" value={billingStats.inactivePlans} subtitle="Non-active tenants" />
            </div>
            {/* Second row: Monthly Revenue, MRR, ARR, Churn Rate */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPICard title="Monthly Revenue" value={formatCurrency(billingStats.monthlyRevenue)} subtitle="This month" />
              <KPICard title="MRR" value={formatCurrency(billingStats.mrr)} subtitle="Monthly recurring revenue" />
              <KPICard title="ARR" value={formatCurrency(billingStats.arr)} subtitle="Annual recurring revenue" />
              <KPICard title="Churn Rate" value="2.1%" subtitle="Monthly churn" />
            </div>
          </div>

          {/* Plan Tiers */}
          <div className="mb-6 rounded-lg bg-white p-6" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Tiers</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Essential</h3>
                <p className="text-2xl font-bold text-gray-900 mb-1">$99/mo</p>
                <p className="text-sm text-gray-500">Basic features</p>
                <div className="mt-4 text-sm text-gray-600">
                  <div>{billingStats.planCounts[TenantPlan.ESSENTIAL]} {billingStats.planCounts[TenantPlan.ESSENTIAL] === 1 ? 'tenant' : 'tenants'}</div>
                </div>
              </div>
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Pro</h3>
                <p className="text-2xl font-bold text-gray-900 mb-1">$299/mo</p>
                <p className="text-sm text-gray-500">Advanced features</p>
                <div className="mt-4 text-sm text-gray-600">
                  <div>{billingStats.planCounts[TenantPlan.PRO]} {billingStats.planCounts[TenantPlan.PRO] === 1 ? 'tenant' : 'tenants'}</div>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Growth</h3>
                <p className="text-2xl font-bold text-gray-900 mb-1">$799/mo</p>
                <p className="text-sm text-gray-500">Scale features</p>
                <div className="mt-4 text-sm text-gray-600">
                  <div>{billingStats.planCounts[TenantPlan.GROWTH]} {billingStats.planCounts[TenantPlan.GROWTH] === 1 ? 'tenant' : 'tenants'}</div>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Enterprise</h3>
                <p className="text-2xl font-bold text-gray-900 mb-1">Custom</p>
                <p className="text-sm text-gray-500">Full features</p>
                <div className="mt-4 text-sm text-gray-600">
                  <div>{billingStats.planCounts[TenantPlan.ENTERPRISE]} {billingStats.planCounts[TenantPlan.ENTERPRISE] === 1 ? 'tenant' : 'tenants'}</div>
                  <div className="text-xs text-gray-500 mt-1">Custom rates</div>
                </div>
              </div>
            </div>
          </div>

          {/* Plan Distribution */}
          <div className="mb-6 rounded-lg bg-white p-6" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h2>
            <div className="space-y-4">
              {planDistribution.length > 0 ? (
                planDistribution.map((item) => (
                  <div key={item.plan}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-900 font-medium">{item.plan}</span>
                      <span className="font-medium text-gray-900">{item.count} {item.count === 1 ? 'tenant' : 'tenants'}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${item.color} h-2 rounded-full`}
                        style={{ width: item.width }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No active tenants</div>
              )}
            </div>
          </div>

          {/* Recent Billing Events / Organizations */}
          <div className="rounded-lg bg-white p-6" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Organizations & Billing Events</h2>
            
            {/* Tabs */}
            <div className="mb-6 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setBillingEventsTab('organizations')}
                  className={`
                    whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium
                    ${
                      billingEventsTab === 'organizations'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }
                  `}
                >
                  Organizations
                </button>
                <button
                  onClick={() => setBillingEventsTab('billing_events')}
                  className={`
                    whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium
                    ${
                      billingEventsTab === 'billing_events'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }
                  `}
                >
                  Billing Events
                </button>
              </nav>
            </div>

            {/* Organizations Tab */}
            {billingEventsTab === 'organizations' && (
              <div>
                {/* Filters */}
                <div className="mb-6 space-y-4">
                  <div className="flex flex-wrap gap-4">
                    {/* Organization Filter */}
                    <div className="w-full sm:w-auto sm:min-w-[213px] relative" ref={organizationDropdownRef}>
                      <label className="block text-sm font-medium text-gray-700">Organization</label>
                      <div className="mt-1 relative">
                        <input
                          type="text"
                          value={organizationSearch}
                          onChange={(e) => {
                            setOrganizationSearch(e.target.value)
                            setShowOrganizationDropdown(true)
                          }}
                          onFocus={() => setShowOrganizationDropdown(true)}
                          placeholder={organizationFilter.length === 0 ? 'All Organizations' : `${organizationFilter.length} selected`}
                          className="block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
                        />
                        {showOrganizationDropdown && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                            <div
                              className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-sm text-gray-700 flex items-center"
                              onClick={() => {
                                setOrganizationFilter([])
                                setOrganizationSearch('')
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={organizationFilter.length === 0}
                                onChange={() => {
                                  setOrganizationFilter([])
                                  setOrganizationSearch('')
                                }}
                                className="mr-2 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span>All Organizations</span>
                            </div>
                            {tenantsData?.items
                              ?.filter((tenant: Tenant) => 
                                !organizationSearch || 
                                tenant.name.toLowerCase().includes(organizationSearch.toLowerCase()) ||
                                tenant.escra_public_org_id.toLowerCase().includes(organizationSearch.toLowerCase())
                              )
                              .map((tenant: Tenant) => {
                                const isSelected = organizationFilter.includes(tenant.escra_public_org_id)
                                return (
                                  <div
                                    key={tenant.escra_public_org_id}
                                    className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center"
                                    onClick={() => {
                                      if (isSelected) {
                                        setOrganizationFilter(organizationFilter.filter(id => id !== tenant.escra_public_org_id))
                                      } else {
                                        setOrganizationFilter([...organizationFilter, tenant.escra_public_org_id])
                                      }
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        if (isSelected) {
                                          setOrganizationFilter(organizationFilter.filter(id => id !== tenant.escra_public_org_id))
                                        } else {
                                          setOrganizationFilter([...organizationFilter, tenant.escra_public_org_id])
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
                    
                    {/* Date Range Filter */}
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
                </div>

                {/* Organizations Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Organization
                        </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tier
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        Users
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Storage Used
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Algo Lockup
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Transactions
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        MRR
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ARR
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Profit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrganizations && filteredOrganizations.length > 0 ? (
                      filteredOrganizations.map((tenant) => {
                        const stats = tenantStats[tenant.escra_public_org_id] || {
                          contracts: 0,
                          documents: 0,
                          storageGB: 0,
                          algoLockup: 0,
                          signerCount: 0,
                          userCount: 0,
                          permissionedUserCount: 0,
                          transactionCost: 0,
                          transactionCount: 0,
                        }
                        
                        // Use the same calculation as tenants page for consistency
                        const storageGB = calculateTenantStorage[tenant.escra_public_org_id] || stats.storageGB
                        const algoLockup = calculateTenantAlgoLockup[tenant.escra_public_org_id] || 0
                        const transactions = calculateTenantTransactions[tenant.escra_public_org_id] || 0
                        const transactionCost = calculateTenantTransactionCost[tenant.escra_public_org_id] || 0
                        
                        const formatStorage = (gb: number) => {
                          if (gb < 1) {
                            const mb = gb * 1024
                            return `${mb.toFixed(2)} MB`
                          } else {
                            return `${gb.toFixed(2)} GB`
                          }
                        }

                        // Calculate MRR and ARR (only for active tenants)
                        const tenantMRR = tenant.status === TenantStatus.ACTIVE 
                          ? PLAN_PRICING[tenant.plan] 
                          : 0
                        const tenantARR = tenantMRR * 12
                        
                        // TODO: Calculate profit (ARR - operating expenses)
                        // Profit = ARR - operating expenses for this client
                        // Operating expenses would include: storage costs, API call costs, on-chain fees, etc.
                        // For now, show placeholder until operating expense data is available
                        const tenantProfit = null // Will be calculated when operating expense data is available

                        const isPersonal = (tenant.metadata as any)?.is_personal === true || (tenant.metadata as any)?.tenant_type === 'personal'

                        return (
                          <tr key={tenant.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedTenant(tenant)
                                    setDrawerTab('overview')
                                  }}
                                  className="text-sm font-mono text-primary-600 hover:text-primary-900 hover:underline"
                                >
                                  {formatOrganizationId(tenant.escra_public_org_id)}
                                </button>
                                <div className="mt-1">
                                  <span className="text-sm font-medium text-gray-900">{tenant.name}</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    {isPersonal && (
                                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                                        Personal
                                      </span>
                                    )}
                                    {tenant.plan === TenantPlan.TRIAL && (
                                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                                        Trial
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-gray-900 capitalize">
                                {tenant.status === 'trial' ? 'Trial' : tenant.plan}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <StatusChip status={getTenantAccountStatus(tenant)} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="text-sm text-gray-900">
                                <div>{stats.permissionedUserCount} keyed</div>
                                <div className="text-xs text-gray-500">
                                  {stats.userCount} total
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                <div>{formatStorage(storageGB)}</div>
                                <div className="text-xs text-gray-500">
                                  {stats.contracts} contracts
                                </div>
                                <div className="text-xs text-gray-500">
                                  {stats.documents} documents
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {algoLockup} ALGO
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                <div>${transactionCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                <div className="text-xs text-gray-500">
                                  {transactions.toLocaleString()} transactions
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {tenantMRR > 0 ? formatCurrency(tenantMRR) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {tenantARR > 0 ? formatCurrency(tenantARR) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {tenantProfit !== null ? formatCurrency(tenantProfit) : '-'}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={10} className="px-6 py-4 text-center text-sm text-gray-500">
                          No organizations found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              </div>
            )}

            {/* Billing Events Tab */}
            {billingEventsTab === 'billing_events' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Event ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tenant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        BILL-2024-001
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Acme Corporation
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Charge</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        $2,500.00
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Completed
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">2024-01-28</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Costs Tab */}
      {activeTab === 'costs' && (
        <div>
          {/* Time Filter */}
          <div className="mb-4">
            <div className="relative inline-block">
              <select
                value={costTimeFilter}
                onChange={(e) => setCostTimeFilter(e.target.value)}
                className="appearance-none rounded border border-gray-200 bg-white px-3 py-2 pr-8 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">All Time</option>
                <option value="1m">Last Month</option>
                <option value="3m">Last 3 months</option>
                <option value="6m">Last 6 months</option>
                <option value="1y">Last year</option>
                <option value="2y">Last 2 years</option>
              </select>
              <IconChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            </div>
          </div>

          {/* KPI Strip */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <KPICard 
              title="Total Storage" 
              value={`${formatNumber(totalCostsAndUsage.totalStorageGB)} GB`} 
              subtitle="Across all tenants/orgs/users" 
            />
            <KPICard 
              title="ALGO Locked" 
              value={formatAlgo(totalCostsAndUsage.totalAlgoLockup)} 
              subtitle="In contracts & documents" 
            />
            <KPICard 
              title="Transaction Fees" 
              value={formatCurrency(totalCostsAndUsage.totalTransactionFees)} 
              subtitle="All on-chain fees" 
            />
            <KPICard 
              title="KYC/KYB Inquiries" 
              value={formatCurrency(totalCostsAndUsage.totalKycKybCost)} 
              subtitle={`${totalCostsAndUsage.kycCount} KYC, ${totalCostsAndUsage.kybCount} KYB`} 
            />
          </div>

          {/* Cost Drivers */}
          <div className="mb-6 rounded-lg bg-white p-6" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cost Drivers</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Keyed Users</div>
                  <div className="text-sm text-gray-500">Users with keys across all tenants/orgs</div>
                </div>
                <div className="text-lg font-semibold text-gray-900">{totalCostsAndUsage.totalKeyedUsers.toLocaleString()}</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">KYC/KYB Inquiries</div>
                  <div className="text-sm text-gray-500">
                    {totalCostsAndUsage.kycCount} KYC inquiries ({Math.max(0, totalCostsAndUsage.kycCount - 500)} beyond included 500), {totalCostsAndUsage.kybCount} KYB inquiries
                  </div>
                </div>
                <div className="text-lg font-semibold text-gray-900">{formatCurrency(totalCostsAndUsage.totalKycKybCost)}</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">ALGO Locked in Contracts & Documents</div>
                  <div className="text-sm text-gray-500">Total ALGO in escrow/lockup across all tenants/orgs/users</div>
                </div>
                <div className="text-lg font-semibold text-gray-900">{formatAlgo(totalCostsAndUsage.totalAlgoLockup)} ALGO</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Transaction Fees</div>
                  <div className="text-sm text-gray-500">Algorand on-chain transaction fees for all contracts, documents, and signature requests</div>
                </div>
                <div className="text-lg font-semibold text-gray-900">{formatCurrency(totalCostsAndUsage.totalTransactionFees)}</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">Storage (Object & DB)</div>
                  <div className="text-sm text-gray-500">{formatNumber(totalCostsAndUsage.totalStorageGB)} GB stored across all tenants/orgs/users</div>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {/* Storage cost calculation - approximate $0.023 per GB/month */}
                  {formatCurrency(totalCostsAndUsage.totalStorageGB * 0.023)}
                </div>
              </div>
            </div>
          </div>

          {/* Usage Metrics */}
          <div className="rounded-lg bg-white p-6" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Metrics</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-900">Total Keyed Users</span>
                  <span className="font-medium text-gray-900">{totalCostsAndUsage.totalKeyedUsers.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500">Users with keys across all tenants/orgs</div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-900">Total Contracts</span>
                  <span className="font-medium text-gray-900">{totalCostsAndUsage.totalContracts.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500">Across all tenants/orgs/users</div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-900">Total Documents</span>
                  <span className="font-medium text-gray-900">{totalCostsAndUsage.totalDocuments.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500">Across all tenants/orgs/users</div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-900">Total Signature Requests</span>
                  <span className="font-medium text-gray-900">{totalCostsAndUsage.totalSignatureRequests.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500">Across all tenants/orgs/users</div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-900">Total Signers</span>
                  <span className="font-medium text-gray-900">{totalCostsAndUsage.totalSigners.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500">Total signers across all signature requests</div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-900">Total Transactions</span>
                  <span className="font-medium text-gray-900">{totalCostsAndUsage.totalTransactions.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500">On-chain transactions across all contracts, documents, and signature requests</div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-900">KYC Inquiries</span>
                  <span className="font-medium text-gray-900">{totalCostsAndUsage.kycCount.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500">Total KYC verifications across all users</div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-900">KYB Inquiries</span>
                  <span className="font-medium text-gray-900">{totalCostsAndUsage.kybCount.toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500">Total KYB verifications across all organizations</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tenant Detail Drawer */}
      {selectedTenant && (
        <Drawer
          isOpen={!!selectedTenant}
          onClose={() => {
            setSelectedTenant(null)
            setDrawerTab('overview')
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
                          <span className="text-sm font-mono text-gray-900">
                            {formatEscraUserId(user.escra_public_user_id)}
                          </span>
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
                          // 3. Tenant status is active (selectedTenant should be active)
                          // 4. User has keys
                          if (user.status !== UserStatus.ACTIVE) {
                            return <span className="text-sm font-mono text-gray-900">N/A</span>
                          }
                          
                          const verificationStatus = getUserVerificationStatus(user)
                          if (verificationStatus !== 'approved') {
                            return <span className="text-sm font-mono text-gray-900">N/A</span>
                          }
                          
                          // Check if tenant is active
                          if (!selectedTenant || selectedTenant.status !== TenantStatus.ACTIVE) {
                            return <span className="text-sm font-mono text-gray-900">N/A</span>
                          }
                          
                          // Get public key from user's keys (wallet_address from active key)
                          const userKeys = (allKeysForTenantDrawer?.items || []).filter((key: Key) => 
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
                    data={usersData?.items || []}
                    loading={usersLoading}
                    emptyMessage="No users found for this tenant"
                  />
                  {usersData && (
                    <Pagination
                      page={usersPage}
                      totalPages={usersData.total_pages}
                      onPageChange={setUsersPage}
                      pageSize={usersData.page_size}
                      total={usersData.total}
                    />
                  )}
                </div>
              </div>
            )}

            {drawerTab === 'usage' && (
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
                      const allotments = getPlanAllotments(selectedTenant.plan)
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
                      {(['contracts', 'documents', 'signature_requests'] as const).map((tab) => (
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
                                <span className="text-sm font-mono text-gray-900">
                                  {formatEscraUserId(item.user_creator_id)}
                                </span>
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
                        data={filteredContractsTableData?.items || []}
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
                                <span className="text-sm font-mono text-gray-900">
                                  {formatEscraUserId(item.user_creator_id)}
                                </span>
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
                        data={filteredDocumentsTableData?.items || []}
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
                              <span className="text-sm font-mono text-gray-900">{item.escra_public_signature_request_id || 'N/A'}</span>
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
                                <span className="text-sm font-mono text-gray-900">
                                  {formatEscraUserId(item.user_creator_id)}
                                </span>
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
                        data={filteredSignatureRequestsTableData?.items || []}
                        loading={signatureRequestsLoading}
                        emptyMessage="No signature requests found"
                      />
                    )}

                  </div>
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
    </div>
  )
}
