import { Routes, Route, Navigate } from 'react-router-dom'
import { EmailAuthGuard } from './guards/EmailAuthGuard'
import EmailLogin from './features/auth/EmailLogin'
import EmailLayout from './layouts/EmailLayout'
import InboxView from './features/inbox/InboxView'
import SentView from './features/sent/SentView'
import DraftsView from './features/drafts/DraftsView'
import ComposeView from './features/compose/ComposeView'
import SettingsView from './features/settings/SettingsView'
import { useAuthStore } from './store/authStore'

function App() {
  const { user, loading, emailAliasId } = useAuthStore()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <Routes>
      {/* Public login route */}
      <Route
        path="/login"
        element={
          user && emailAliasId ? (
            <Navigate to="/inbox" replace />
          ) : (
            <EmailLogin />
          )
        }
      />

      {/* Protected email routes */}
      <Route
        path="/"
        element={
          <EmailAuthGuard>
            <EmailLayout />
          </EmailAuthGuard>
        }
      >
        <Route index element={<Navigate to="/inbox" replace />} />
        <Route path="inbox" element={<InboxView />} />
        <Route path="sent" element={<SentView />} />
        <Route path="drafts" element={<DraftsView />} />
        <Route path="compose" element={<ComposeView />} />
        <Route path="settings" element={<SettingsView />} />
      </Route>

      {/* Catch all - redirect based on auth */}
      <Route
        path="*"
        element={
          user && emailAliasId ? (
            <Navigate to="/inbox" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  )
}

export default App
