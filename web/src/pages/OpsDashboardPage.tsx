import { RoleGuard } from '../components/RoleGuard'
import { DashboardContent } from './DashboardContent'

export function OpsDashboardPage() {
  return (
    <RoleGuard allowedRoles={['Tenant Admin', 'Branch Admin', 'Dispatcher']}>
      <DashboardContent
        title="Operations Dashboard"
        description="Day-to-day queue and waitlist pressure."
        snapshotCode="ops"
        extraLinks={[
          { to: '/bookings', label: 'Bookings' },
          { to: '/allocation', label: 'Allocation' },
          { to: '/notifications', label: 'Notifications' },
          { to: '/extras/waitlist', label: 'Waitlists' },
        ]}
      />
    </RoleGuard>
  )
}
