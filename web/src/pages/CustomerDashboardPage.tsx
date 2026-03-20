import { RoleGuard } from '../components/RoleGuard'
import { DashboardContent } from './DashboardContent'

export function CustomerDashboardPage() {
  return (
    <RoleGuard allowedRoles={['Customer', 'Tenant Admin', 'Branch Admin']}>
      <DashboardContent
        title="Customer Dashboard"
        description="Summary for end customers. (Admins can preview this view.)"
        snapshotCode="customer"
        extraLinks={[{ to: '/bookings', label: 'Bookings' }]}
      />
    </RoleGuard>
  )
}
