'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusChip } from '@/components/shared/StatusChip'
import { Pagination } from '@/components/shared/Pagination'
import { SupportCase } from '@/types'

export default function SupportPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['support-cases', page, statusFilter, priorityFilter],
    queryFn: () =>
      apiClient.listSupportCases({
        page,
        page_size: 20,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      }),
  })

  const priorityColors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-yellow-100 text-yellow-800',
    urgent: 'bg-red-100 text-red-800',
  }

  const columns: Column<SupportCase>[] = [
    {
      key: 'case_id',
      header: 'Case ID',
      render: (supportCase) => (
        <div>
          <div className="font-medium text-gray-900">{supportCase.case_id}</div>
          <div className="text-sm text-gray-500">{supportCase.subject}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (supportCase) => <StatusChip status={supportCase.status} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (supportCase) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            priorityColors[supportCase.priority] || priorityColors.medium
          }`}
        >
          {supportCase.priority}
        </span>
      ),
    },
    {
      key: 'tenant_id',
      header: 'Tenant',
      render: (supportCase) => (
        <span className="text-sm text-gray-600">
          {supportCase.tenant_id || 'N/A'}
        </span>
      ),
    },
    {
      key: 'assigned_to',
      header: 'Assigned To',
      render: (supportCase) => (
        <span className="text-sm text-gray-600">
          {supportCase.assigned_to || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'tags',
      header: 'Tags',
      render: (supportCase) => (
        <div className="flex flex-wrap gap-1">
          {supportCase.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800"
            >
              {tag}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (supportCase) => (
        <span className="text-sm text-gray-500">
          {new Date(supportCase.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (supportCase) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            router.push(`/admin/support/${supportCase.id}`)
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
          <h1 className="text-3xl font-bold text-gray-900">Support</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage support cases, impersonation sessions, and announcements
          </p>
        </div>
        <button
          onClick={() => router.push('/admin/support/new')}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500"
        >
          Create Case
        </button>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div className="text-sm font-medium text-gray-500">Open Cases</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {data?.items.filter(c => c.status === 'open').length || 0}
          </div>
        </div>
        <div className="rounded-lg bg-white p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div className="text-sm font-medium text-gray-500">In Progress</div>
          <div className="mt-2 text-2xl font-bold text-blue-600">
            {data?.items.filter(c => c.status === 'in_progress').length || 0}
          </div>
        </div>
        <div className="rounded-lg bg-white p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div className="text-sm font-medium text-gray-500">Resolved</div>
          <div className="mt-2 text-2xl font-bold text-green-600">
            {data?.items.filter(c => c.status === 'resolved').length || 0}
          </div>
        </div>
        <div className="rounded-lg bg-white p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <div className="text-sm font-medium text-gray-500">Urgent</div>
          <div className="mt-2 text-2xl font-bold text-red-600">
            {data?.items.filter(c => c.priority === 'urgent').length || 0}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-lg bg-white p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg bg-white" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <DataTable
          columns={columns}
          data={data?.items || []}
          loading={isLoading}
          onRowClick={(supportCase) => router.push(`/admin/support/${supportCase.id}`)}
          emptyMessage="No support cases found"
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
