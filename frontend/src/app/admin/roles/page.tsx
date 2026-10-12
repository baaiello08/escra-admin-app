'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { DataTable, Column } from '@/components/shared/DataTable'
import { Pagination } from '@/components/shared/Pagination'
import { Role, RoleType } from '@/types'

export default function RolesPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['roles', page],
    queryFn: () => apiClient.listRoles({ page, page_size: 20 }),
  })

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: 'Role Name',
      render: (role) => (
        <div>
          <div className="font-medium text-gray-900">{role.name}</div>
          {role.description && (
            <div className="text-sm text-gray-500">{role.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (role) => (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 capitalize">
          {role.type}
        </span>
      ),
    },
    {
      key: 'permissions',
      header: 'Permissions',
      render: (role) => (
        <span className="text-sm text-gray-600">
          {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'is_default',
      header: 'Default',
      render: (role) => (
        <span className="text-sm text-gray-600">{role.is_default ? 'Yes' : 'No'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (role) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/admin/roles/${role.id}`)
          }}
          className="text-primary-600 hover:text-primary-900 text-sm font-medium"
        >
          View
        </button>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage system roles, tenant roles, and permissions
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/roles/new')}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
        >
          Create Role
        </button>
      </div>

      {/* Role Types Summary */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm font-medium text-gray-500">System Roles</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {data?.items.filter(r => r.type === RoleType.SYSTEM).length || 0}
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm font-medium text-gray-500">Tenant Roles</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {data?.items.filter(r => r.type === RoleType.TENANT).length || 0}
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm font-medium text-gray-500">Custom Roles</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {data?.items.filter(r => r.type === RoleType.CUSTOM).length || 0}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <DataTable
          columns={columns}
          data={data?.items || []}
          loading={isLoading}
          onRowClick={(role) => router.push(`/admin/roles/${role.id}`)}
          emptyMessage="No roles found"
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
  )
}
