import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'

type NavItem = { to: string; label: string }

function SidebarSectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">{children}</div>
}

export function ProLayout() {
  const [pinned, setPinned] = useState(() => {
    try {
      const v = localStorage.getItem('bf_sidebar_pinned')
      if (v === '0') return false
      if (v === '1') return true
    } catch {
      // ignore
    }
    return true
  })

  useEffect(() => {
    try {
      localStorage.setItem('bf_sidebar_pinned', pinned ? '1' : '0')
    } catch {
      // ignore
    }
  }, [pinned])

  const mainNav = useMemo<NavItem[]>(
    () => [
      { to: '/bookings', label: 'Bookings' },
      { to: '/calendar', label: 'Calendar' },
      { to: '/resources', label: 'Resources' },
      { to: '/allocation', label: 'Allocation' },
      { to: '/notifications', label: 'Notifications' },
      { to: '/reports', label: 'Reports' },
    ],
    []
  )

  const dashboardNav = useMemo<NavItem[]>(
    () => [
      { to: '/dashboards/admin', label: 'Admin Dashboard' },
      { to: '/dashboards/ops', label: 'Operations Dashboard' },
      { to: '/dashboards/staff', label: 'Staff Dashboard' },
      { to: '/dashboards/customer', label: 'Customer Dashboard' },
    ],
    []
  )

  const settingsNav = useMemo<NavItem[]>(
    () => [
      { to: '/settings/branding', label: 'Branding & Themes' },
      { to: '/settings/tenants', label: 'Tenants' },
      { to: '/settings/roles', label: 'Roles & Permissions' },
      { to: '/settings/services', label: 'Services & Sub-services' },
      { to: '/settings/resources', label: 'Resource Management' },
      { to: '/settings/allocation-rules', label: 'Allocation Rules' },
      { to: '/settings/notifications', label: 'Notification Templates' },
      { to: '/settings/webhooks', label: 'Webhooks' },
      { to: '/settings/app-settings', label: 'App Settings' },
      { to: '/settings/audit-logs', label: 'Audit Logs' },
    ],
    []
  )

  const extrasNav = useMemo<NavItem[]>(
    () => [
      { to: '/extras/waitlist', label: 'Waitlists' },
      { to: '/extras/qr-checkin', label: 'QR Check-in' },
      { to: '/extras/promotions', label: 'Promotions' },
      { to: '/extras/feedback', label: 'Feedback' },
      { to: '/extras/api-integrations', label: 'API Integrations' },
    ],
    []
  )

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-200/70 dark:border-gray-800/70 bg-white/70 dark:bg-[#1c1c1e]/40 backdrop-blur">
        <div className="w-full px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <NavLink to="/" aria-label="Home">
              <BrandLogo
                alt="BookFlow"
                className="h-20 max-h-20 w-auto max-w-none object-contain"
              />
            </NavLink>
          </div>

          <nav className="flex-1 flex justify-center gap-4 text-sm">
            {mainNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => (isActive ? 'underline' : '')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <div className="flex-1 flex gap-0">
        <aside
          className={[
            'border-l border-r border-gray-200/70 dark:border-gray-800/70 backdrop-blur',
            'transition-[width] duration-200 ease-out',
            pinned ? 'w-72' : 'w-16',
          ].join(' ')}
        >
          <div className="h-full flex flex-col">
            <div className="px-3 py-3 flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                {pinned ? 'Menu' : ''}
              </div>
              <button
                type="button"
                onClick={() => setPinned((p) => !p)}
                className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-2 py-1 text-xs text-gray-700 dark:text-gray-200 hover:opacity-90"
                aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                {pinned ? 'Unpin' : 'Pin'}
              </button>
            </div>

            <div className="flex-1 overflow-auto pb-6">
              <SidebarSectionTitle>Dashboards</SidebarSectionTitle>
              <nav className="px-1 space-y-1">
                {dashboardNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                        'hover:bg-black/5 dark:hover:bg-white/5',
                        isActive ? 'bg-black/5 dark:bg-white/5' : '',
                      ].join(' ')
                    }
                    title={pinned ? undefined : item.label}
                  >
                    {pinned ? <span className="text-gray-700 dark:text-gray-200">{item.label}</span> : null}
                  </NavLink>
                ))}
              </nav>

              <SidebarSectionTitle>Settings</SidebarSectionTitle>
              <nav className="px-1 space-y-1">
                {settingsNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                        'hover:bg-black/5 dark:hover:bg-white/5',
                        isActive ? 'bg-black/5 dark:bg-white/5' : '',
                      ].join(' ')
                    }
                    title={pinned ? undefined : item.label}
                  >
                    {pinned ? <span className="text-gray-700 dark:text-gray-200">{item.label}</span> : null}
                  </NavLink>
                ))}
              </nav>

              <SidebarSectionTitle>Extras</SidebarSectionTitle>
              <nav className="px-1 space-y-1">
                {extrasNav.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
                        'hover:bg-black/5 dark:hover:bg-white/5',
                        isActive ? 'bg-black/5 dark:bg-white/5' : '',
                      ].join(' ')
                    }
                    title={pinned ? undefined : item.label}
                  >
                    {pinned ? <span className="text-gray-700 dark:text-gray-200">{item.label}</span> : null}
                  </NavLink>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        <main className="flex-1 pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

