'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { StatusChip } from '@/components/shared/StatusChip'

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const id = resolvedParams.id

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => apiClient.getUser(id),
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>User not found</div>
  }

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          ← Back to Users
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.first_name} {user.last_name}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{user.email}</p>
          </div>
          <StatusChip status={user.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">Profile</h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email Verified</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {user.email_verified ? 'Yes' : 'No'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Tenant ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.tenant_id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Verification Level</dt>
                <dd className="mt-1 text-sm text-gray-900 capitalize">
                  {user.verification_level}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Login</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {user.last_login_at
                    ? new Date(user.last_login_at).toLocaleString()
                    : 'Never'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Login IP</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.last_login_ip || 'N/A'}</dd>
              </div>
            </dl>
          </div>

          {/* Roles & Access */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">Roles & Access</h2>
            <div className="space-y-4">
              {user.system_roles.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-2">System Roles</dt>
                  <div className="flex flex-wrap gap-2">
                    {user.system_roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {user.roles.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-2">Tenant Roles</dt>
                  <div className="flex flex-wrap gap-2">
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className="inline-flex items-center rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {user.permissions.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 mb-2">Permissions</dt>
                  <div className="flex flex-wrap gap-2">
                    {user.permissions.slice(0, 10).map((perm) => (
                      <span
                        key={perm}
                        className="inline-flex items-center rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800"
                      >
                        {perm}
                      </span>
                    ))}
                    {user.permissions.length > 10 && (
                      <span className="text-xs text-gray-500">
                        +{user.permissions.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Identity & Persona */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">Identity & Persona</h2>
            <dl className="grid grid-cols-1 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Persona Inquiry ID</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {user.persona_inquiry_id || 'Not verified'}
                </dd>
              </div>
              {user.persona_verification_status && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Verification Status</dt>
                  <dd className="mt-1">
                    <StatusChip status={user.persona_verification_status} />
                  </dd>
                </div>
              )}
              {user.persona_risk_signals.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Risk Signals</dt>
                  <dd className="mt-1">
                    <div className="flex flex-wrap gap-2">
                      {user.persona_risk_signals.map((signal) => (
                        <span
                          key={signal}
                          className="inline-flex items-center rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800"
                        >
                          {signal}
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* PII & Privacy */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">PII & Privacy</h2>
            <dl className="grid grid-cols-1 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">PII Classification</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {user.pii_classification || 'Not classified'}
                </dd>
              </div>
              {user.data_subject_requests.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Data Subject Requests</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {user.data_subject_requests.length} request(s)
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <button className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                Edit User
              </button>
              <button className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                Reset Password
              </button>
              <button className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                View Sessions
              </button>
              <button className="w-full rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                View Persona Inquiry
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

