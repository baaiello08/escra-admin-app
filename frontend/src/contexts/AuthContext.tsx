'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { UserClaims } from '@/lib/rbac'
import apiClient from '@/lib/api-client'
import { isAuthenticated as checkAuth, getAccessToken } from '@/lib/auth-token'

/**
 * Auth Context
 * 
 * Manages current user authentication state and claims.
 * Connects to backend auth endpoints.
 */

interface AuthContextValue {
  user: UserClaims | null
  isAuthenticated: boolean
  login: (email: string, password: string, tenantId?: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Mock user for development fallback
const MOCK_USER: UserClaims = {
  user_id: 'mock-user-1',
  tenant_id: undefined, // Global admin
  roles: [],
  system_roles: ['super_admin'], // Super admin has all permissions
  permissions: [], // Super admin bypasses permission checks
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserClaims | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  // Check for existing auth on mount
  useEffect(() => {
    const initAuth = async () => {
      if (checkAuth()) {
        try {
          const userData = await apiClient.getCurrentUser()
          setUser({
            user_id: userData.user_id,
            tenant_id: userData.tenant_id || undefined,
            roles: [],
            system_roles: userData.roles.filter((r: string) => ['super_admin', 'support', 'compliance', 'ops'].includes(r)),
            permissions: userData.permissions,
          })
          setIsAuthenticated(true)
        } catch (error) {
          console.error('Failed to restore session:', error)
          // Clear invalid tokens
          const { clearTokens } = await import('@/lib/auth-token')
          clearTokens()
        }
      }
      setLoading(false)
    }
    initAuth()
  }, [])

  const login = async (email: string, password: string, tenantId?: string) => {
    try {
      const response = await apiClient.login(email, password, tenantId)
      setUser({
        user_id: response.user_id,
        tenant_id: response.tenant_id || undefined,
        roles: response.roles.filter((r: string) => !['super_admin', 'support', 'compliance', 'ops'].includes(r)),
        system_roles: response.roles.filter((r: string) => ['super_admin', 'support', 'compliance', 'ops'].includes(r)),
        permissions: response.permissions,
      })
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  const refreshUser = async () => {
    if (!checkAuth()) {
      setUser(null)
      setIsAuthenticated(false)
      return
    }

    try {
      const userData = await apiClient.getCurrentUser()
      setUser({
        user_id: userData.user_id,
        tenant_id: userData.tenant_id || undefined,
        roles: [],
        system_roles: userData.roles.filter((r: string) => ['super_admin', 'support', 'compliance', 'ops'].includes(r)),
        permissions: userData.permissions,
      })
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      // Clear invalid tokens
      const { clearTokens } = await import('@/lib/auth-token')
      clearTokens()
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

