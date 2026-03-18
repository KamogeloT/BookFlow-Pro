import { type PropsWithChildren } from 'react'
import { useMyRole } from '../hooks/useMyRole'

export function RoleGuard({
  allowedRoles,
  children,
}: PropsWithChildren<{
  allowedRoles: string[]
}>) {
  const { role, loading, error } = useMyRole()

  if (loading)
    return (
      <div className="p-6 rounded-2xl border border-gray-200/70 dark:border-gray-800/70 bg-white/70 dark:bg-[#1c1c1e]/55 backdrop-blur shadow-sm text-sm text-gray-500">
        Loading role…
      </div>
    )
  if (error)
    return (
      <div className="p-6 rounded-2xl border border-red-200 bg-red-50 text-red-700 shadow-sm text-sm">
        {error}
      </div>
    )
  if (!role)
    return (
      <div className="p-6 rounded-2xl border border-gray-200/70 dark:border-gray-800/70 bg-white/70 dark:bg-[#1c1c1e]/55 backdrop-blur shadow-sm text-sm text-gray-500">
        Not authorized.
      </div>
    )
  if (!allowedRoles.includes(role))
    return (
      <div className="p-6 rounded-2xl border border-gray-200/70 dark:border-gray-800/70 bg-white/70 dark:bg-[#1c1c1e]/55 backdrop-blur shadow-sm text-sm text-gray-500">
        Not authorized for this area.
      </div>
    )

  return <>{children}</>
}

