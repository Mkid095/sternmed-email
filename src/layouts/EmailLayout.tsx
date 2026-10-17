import { useState, useCallback } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../contexts/ThemeContext'
import SentDetailModal from '../features/sent/SentDetailModal'
import { ToastContainer, useToastError } from '../features/shared/ui'
import Topbar from '../components/layout/Topbar'
import Sidebar from '../components/layout/Sidebar'
import MobileNav from '../components/layout/MobileNav'

/**
 * Mailbox shell.
 *
 * Composes the top bar and sidebar around the routed view. Inbound messages
 * open on their own full-page route (/message/:id) rather than in a modal, so
 * only the sent-message viewer is mounted globally here.
 */
export default function EmailLayout() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const { colors } = useTheme()
  const showError = useToastError()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleSignOut = useCallback(async () => {
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      showError('Failed to sign out. Please try again.')
      console.error('Sign out failed:', error)
    }
  }, [logout, navigate, showError])

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor: colors.canvas,
        color: colors.textPrimary,
      }}
    >
      <Topbar onSignOut={handleSignOut} />

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Below lg the 248px sidebar is unusable on a phone; MobileNav takes
            over and carries every destination in its drawer. */}
        <div className="hidden lg:contents">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
          />
        </div>

        <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <Outlet />
        </main>
      </div>

      <MobileNav onSignOut={handleSignOut} />

      <SentDetailModal
        onReply={() => navigate('/compose')}
        onForward={() => navigate('/compose')}
        onDelete={() => {
          window.dispatchEvent(new CustomEvent('mailbox-changed'))
        }}
      />

      <ToastContainer />
    </div>
  )
}