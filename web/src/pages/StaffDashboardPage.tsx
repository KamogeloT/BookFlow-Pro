import { RoleGuard } from '../components/RoleGuard'
import { DashboardContent } from './DashboardContent'

export function StaffDashboardPage() {
  return (
    <RoleGuard allowedRoles={['Tenant Admin', 'Branch Admin', 'Dispatcher', 'Staff']}>
      <DashboardContent
        title="Staff Dashboard"
        description="Quick view of workload indicators."
        snapshotCode="staff"
        extraLinks={[
          { to: '/calendar', label: 'Calendar' },
          { to: '/resources', label: 'Resources' },
          { to: '/extras/qr-checkin', label: 'QR Check-in' },
        ]}
      />
    </RoleGuard>
  )
}
