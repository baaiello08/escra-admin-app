'use client'

import React from 'react'
import clsx from 'clsx'

export interface Column<T> {
  key: string
  header: string | React.ReactNode
  render?: (item: T) => React.ReactNode
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: string | number
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  onRowClick?: (item: T) => void
  emptyMessage?: string
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  onRowClick,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">{emptyMessage}</div>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={clsx(
                  'px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
                  column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left',
                  column.sortable && 'cursor-pointer hover:bg-gray-100'
                )}
                style={column.width ? { width: typeof column.width === 'number' ? `${column.width}px` : column.width } : undefined}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={clsx(
                onRowClick && 'cursor-pointer hover:bg-gray-50 transition-colors'
              )}
            >
              {columns.map((column) => (
                <td 
                  key={column.key} 
                  className={clsx(
                    'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                    column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'
                  )}
                  style={column.width ? { width: typeof column.width === 'number' ? `${column.width}px` : column.width } : undefined}
                >
                  {column.render ? column.render(item) : (item as any)[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

