import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { EmailAuthGuard } from './guards/EmailAuthGuard'
import EmailLogin from './features/auth/EmailLogin'
import EmailLayout from './layouts/EmailLayout'
import InboxView from './features/inbox/InboxView'
import StarredView from './features/starred/StarredView'
import ThreadDetailView from './features/inbox/ThreadDetailView'
import SentView from './features/sent/SentView'
import DraftsView from './features/drafts/DraftsView'
import ComposeView from './features/compose/ComposeView'
import SettingsView from './features/settings/SettingsView'
import GlobalSearchView from './features/search/GlobalSearchView'
import { useAuthStore } from './store/authStore'
import { useTemplateStore } from './features/settings/useTemplateStore'

function App() {
  const { user, loading, emailAliasId, initialize } = useAuthStore()
  const { fetchTemplates } = useTemplateStore()

  // Initialize auth and templates on mount
  useEffect(() => {
    initialize()
    fetchTemplates().catch(console.error)
  }, [initialize, fetchTemplates])

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
        <Route path="starred" element={<StarredView />} />
        <Route path="thread/:threadId" element={<ThreadDetailView />} />
        <Route path="sent" element={<SentView />} />
        <Route path="drafts" element={<DraftsView />} />
        <Route path="compose" element={<ComposeView />} />
        <Route path="settings" element={<SettingsView />} />
        <Route path="search" element={<GlobalSearchView />} />
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
