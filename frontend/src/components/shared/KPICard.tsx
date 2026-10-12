'use client'

import clsx from 'clsx'

interface KPICardProps {
  title: string
  value: string | number
  trend?: {
    value: number
    isPositive: boolean
  }
  subtitle?: string
  className?: string
}

export function KPICard({ title, value, trend, subtitle, className }: KPICardProps) {
  return (
    <div 
      className={clsx('rounded-lg bg-white p-6', className)}
      style={{ boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
    >
      <div className="text-sm font-medium text-gray-500">{title}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        {trend && (
          <div
            className={clsx(
              'text-sm font-medium',
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            )}
          >
            {trend.isPositive ? '+' : ''}
            {trend.value}%
          </div>
        )}
      </div>
      {subtitle && <div className="mt-1 text-xs text-gray-500">{subtitle}</div>}
    </div>
  )
}

