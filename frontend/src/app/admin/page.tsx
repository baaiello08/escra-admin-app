'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { StatusChip } from '@/components/shared/StatusChip'
import Link from 'next/link'

export default function AdminDashboard() {
  const { data: tenantsData } = useQuery({
    queryKey: ['tenants-dashboard'],
    queryFn: () => apiClient.listTenants({ page: 1, page_size: 100 }),
  })

  const { data: usersData } = useQuery({
    queryKey: ['users-dashboard'],
    queryFn: () => apiClient.listUsers({ page: 1, page_size: 100 }),
  })

  const { data: indexerStatus } = useQuery({
    queryKey: ['indexer-status-dashboard'],
    queryFn: () => apiClient.getIndexerStatus(),
  })

  const activeTenants = tenantsData?.items.filter(t => t.status === 'active').length || 0
  const totalUsers = usersData?.total || 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of Escra admin portal status and metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/tenants" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Tenants</h2>
          <p className="text-3xl font-bold text-primary-600">{tenantsData?.total || 0}</p>
          <p className="text-sm text-gray-500 mt-2">{activeTenants} active</p>
        </Link>
        <Link href="/admin/users" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Users</h2>
          <p className="text-3xl font-bold text-primary-600">{totalUsers}</p>
          <p className="text-sm text-gray-500 mt-2">Total users</p>
        </Link>
        <Link href="/admin/indexer" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Indexer</h2>
          <div className="flex items-center gap-2">
            <StatusChip status={indexerStatus?.status || 'idle'} size="sm" />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Lag: {indexerStatus?.lag_blocks || 0} blocks
          </p>
        </Link>
        <Link href="/admin/support" className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Support Cases</h2>
          <p className="text-3xl font-bold text-primary-600">3</p>
          <p className="text-sm text-gray-500 mt-2">2 open</p>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">Recent Tenants</h2>
          {tenantsData?.items && tenantsData.items.length > 0 ? (
            <div className="space-y-3">
              {tenantsData.items.slice(0, 5).map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium text-gray-900">{tenant.name}</div>
                    <div className="text-sm text-gray-500">{tenant.slug}</div>
                  </div>
                  <StatusChip status={tenant.status} size="sm" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No tenants</p>
          )}
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API Service</span>
              <StatusChip status="healthy" size="sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Indexer Service</span>
              <StatusChip status={indexerStatus?.is_healthy ? 'healthy' : 'degraded'} size="sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">MongoDB</span>
              <StatusChip status="healthy" size="sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Persona API</span>
              <StatusChip status="healthy" size="sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

