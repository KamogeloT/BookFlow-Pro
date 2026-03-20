import { RoleGuard } from '../components/RoleGuard'
import { DashboardContent } from './DashboardContent'

export function AdminDashboardPage() {
  return (
    <RoleGuard allowedRoles={['Tenant Admin', 'Branch Admin']}>
      <DashboardContent
        title="Admin Dashboard"
        description="Tenant-wide operational counts and stored snapshots."
        snapshotCode="admin"
        extraLinks={[
          { to: '/settings/tenants', label: 'Organisation' },
          { to: '/settings/roles', label: 'Roles' },
          { to: '/reports', label: 'Reports' },
        ]}
      />
    </RoleGuard>
  )
}
