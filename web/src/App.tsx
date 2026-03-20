import { Route, Routes, BrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { CustomerBookingPage } from './pages/CustomerBookingPage'
import { CalendarExperiencePage } from './pages/CalendarExperiencePage'
import { AdminResourcesPage } from './pages/AdminResourcesPage'
import { ProLayout } from './layouts/ProLayout'
import { AllocationPage } from './pages/AllocationPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ReportsPage } from './pages/ReportsPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { OpsDashboardPage } from './pages/OpsDashboardPage'
import { StaffDashboardPage } from './pages/StaffDashboardPage'
import { CustomerDashboardPage } from './pages/CustomerDashboardPage'
import { BrandingSettingsPage } from './pages/BrandingSettingsPage'
import { TenantsSettingsPage } from './pages/TenantsSettingsPage'
import { RolesSettingsPage } from './pages/RolesSettingsPage'
import { ServicesSettingsPage } from './pages/ServicesSettingsPage'
import { ResourceManagementSettingsPage } from './pages/ResourceManagementSettingsPage'
import { AllocationRulesSettingsPage } from './pages/AllocationRulesSettingsPage'
import { NotificationTemplatesSettingsPage } from './pages/NotificationTemplatesSettingsPage'
import { WebhooksSettingsPage } from './pages/WebhooksSettingsPage'
import { AppSettingsPage } from './pages/AppSettingsPage'
import { AuditLogsSettingsPage } from './pages/AuditLogsSettingsPage'
import { WaitlistsPage } from './pages/WaitlistsPage'
import { QrCheckinPage } from './pages/QrCheckinPage'
import { PromotionsPage } from './pages/PromotionsPage'
import { FeedbackPage } from './pages/FeedbackPage'
import { ApiIntegrationsPage } from './pages/ApiIntegrationsPage'
import './App.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ProLayout />
            </ProtectedRoute>
          }
        >
          {/* Redirect old routes */}
          <Route path="book" element={<Navigate to="/bookings" replace />} />
          <Route path="admin/resources" element={<Navigate to="/resources" replace />} />

          <Route index element={<Navigate to="/bookings" replace />} />

          {/* Main features (top nav) */}
          <Route path="bookings" element={<CustomerBookingPage />} />
          <Route path="calendar" element={<CalendarExperiencePage />} />
          <Route path="resources" element={<AdminResourcesPage />} />
          <Route path="allocation" element={<AllocationPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="reports" element={<ReportsPage />} />

          {/* Dashboards (left sidebar) */}
          <Route path="dashboards/admin" element={<AdminDashboardPage />} />
          <Route path="dashboards/ops" element={<OpsDashboardPage />} />
          <Route path="dashboards/staff" element={<StaffDashboardPage />} />
          <Route path="dashboards/customer" element={<CustomerDashboardPage />} />

          {/* Settings (left sidebar) */}
          <Route path="settings/branding" element={<BrandingSettingsPage />} />
          <Route path="settings/tenants" element={<TenantsSettingsPage />} />
          <Route path="settings/roles" element={<RolesSettingsPage />} />
          <Route path="settings/services" element={<ServicesSettingsPage />} />
          <Route path="settings/resources" element={<ResourceManagementSettingsPage />} />
          <Route path="settings/allocation-rules" element={<AllocationRulesSettingsPage />} />
          <Route
            path="settings/notifications"
            element={<NotificationTemplatesSettingsPage />}
          />
          <Route path="settings/webhooks" element={<WebhooksSettingsPage />} />
          <Route path="settings/app-settings" element={<AppSettingsPage />} />
          <Route path="settings/audit-logs" element={<AuditLogsSettingsPage />} />

          {/* Extras (left sidebar) */}
          <Route path="extras/waitlist" element={<WaitlistsPage />} />
          <Route path="extras/qr-checkin" element={<QrCheckinPage />} />
          <Route path="extras/promotions" element={<PromotionsPage />} />
          <Route path="extras/feedback" element={<FeedbackPage />} />
          <Route path="extras/api-integrations" element={<ApiIntegrationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
