'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

/**
 * Admin Scope Context
 * 
 * Manages global super-admin vs tenant-admin scope.
 * Aligns with escra-frontend-implementation-plan.md section 2.
 */

export type AdminScope = 'global' | 'tenant'

interface AdminScopeContextValue {
  scope: AdminScope
  selectedTenantId: string | null
  setScope: (scope: AdminScope) => void
  setSelectedTenant: (tenantId: string | null) => void
  isGlobalAdmin: boolean
  isTenantAdmin: boolean
}

const AdminScopeContext = createContext<AdminScopeContextValue | undefined>(undefined)

export function AdminScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScope] = useState<AdminScope>('global')
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null)

  const value: AdminScopeContextValue = {
    scope,
    selectedTenantId,
    setScope,
    setSelectedTenant: setSelectedTenantId,
    isGlobalAdmin: scope === 'global',
    isTenantAdmin: scope === 'tenant',
  }

  return (
    <AdminScopeContext.Provider value={value}>
      {children}
    </AdminScopeContext.Provider>
  )
}

export function useAdminScope() {
  const context = useContext(AdminScopeContext)
  if (!context) {
    throw new Error('useAdminScope must be used within AdminScopeProvider')
  }
  return context
}

