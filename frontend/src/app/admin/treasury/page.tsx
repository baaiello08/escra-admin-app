'use client'

/**
 * Treasury Page - Display ALGO balances, staking yield, and bank account information
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { KPICard } from '@/components/shared/KPICard'
import { CopyButton } from '@/components/shared/CopyButton'
import { apiClient } from '@/lib/api-client'

// Mock data for treasury - in production, this would come from API
const MOCK_TREASURY_DATA = {
  mainFundingWalletTotalBalance: 10000, // Total balance in main funding wallet
  treasuryWalletBalance: 0, // ALGO in treasury wallet
  stakingAPY: 6, // 6% APY for staking
}

export default function TreasuryPage() {
  // Fetch all contracts and documents to calculate total locked ALGO
  const { data: contractsData } = useQuery({
    queryKey: ['treasury-contracts'],
    queryFn: () => apiClient.listContracts({ page_size: 10000 }),
  })

  const { data: documentsData } = useQuery({
    queryKey: ['treasury-documents'],
    queryFn: () => apiClient.listDocuments({ page_size: 10000 }),
  })

  // Calculate total ALGO locked up from contracts and documents
  const totalAlgoLocked = useMemo(() => {
    const contractsLockup = (contractsData?.items || []).reduce((sum, contract) => sum + (contract.lockup || 0), 0)
    const documentsLockup = (documentsData?.items || []).reduce((sum, doc) => sum + (doc.lockup || 0), 0)
    return contractsLockup + documentsLockup
  }, [contractsData, documentsData])

  // Funding wallet balance (10,000 - locked amount)
  const fundingWalletBalance = useMemo(() => {
    return MOCK_TREASURY_DATA.mainFundingWalletTotalBalance - totalAlgoLocked
  }, [totalAlgoLocked])

  // Combined balance (10,000 + locked amount)
  const combinedBalance = useMemo(() => {
    return MOCK_TREASURY_DATA.mainFundingWalletTotalBalance + totalAlgoLocked
  }, [totalAlgoLocked])

  // Calculate staking yield based on 6% APY
  const stakingYield = useMemo(() => {
    // Annual yield = (combined balance + treasury wallet balance) * 0.06
    const totalBalance = combinedBalance + MOCK_TREASURY_DATA.treasuryWalletBalance
    const annualYield = totalBalance * (MOCK_TREASURY_DATA.stakingAPY / 100)
    // Monthly yield = annual yield / 12
    const monthlyYield = annualYield / 12
    // Daily yield = annual yield / 365
    const dailyYield = annualYield / 365
    return {
      annual: annualYield,
      monthly: monthlyYield,
      daily: dailyYield,
    }
  }, [combinedBalance])

  // Format ALGO amount
  const formatAlgo = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Mock bank account data - in production, this would come from API
  const bankAccount = {
    bankName: 'First National Bank',
    accountName: 'Escra Inc.',
    accountType: 'Business Checking',
    accountNumber: '****1234',
    routingNumber: '021000021',
    swiftCode: 'FNBOUS33',
    address: '123 Business St, New York, NY 10001',
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Treasury</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor ALGO balances, staking yield, and bank account information
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KPICard
            title="Total ALGO Locked"
            value={`${formatAlgo(totalAlgoLocked)} ALGO`}
            subtitle="In contracts & documents"
          />
          <KPICard
            title="Funding Wallet Balance"
            value={`${formatAlgo(fundingWalletBalance)} ALGO`}
            subtitle="Available balance"
          />
          <KPICard
            title="Combined Balance"
            value={`${formatAlgo(combinedBalance)} ALGO`}
            subtitle="Total ALGO holdings"
          />
          <KPICard
            title="Treasury Wallet Balance"
            value={`${formatAlgo(MOCK_TREASURY_DATA.treasuryWalletBalance)} ALGO`}
            subtitle="Treasury wallet balance"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KPICard
            title="Annual Staking Yield"
            value={`${formatAlgo(stakingYield.annual)} ALGO`}
            subtitle={`${MOCK_TREASURY_DATA.stakingAPY}% APY`}
          />
        </div>
      </div>

      {/* ALGO Holdings Details */}
      <div className="mb-6 rounded-lg bg-white p-6" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">ALGO Holdings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Total ALGO Locked/Committed</div>
              <div className="text-sm text-gray-500">ALGO locked in contracts and documents across all tenants</div>
            </div>
            <div className="text-lg font-semibold text-gray-900">{formatAlgo(totalAlgoLocked)} ALGO</div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Funding Wallet Balance</div>
              <div className="text-sm text-gray-500">Available balance in primary funding wallet</div>
            </div>
            <div className="text-lg font-semibold text-gray-900">{formatAlgo(fundingWalletBalance)} ALGO</div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Combined Balance</div>
              <div className="text-sm text-gray-500">Total ALGO holdings (10,000 + locked)</div>
            </div>
            <div className="text-lg font-semibold text-gray-900">{formatAlgo(combinedBalance)} ALGO</div>
          </div>
        </div>
      </div>

      {/* Staking Yield Details */}
      <div className="mb-6 rounded-lg bg-white p-6" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Staking Yield</h2>
        <div className="mb-4">
          <div className="text-sm text-gray-500 mb-2">Based on {MOCK_TREASURY_DATA.stakingAPY}% APY</div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Daily Yield</div>
              <div className="text-sm text-gray-500">Estimated daily staking yield</div>
            </div>
            <div className="text-lg font-semibold text-gray-900">{formatAlgo(stakingYield.daily)} ALGO</div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Monthly Yield</div>
              <div className="text-sm text-gray-500">Estimated monthly staking yield</div>
            </div>
            <div className="text-lg font-semibold text-gray-900">{formatAlgo(stakingYield.monthly)} ALGO</div>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium text-gray-900">Annual Yield</div>
              <div className="text-sm text-gray-500">Estimated annual staking yield</div>
            </div>
            <div className="text-lg font-semibold text-gray-900">{formatAlgo(stakingYield.annual)} ALGO</div>
          </div>
        </div>
      </div>

      {/* Bank Account Information */}
      <div className="rounded-lg bg-white p-6" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Bank Account</h2>
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Bank Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{bankAccount.bankName}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Account Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{bankAccount.accountName}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Account Type</dt>
            <dd className="mt-1 text-sm text-gray-900">{bankAccount.accountType}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Account Number</dt>
            <dd className="mt-1 text-sm text-gray-900 flex items-center gap-2">
              <span>{bankAccount.accountNumber}</span>
              <CopyButton text={bankAccount.accountNumber} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Routing Number</dt>
            <dd className="mt-1 text-sm text-gray-900 flex items-center gap-2">
              <span>{bankAccount.routingNumber}</span>
              <CopyButton text={bankAccount.routingNumber} />
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">SWIFT Code</dt>
            <dd className="mt-1 text-sm text-gray-900 flex items-center gap-2">
              <span>{bankAccount.swiftCode}</span>
              <CopyButton text={bankAccount.swiftCode} />
            </dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Bank Address</dt>
            <dd className="mt-1 text-sm text-gray-900">{bankAccount.address}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
