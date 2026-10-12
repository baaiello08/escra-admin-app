'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { useAuth } from '@/contexts/AuthContext'
import {
  IconChartPie,
  IconBuilding,
  IconUsersGroup,
  IconId,
  IconKey,
  IconDatabaseSearch,
  IconTemplate,
  IconCreditCard,
  IconShieldLock,
  IconHeartCode,
  IconSos,
  IconUserShield,
  IconLogout2,
} from '@tabler/icons-react'
import { TbSnowboarding, TbCoins } from 'react-icons/tb'

/**
 * Navigation items aligned with escra-frontend-enhancement-plan.md
 * Order: Dashboard, Tenants, Users, Identity, Keys & Vault, Indexer,
 * Contracts & Automations, Billing & Usage, Security & Risk, System Health, Support, Roles & Permissions (disabled)
 */
const navigation = [
  { name: 'Dashboard', href: '/admin', icon: IconChartPie },
  { name: 'Tenants', href: '/admin/tenants', icon: IconBuilding, permission: 'tenants:read' },
  { name: 'Users', href: '/admin/users', icon: IconUsersGroup, permission: 'users:read' },
  { name: 'Onboarding', href: '/admin/onboarding', icon: TbSnowboarding, permission: 'users:read' },
  { name: 'Identity', href: '/admin/identity', icon: IconId, permission: 'persona:read_inquiry' },
  { name: 'Keys & Vault', href: '/admin/keys', icon: IconKey, permission: 'keys:read' },
  { name: 'Indexer', href: '/admin/indexer', icon: IconDatabaseSearch, permission: 'indexer:read' },
  { name: 'Templates', href: '/admin/templates', icon: IconTemplate, permission: 'contracts:read' },
  { name: 'Billing & Usage', href: '/admin/billing', icon: IconCreditCard, permission: 'billing:read' },
  { name: 'Treasury', href: '/admin/treasury', icon: TbCoins, permission: 'treasury:read' },
  { name: 'Security & Risk', href: '/admin/security', icon: IconShieldLock, permission: 'security:read' },
  { name: 'System Health', href: '/admin/health', icon: IconHeartCode, permission: 'ops:read' },
  { name: 'Support', href: '/admin/support', icon: IconSos, permission: 'support:read' },
  { name: 'Roles & Permissions', href: '/admin/roles', icon: IconUserShield, permission: 'roles:read', disabled: true },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Escra Admin</h1>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          const isDisabled = (item as any).disabled === true

          const IconComponent = item.icon

          if (isDisabled) {
            return (
              <div
                key={item.name}
                className={clsx(
                  'flex items-center px-4 py-2 text-sm font-medium rounded-md',
                  'text-gray-400 cursor-not-allowed opacity-50'
                )}
                title="Coming soon"
              >
                <IconComponent className="mr-3 h-5 w-5" />
                {item.name}
                <span className="ml-auto text-xs">Soon</span>
              </div>
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-900 hover:bg-gray-50'
              )}
            >
              <IconComponent className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-gray-200 space-y-2">
        <button
          onClick={logout}
          className="flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <IconLogout2 className="mr-2 h-4 w-4" />
          Logout
        </button>
        <div className="text-xs text-gray-500 text-center">
          Version 0.1.0
        </div>
      </div>
    </div>
  )
}

