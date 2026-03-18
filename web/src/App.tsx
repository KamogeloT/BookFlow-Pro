import { Route, Routes, BrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { CustomerBookingPage } from './pages/CustomerBookingPage'
import { CalendarExperiencePage } from './pages/CalendarExperiencePage'
import { AdminResourcesPage } from './pages/AdminResourcesPage'
import { ProLayout } from './layouts/ProLayout'
import './App.css'

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">{title}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Placeholder page. Business rules will be implemented later.
      </p>
    </div>
  )
}

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
          <Route path="allocation" element={<ComingSoon title="Allocation Engine" />} />
          <Route path="notifications" element={<ComingSoon title="Notifications" />} />
          <Route path="reports" element={<ComingSoon title="Reports" />} />

          {/* Dashboards (left sidebar) */}
          <Route path="dashboards/admin" element={<ComingSoon title="Admin Dashboard" />} />
          <Route path="dashboards/ops" element={<ComingSoon title="Operations Dashboard" />} />
          <Route path="dashboards/staff" element={<ComingSoon title="Staff Dashboard" />} />
          <Route
            path="dashboards/customer"
            element={<ComingSoon title="Customer Dashboard" />}
          />

          {/* Settings (left sidebar) */}
          <Route path="settings/branding" element={<ComingSoon title="Branding & Themes" />} />
          <Route path="settings/tenants" element={<ComingSoon title="Tenants" />} />
          <Route path="settings/roles" element={<ComingSoon title="Roles & Permissions" />} />
          <Route path="settings/services" element={<ComingSoon title="Services & Sub-services" />} />
          <Route path="settings/resources" element={<ComingSoon title="Resource Management" />} />
          <Route
            path="settings/allocation-rules"
            element={<ComingSoon title="Allocation Rules" />}
          />
          <Route
            path="settings/notifications"
            element={<ComingSoon title="Notification Templates" />}
          />
          <Route path="settings/webhooks" element={<ComingSoon title="Webhooks" />} />
          <Route path="settings/app-settings" element={<ComingSoon title="App Settings" />} />
          <Route path="settings/audit-logs" element={<ComingSoon title="Audit Logs" />} />

          {/* Extras (left sidebar) */}
          <Route path="extras/waitlist" element={<ComingSoon title="Waitlists" />} />
          <Route path="extras/qr-checkin" element={<ComingSoon title="QR Check-in" />} />
          <Route path="extras/promotions" element={<ComingSoon title="Promotions" />} />
          <Route path="extras/feedback" element={<ComingSoon title="Feedback" />} />
          <Route
            path="extras/api-integrations"
            element={<ComingSoon title="API Integrations" />}
          />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
