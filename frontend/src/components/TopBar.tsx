'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useAdminScope } from '@/contexts/AdminScopeContext'

export function TopBar() {
  const { user, logout } = useAuth()
  const { scope, selectedTenantId } = useAdminScope()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development'

  const userInitials = user?.email
    ? `${user.email.charAt(0).toUpperCase()}${user.email.split('@')[0].charAt(1).toUpperCase()}`
    : 'U'

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-gray-700">
            Environment: <span className="text-primary-600">{environment}</span>
          </div>
          <div className="text-sm text-gray-500">
            Scope: <span className="font-medium text-gray-900">{scope === 'global' ? 'Global Admin' : 'Tenant Admin'}</span>
          </div>
          {selectedTenantId && (
            <div className="text-sm text-gray-500">
              Tenant: <span className="font-medium text-gray-900">{selectedTenantId}</span>
            </div>
          )}
        </div>
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
          >
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {user?.email || 'Not authenticated'}
              </div>
              <div className="text-xs text-gray-500">Administrator</div>
            </div>
            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center border-2 border-primary-200">
              <span className="text-primary-700 text-sm font-semibold">
                {userInitials}
              </span>
            </div>
            <svg
              className={`h-5 w-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
              <div className="py-1">
                <div className="px-4 py-2 border-b border-gray-200">
                  <div className="text-sm font-medium text-gray-900">{user?.email}</div>
                  <div className="text-xs text-gray-500">Super Administrator</div>
                </div>
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Profile Settings
                </button>
                <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Preferences
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  onClick={() => {
                    logout()
                    setIsDropdownOpen(false)
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

