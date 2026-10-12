'use client'

import clsx from 'clsx'

interface StatusChipProps {
  status: string
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md'
}

const statusColors: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-800' },
  healthy: { bg: 'bg-green-100', text: 'text-green-800' },
  running: { bg: 'bg-green-100', text: 'text-green-800' },
  approved: { bg: 'bg-green-100', text: 'text-green-800' },
  completed: { bg: 'bg-green-100', text: 'text-green-800' },
  complete: { bg: 'bg-green-100', text: 'text-green-800' },
  online: { bg: 'bg-green-100', text: 'text-green-800' },
  executed: { bg: 'bg-green-100', text: 'text-green-800' },
  
  suspended: { bg: 'bg-red-100', text: 'text-red-800' },
  error: { bg: 'bg-red-100', text: 'text-red-800' },
  declined: { bg: 'bg-red-100', text: 'text-red-800' },
  failed: { bg: 'bg-red-100', text: 'text-red-800' },
  revoked: { bg: 'bg-red-100', text: 'text-red-800' },
  offline: { bg: 'bg-red-100', text: 'text-red-800' },
  canceled: { bg: 'bg-red-100', text: 'text-red-800' },
  expired: { bg: 'bg-red-100', text: 'text-red-800' },
  voided: { bg: 'bg-red-100', text: 'text-red-800' },
  deleted: { bg: 'bg-red-100', text: 'text-red-800' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800' },
  
  onboarding: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  action_required: { bg: 'bg-red-100', text: 'text-red-800' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  
  idle: { bg: 'bg-gray-100', text: 'text-gray-800' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-800' },
  paused: { bg: 'bg-gray-100', text: 'text-gray-800' },
  offboarding: { bg: 'bg-gray-100', text: 'text-gray-800' },
  
  info: { bg: 'bg-blue-100', text: 'text-blue-800' },
  backfilling: { bg: 'bg-blue-100', text: 'text-blue-800' },
  
  // Contract Statuses
  initiation: { bg: 'bg-gray-100', text: 'text-gray-800' },
  preparation: { bg: 'bg-blue-100', text: 'text-blue-800' },
  signatures: { bg: 'bg-amber-100', text: 'text-amber-800' },
  funding: { bg: 'bg-purple-100', text: 'text-purple-800' },
  settled: { bg: 'bg-teal-100', text: 'text-teal-800' },
  completed: { bg: 'bg-green-100', text: 'text-green-800' },
  voided: { bg: 'bg-red-100', text: 'text-red-800' },
  deleted: { bg: 'bg-red-100', text: 'text-red-800' },
  
  // Document Statuses
  draft: { bg: 'bg-gray-100', text: 'text-gray-800' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-800' },
  signing: { bg: 'bg-amber-100', text: 'text-amber-800' },
  executed: { bg: 'bg-green-100', text: 'text-green-800' },
  withdrawn: { bg: 'bg-purple-100', text: 'text-purple-800' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800' },
}

export function StatusChip({ status, variant, size = 'md' }: StatusChipProps) {
  const normalizedStatus = status.toLowerCase()
  const colors = statusColors[normalizedStatus] || { bg: 'bg-gray-100', text: 'text-gray-800' }
  
  // Special handling for status display names
  let displayStatus: string
  if (normalizedStatus === 'onboarding') {
    displayStatus = 'Onboarding'
  } else if (normalizedStatus === 'declined') {
    displayStatus = 'Failed'
  } else if (normalizedStatus === 'approved') {
    displayStatus = 'Verified'
  } else if (normalizedStatus === 'action_required') {
    displayStatus = 'Action Required'
  } else {
    // Capitalize the status text (first letter of each word)
    // Note: "completed" and "complete" are displayed as-is for contracts/documents
    // Only "approved" gets converted to "Verified" for verification statuses
    displayStatus = status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }
  
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        colors.bg,
        colors.text,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm'
      )}
    >
      {displayStatus}
    </span>
  )
}

