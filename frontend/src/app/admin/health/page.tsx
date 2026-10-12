'use client'

/**
 * System Health - Complete service inventory per escra-frontend-enhancement-plan.md
 * Shows health/status for all services: AWS, Postgres, DocuSign, Adobe Sign, Cloudflare,
 * Stripe, HashiCorp Vault, Slack, Algorand blockchain, Smart contract engine, Onboarding engine
 */

import { KPICard } from '@/components/shared/KPICard'
import { StatusChip } from '@/components/shared/StatusChip'

export default function SystemHealthPage() {
  const services = [
    { name: 'API Service', status: 'healthy', responseTime: '45ms', uptime: '99.9%', errorRate: '0.1%', lastIncident: '30 days ago' },
    { name: 'AWS Infrastructure', status: 'healthy', responseTime: '12ms', uptime: '100%', errorRate: '0%', lastIncident: 'Never' },
    { name: 'Postgres Database', status: 'healthy', responseTime: '8ms', uptime: '100%', errorRate: '0%', lastIncident: 'Never' },
    { name: 'MongoDB', status: 'healthy', responseTime: '12ms', uptime: '100%', errorRate: '0%', lastIncident: 'Never' },
    { name: 'Indexer Service', status: 'healthy', responseTime: '120ms', uptime: '99.8%', errorRate: '0.2%', lastIncident: '5 days ago' },
    { name: 'Persona API', status: 'degraded', responseTime: '850ms', uptime: '98.5%', errorRate: '1.5%', lastIncident: '2 hours ago' },
    { name: 'Algorand Node', status: 'healthy', responseTime: '230ms', uptime: '99.7%', errorRate: '0.3%', lastIncident: '7 days ago' },
    { name: 'Smart Contract Engine', status: 'healthy', responseTime: '180ms', uptime: '99.9%', errorRate: '0.1%', lastIncident: '14 days ago' },
    { name: 'Onboarding Engine', status: 'healthy', responseTime: '95ms', uptime: '99.8%', errorRate: '0.2%', lastIncident: '10 days ago' },
    { name: 'DocuSign', status: 'healthy', responseTime: '320ms', uptime: '99.5%', errorRate: '0.5%', lastIncident: '3 days ago' },
    { name: 'Adobe Sign', status: 'healthy', responseTime: '285ms', uptime: '99.6%', errorRate: '0.4%', lastIncident: '4 days ago' },
    { name: 'Cloudflare', status: 'healthy', responseTime: '15ms', uptime: '100%', errorRate: '0%', lastIncident: 'Never' },
    { name: 'Stripe', status: 'healthy', responseTime: '145ms', uptime: '99.9%', errorRate: '0.1%', lastIncident: '21 days ago' },
    { name: 'HashiCorp Vault', status: 'healthy', responseTime: '22ms', uptime: '100%', errorRate: '0%', lastIncident: 'Never' },
    { name: 'Slack Integration', status: 'healthy', responseTime: '180ms', uptime: '99.7%', errorRate: '0.3%', lastIncident: '6 days ago' },
  ]

  const statusColors: Record<string, string> = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    down: 'bg-red-100 text-red-800',
  }

  const healthyCount = services.filter(s => s.status === 'healthy').length
  const degradedCount = services.filter(s => s.status === 'degraded').length
  const downCount = services.filter(s => s.status === 'down').length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor service health, background jobs, and feature flags
        </p>
      </div>

      {/* KPI Strip */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <KPICard title="Healthy Services" value={`${healthyCount}/${services.length}`} subtitle="All systems operational" />
        <KPICard title="Degraded Services" value={degradedCount} subtitle="Requires attention" />
        <KPICard title="Running Jobs" value={3} subtitle="Background jobs" />
        <KPICard title="Failed Jobs (24h)" value={2} subtitle="In last 24 hours" />
      </div>

      {/* Service Inventory */}
      <div className="mb-6 rounded-lg bg-white p-6" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Inventory</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uptime</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Incident</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {services.map((service) => (
                <tr key={service.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{service.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusChip status={service.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{service.responseTime}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{service.uptime}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm ${
                      parseFloat(service.errorRate) === 0 ? 'text-green-600' :
                      parseFloat(service.errorRate) < 1 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {service.errorRate}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{service.lastIncident}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Background Jobs */}
      <div className="mb-6 rounded-lg bg-white p-6" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Background Jobs</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-sm font-medium text-gray-500">Running</div>
            <div className="mt-2 text-2xl font-bold text-green-600">3</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-sm font-medium text-gray-500">Failed (24h)</div>
            <div className="mt-2 text-2xl font-bold text-red-600">2</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="text-sm font-medium text-gray-500">Completed (24h)</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">1,247</div>
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="rounded-lg bg-white p-6" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Flags</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flag Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scope</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">bulk_export</td>
                <td className="px-6 py-4 text-sm text-gray-900">Enable bulk export functionality</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusChip status="healthy" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Global</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">advanced_analytics</td>
                <td className="px-6 py-4 text-sm text-gray-900">Advanced analytics dashboard</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                    Disabled
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Enterprise Only</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">webhooks_v2</td>
                <td className="px-6 py-4 text-sm text-gray-900">New webhooks API version</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusChip status="healthy" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Global</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">persona_integration</td>
                <td className="px-6 py-4 text-sm text-gray-900">Persona identity verification</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusChip status="healthy" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Global</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
