'use client'

/**
 * Templates - Template library per escra-frontend-enhancement-plan.md
 * Renamed from Contracts & Workflows
 */

import { useState } from 'react'
import { KPICard } from '@/components/shared/KPICard'
import { StatusChip } from '@/components/shared/StatusChip'
import { Drawer } from '@/components/shared/Drawer'
import { IconEdit, IconTemplateOff } from '@tabler/icons-react'

interface ContractTemplate {
  id: string
  name: string
  category: string
  industry: string
  usage_count: number
  last_updated: string
  status: string
}

export default function TemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null)

  const templates: ContractTemplate[] = [
    {
      id: 'template-1',
      name: 'Employment Agreement',
      category: 'Service Agreement',
      industry: 'HR',
      usage_count: 1247,
      last_updated: '2024-01-15',
      status: 'active',
    },
    {
      id: 'template-2',
      name: 'Service Agreement',
      category: 'Service Agreement',
      industry: 'Services',
      usage_count: 892,
      last_updated: '2024-01-20',
      status: 'active',
    },
    {
      id: 'template-3',
      name: 'NDA Template',
      category: 'NDAs',
      industry: 'Legal',
      usage_count: 2156,
      last_updated: '2024-01-10',
      status: 'active',
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage contract templates and document templates
          </p>
        </div>
        <button className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500">
          Create Template
        </button>
      </div>

      {/* KPI Strip */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPICard title="Contract Templates" value={templates.length} subtitle="Active templates" />
        <KPICard title="Active Contracts" value={247} subtitle="In progress" />
        <KPICard title="Documents" value={3,891} subtitle="Total documents" />
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-lg bg-white p-4" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700">Industry</label>
            <select className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500">
              <option>All Industries</option>
              <option>HR</option>
              <option>Legal</option>
              <option>Services</option>
              <option>Real Estate</option>
              <option>Finance</option>
              <option>Unions & Labor</option>
              <option>Entertainment</option>
              <option>Athletics</option>
              <option>Technology</option>
              <option>Managed Services</option>
              <option>Logistics</option>
              <option>Life Sciences</option>
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select className="mt-1 block w-full rounded-md border border-gray-200 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm text-gray-500">
              <option>All Categories</option>
              <option>Residential</option>
              <option>Commercial</option>
              <option>Development</option>
              <option>M&A</option>
              <option>Private Equity</option>
              <option>Venture Capital</option>
              <option>Collective Bargaining</option>
              <option>Sports Contract</option>
              <option>Wills & Trusts</option>
              <option>NDAs</option>
              <option>Vendor Agreement</option>
              <option>Service Agreement</option>
              <option>Standard Agreement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Template Library View */}
      <div className="rounded-lg bg-white p-6" style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Industry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{template.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{template.category}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{template.industry}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{template.usage_count.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{template.last_updated}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusChip status={template.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedTemplate(template)}
                        className="text-primary-600 hover:text-primary-900 transition-colors"
                        title="Edit"
                      >
                        <IconEdit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          // TODO: Implement delete functionality
                          alert('Mock: Delete template action')
                        }}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Delete"
                      >
                        <IconTemplateOff className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Template Detail Drawer */}
      {selectedTemplate && (
        <Drawer
          isOpen={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          title={selectedTemplate.name}
          size="lg"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Industry</dt>
                <dd className="mt-1 text-sm text-gray-900">{selectedTemplate.industry}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-sm text-gray-900">{selectedTemplate.category}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Usage Count</dt>
                <dd className="mt-1 text-sm text-gray-900">{selectedTemplate.usage_count.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <StatusChip status={selectedTemplate.status} />
                </dd>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Sample Clauses</h3>
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">
                  Template sample clauses will be displayed here.
                </p>
              </div>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  )
}
