'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter, useParams } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { StatusChip } from '@/components/shared/StatusChip'
import { TenantStatus, TenantPlan } from '@/types'

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const id = resolvedParams.id

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => apiClient.getTenant(id),
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!tenant) {
    return <div>Tenant not found</div>
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          ← Back to Tenants
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{tenant.name}</h1>
            <p className="mt-1 text-sm text-gray-500">Tenant ID: {tenant.id}</p>
          </div>
          <div className="flex gap-2">
            <StatusChip status={tenant.status} />
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm capitalize">
              {tenant.plan}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">Overview</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Slug</dt>
                <dd className="mt-1 text-sm text-gray-900">{tenant.slug}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Region</dt>
                <dd className="mt-1 text-sm text-gray-900">{tenant.region}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Timezone</dt>
                <dd className="mt-1 text-sm text-gray-900">{tenant.timezone}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(tenant.created_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Profile */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">Organization Profile</h2>
            <dl className="grid grid-cols-1 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Legal Entity Name</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {tenant.legal_entity_name || 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Billing Entity Name</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {tenant.billing_entity_name || 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Tax ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{tenant.tax_id || 'Not set'}</dd>
              </div>
            </dl>
          </div>

          {/* Contacts */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
            <dl className="grid grid-cols-1 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Primary Contact</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {tenant.primary_contact_email || 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Billing Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {tenant.billing_email || 'Not set'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Support Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {tenant.support_email || 'Not set'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Lifecycle */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">Lifecycle</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <StatusChip status={tenant.status} />
                </dd>
              </div>
              {tenant.trial_ends_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Trial Ends</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(tenant.trial_ends_at).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {tenant.suspended_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Suspended At</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(tenant.suspended_at).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                Edit Tenant
              </button>
              <button className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                View Users
              </button>
              <button className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                View Ledger
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

