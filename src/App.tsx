import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { EmailAuthGuard } from './guards/EmailAuthGuard'
import EmailLogin from './features/auth/EmailLogin'
import EmailLayout from './layouts/EmailLayout'
import InboxView from './features/inbox/InboxView'
import StarredView from './features/starred/StarredView'
import MessageView from './features/inbox/MessageView'
import SentView from './features/sent/SentView'
import FolderView from './features/folders/FolderView'
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
        <Route path="message/:id" element={<MessageView />} />
        <Route path="sent" element={<SentView />} />
        <Route path="archive" element={<FolderView folder="archive" />} />
        <Route path="spam" element={<FolderView folder="spam" />} />
        <Route path="trash" element={<FolderView folder="trash" />} />
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
