'use client'

/**
 * Security & Risk - Enhanced OFAC/AML monitoring UI per escra-frontend-enhancement-plan.md
 * Converted to compliance investigations dashboard
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { DataTable, Column } from '@/components/shared/DataTable'
import { StatusChip } from '@/components/shared/StatusChip'
import { Pagination } from '@/components/shared/Pagination'
import { KPICard } from '@/components/shared/KPICard'
import { Drawer } from '@/components/shared/Drawer'
import { SecurityEvent } from '@/types'

export default function SecurityPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [reasonFilter, setReasonFilter] = useState<string>('all')
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['security-events', page, severityFilter],
    queryFn: () =>
      apiClient.listSecurityEvents({
        page,
        page_size: 20,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
      }),
  })

  const events = data?.items || []
  const flaggedUsers = events.filter(e => e.entity_type === 'user' || e.user_id).length
  const flaggedTenants = events.filter(e => e.entity_type === 'tenant' || e.tenant_id).length
  const flaggedTransactions = events.filter(e => e.entity_type === 'transaction').length

  const columns: Column<SecurityEvent>[] = [
    {
      key: 'event_id',
      header: 'Case ID',
      render: (event) => (
        <div>
          <div className="font-medium text-gray-900">{event.event_id}</div>
          <div className="text-sm text-gray-500 capitalize">{event.event_type.replace('_', ' ')}</div>
        </div>
      ),
    },
    {
      key: 'severity',
      header: 'Risk Rating',
      render: (event) => {
        const colors: Record<string, string> = {
          low: 'bg-gray-100 text-gray-800',
          medium: 'bg-yellow-100 text-yellow-800',
          high: 'bg-orange-100 text-orange-800',
          critical: 'bg-red-100 text-red-800',
        }
        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              colors[event.severity] || colors.medium
            }`}
          >
            {event.severity}
          </span>
        )
      },
    },
    {
      key: 'entity_type',
      header: 'Entity Type',
      render: (event) => (
        <span className="text-sm text-gray-900 capitalize">
          {(event as any).entity_type || (event.user_id ? 'User' : event.tenant_id ? 'Tenant' : 'Transaction')}
        </span>
      ),
    },
    {
      key: 'tenant_id',
      header: 'Tenant',
      render: (event) => (
        <span className="text-sm text-gray-900">{event.tenant_id || 'N/A'}</span>
      ),
    },
    {
      key: 'user_id',
      header: 'User',
      render: (event) => (
        <span className="text-sm text-gray-900">{event.user_id || 'N/A'}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (event) => (
        <span className="text-sm text-gray-900">
          {(event as any).reason || event.description || 'Security event'}
        </span>
      ),
    },
    {
      key: 'resolved',
      header: 'Investigation Status',
      render: (event) => (
        <StatusChip status={event.resolved ? 'resolved' : 'open'} />
      ),
    },
    {
      key: 'created_at',
      header: 'Detected',
      sortable: true,
      render: (event) => (
        <span className="text-sm text-gray-900">
          {new Date(event.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (event) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setSelectedEvent(event)
          }}
          className="text-primary-600 hover:text-primary-900 text-sm font-medium"
        >
          Investigate
        </button>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Security & Risk</h1>
        <p className="mt-1 text-sm text-gray-500">
          Compliance investigations dashboard: OFAC/AML monitoring, flagged entities, and risk assessments
        </p>
      </div>

      {/* KPI Strip */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <KPICard title="Total Investigations" value={data?.total || 0} subtitle="All flagged cases" />
        <KPICard title="Flagged Users" value={flaggedUsers} subtitle="Users flagged" />
        <KPICard title="Flagged Tenants" value={flaggedTenants} subtitle="Tenants flagged" />
        <KPICard
          title="Critical Risk"
          value={events.filter(e => e.severity === 'critical').length}
          subtitle="Critical severity"
        />
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-lg bg-white p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700">Risk Level</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
            >
              <option value="all">All Levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700">Reason</label>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
            >
              <option value="all">All Reasons</option>
              <option value="ofac_match">OFAC Match</option>
              <option value="aml_flag">AML Flag</option>
              <option value="suspicious_activity">Suspicious Activity</option>
              <option value="fraud">Fraud Detection</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700">Entity Type</label>
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
            >
              <option value="all">All Types</option>
              <option value="user">User</option>
              <option value="tenant">Tenant</option>
              <option value="transaction">Transaction</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700">Investigation Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg bg-white" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <DataTable
          columns={columns}
          data={events}
          loading={isLoading}
          onRowClick={(event) => setSelectedEvent(event)}
          emptyMessage="No security events found"
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

      {/* Investigation Detail Drawer */}
      {selectedEvent && (
        <Drawer
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={`Investigation: ${selectedEvent.event_id}`}
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Risk Rating</dt>
                <dd className="mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      selectedEvent.severity === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : selectedEvent.severity === 'high'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {selectedEvent.severity}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Investigation Status</dt>
                <dd className="mt-1">
                  <StatusChip status={selectedEvent.resolved ? 'resolved' : 'open'} />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Entity Type</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">
                  {(selectedEvent as any).entity_type || (selectedEvent.user_id ? 'User' : 'Transaction')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Detected</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(selectedEvent.created_at).toLocaleString()}
                </dd>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary</h3>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-900">
                  {(selectedEvent as any).reason || selectedEvent.description || 'Security event detected requiring investigation.'}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Related Entities</h3>
              <div className="space-y-2">
                {selectedEvent.tenant_id && (
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="text-sm font-medium text-gray-900">Tenant</div>
                    <div className="text-sm text-primary-600">{selectedEvent.tenant_id}</div>
                  </div>
                )}
                {selectedEvent.user_id && (
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="text-sm font-medium text-gray-900">User</div>
                    <div className="text-sm text-primary-600">{selectedEvent.user_id}</div>
                  </div>
                )}
                {selectedEvent.ip_address && (
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="text-sm font-medium text-gray-900">IP Address</div>
                    <div className="text-sm font-mono text-gray-900">{selectedEvent.ip_address}</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Investigation Timeline</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 rounded-full bg-primary-600 mt-2"></div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Case Created</div>
                    <div className="text-xs text-gray-500">
                      {new Date(selectedEvent.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                {selectedEvent.resolved && (
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="h-2 w-2 rounded-full bg-green-600 mt-2"></div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Resolved</div>
                      <div className="text-xs text-gray-500">
                        {(selectedEvent as any).resolved_at
                          ? new Date((selectedEvent as any).resolved_at).toLocaleString()
                          : 'Recently'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Evidence & Notes</h3>
              <p className="text-sm text-gray-600">
                Investigation notes and evidence will be displayed here. This section will include links to
                related transactions, user history, and compliance reports once backend integration is complete.
              </p>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}
