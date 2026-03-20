import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import {
  IconArrowsSwap,
  IconBell,
  IconBolt,
  IconBuilding,
  IconChart,
  IconChat,
  IconClock,
  IconCode,
  IconCog,
  IconCube,
  IconDashboards,
  IconDocumentSearch,
  IconPaint,
  IconQr,
  IconShield,
  IconSliders,
  IconTag,
  IconUser,
  IconUsers,
} from '../components/SidebarNavIcons'

type SidebarNavItem = { to: string; label: string; icon: ReactNode }
type HeaderNavItem = { to: string; label: string }

function SidebarSectionTitle({ children, collapsed }: { children: ReactNode; collapsed: boolean }) {
  if (collapsed) {
    return (
      <div
        className="mx-2 my-2 border-t border-purple-200/60 dark:border-purple-800/50 pt-2 first:mt-0 first:border-t-0 first:pt-0"
        role="presentation"
      >
        <span className="sr-only">{children}</span>
      </div>
    )
  }
  return (
    <div className="mx-2 mt-4 first:mt-2 mb-1">
      <div
        className={[
          'rounded-r-lg border-l-[3px] border-purple-600 dark:border-purple-400',
          'bg-gradient-to-r from-purple-100/95 via-purple-50/80 to-transparent',
          'dark:from-purple-950/70 dark:via-purple-950/35 dark:to-transparent',
          'px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
        ].join(' ')}
      >
        <div className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-purple-900 dark:text-purple-100">
          {children}
        </div>
      </div>
    </div>
  )
}

function SidebarNavLink({ to, label, icon, pinned }: { to: string; label: string; icon: ReactNode; pinned: boolean }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center rounded-lg py-2 text-sm transition-colors',
          pinned ? 'gap-3 px-3' : 'justify-center px-2',
          'hover:bg-black/5 dark:hover:bg-white/5',
          isActive
            ? 'bg-purple-100/80 dark:bg-purple-950/50 ring-1 ring-purple-300/70 dark:ring-purple-700/50 [&_svg]:text-purple-700 dark:[&_svg]:text-purple-300'
            : '',
        ].join(' ')
      }
      title={label}
      aria-label={label}
    >
      {icon}
      {pinned ? <span className="min-w-0 truncate text-gray-700 dark:text-gray-200">{label}</span> : null}
    </NavLink>
  )
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

  const mainNav = useMemo<HeaderNavItem[]>(
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

  const dashboardNav = useMemo<SidebarNavItem[]>(
    () => [
      { to: '/dashboards/admin', label: 'Admin Dashboard', icon: <IconDashboards /> },
      { to: '/dashboards/ops', label: 'Operations Dashboard', icon: <IconChart /> },
      { to: '/dashboards/staff', label: 'Staff Dashboard', icon: <IconUsers /> },
      { to: '/dashboards/customer', label: 'Customer Dashboard', icon: <IconUser /> },
    ],
    []
  )

  const settingsNav = useMemo<SidebarNavItem[]>(
    () => [
      { to: '/settings/branding', label: 'Branding & Themes', icon: <IconPaint /> },
      { to: '/settings/tenants', label: 'Tenants', icon: <IconBuilding /> },
      { to: '/settings/roles', label: 'Roles & Permissions', icon: <IconShield /> },
      { to: '/settings/services', label: 'Services & Sub-services', icon: <IconCog /> },
      { to: '/settings/resources', label: 'Resource Management', icon: <IconCube /> },
      { to: '/settings/allocation-rules', label: 'Allocation Rules', icon: <IconArrowsSwap /> },
      { to: '/settings/notifications', label: 'Notification Templates', icon: <IconBell /> },
      { to: '/settings/webhooks', label: 'Webhooks', icon: <IconBolt /> },
      { to: '/settings/app-settings', label: 'App Settings', icon: <IconSliders /> },
      { to: '/settings/audit-logs', label: 'Audit Logs', icon: <IconDocumentSearch /> },
    ],
    []
  )

  const extrasNav = useMemo<SidebarNavItem[]>(
    () => [
      { to: '/extras/waitlist', label: 'Waitlists', icon: <IconClock /> },
      { to: '/extras/qr-checkin', label: 'QR Check-in', icon: <IconQr /> },
      { to: '/extras/promotions', label: 'Promotions', icon: <IconTag /> },
      { to: '/extras/feedback', label: 'Feedback', icon: <IconChat /> },
      { to: '/extras/api-integrations', label: 'API Integrations', icon: <IconCode /> },
    ],
    []
  )

  const collapsed = !pinned

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
            'border-l border-r border-gray-200/70 dark:border-gray-800/70 backdrop-blur bg-white/45 dark:bg-[#1c1c1e]/35',
            'shadow-[8px_0_24px_rgba(0,0,0,0.10)] dark:shadow-[8px_0_26px_rgba(0,0,0,0.45)]',
            'transition-[width] duration-200 ease-out',
            pinned ? 'w-72' : 'w-16',
          ].join(' ')}
        >
          <div className="h-full flex flex-col">
            <div
              className={[
                'px-3 py-3 flex items-center gap-2',
                pinned ? 'justify-between' : 'justify-center',
              ].join(' ')}
            >
              {pinned ? (
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200">Menu</div>
              ) : null}
              <button
                type="button"
                onClick={() => setPinned((p) => !p)}
                className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-2 py-1 text-xs text-gray-700 dark:text-gray-200 hover:opacity-90 shrink-0"
                aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
                title={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                {pinned ? 'Unpin' : 'Pin'}
              </button>
            </div>

            <div className="flex-1 overflow-auto pb-6">
              <SidebarSectionTitle collapsed={collapsed}>Dashboards</SidebarSectionTitle>
              <nav className="px-1 space-y-1">
                {dashboardNav.map((item) => (
                  <SidebarNavLink key={item.to} to={item.to} label={item.label} icon={item.icon} pinned={pinned} />
                ))}
              </nav>

              <SidebarSectionTitle collapsed={collapsed}>Settings</SidebarSectionTitle>
              <nav className="px-1 space-y-1">
                {settingsNav.map((item) => (
                  <SidebarNavLink key={item.to} to={item.to} label={item.label} icon={item.icon} pinned={pinned} />
                ))}
              </nav>

              <SidebarSectionTitle collapsed={collapsed}>Extras</SidebarSectionTitle>
              <nav className="px-1 space-y-1">
                {extrasNav.map((item) => (
                  <SidebarNavLink key={item.to} to={item.to} label={item.label} icon={item.icon} pinned={pinned} />
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
