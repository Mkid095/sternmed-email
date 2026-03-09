import { useState, useCallback } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useEmailModalStore } from '../features/inbox/useEmailModalStore'
import { useComposeStore } from '../features/compose/useComposeStore'
import { useTheme } from '../contexts/ThemeContext'
import EmailDetailModal from '../features/inbox/EmailDetailModal'
import { ComposeWindowManager } from '../features/compose/ComposeWindowManager'
import type { EmailInbound } from '../types'

// Icon components for navigation
const InboxIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M19 3H4.99c-1.1 0-1.99.9-1.99 2L3 19c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12h-4c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2zm0-6h-4c-1.1 0-2-.9-2-2v4c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2z"/>
  </svg>
)

const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
)

const SentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
)

const DraftsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM16 14H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
    <path d="M3 21h18" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const navItems = [
  { label: 'Inbox', icon: InboxIcon, path: '/inbox' },
  { label: 'Starred', icon: StarIcon, path: '/starred' },
  { label: 'Sent', icon: SentIcon, path: '/sent' },
  { label: 'Drafts', icon: DraftsIcon, path: '/drafts' },
]

export default function EmailLayout() {
  const navigate = useNavigate()
  const { user, emailAliasId } = useAuthStore()
  const { colors } = useTheme()
  const emailModalStore = useEmailModalStore()
  const openCompose = useComposeStore((state) => state.openCompose)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showMore, setShowMore] = useState(false)

  const location = useLocation()
  const currentPath = location.pathname

  /**
   * Handle compose button click
   */
  const handleCompose = (replyToId?: string, initialData?: any) => {
    openCompose(initialData)
  }

  const getInitials = (email?: string) => {
    if (!email) return '?'
    return email.charAt(0).toUpperCase()
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor: colors.background,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* ── TOP BAR ── */}
      <header
        className="flex items-center flex-shrink-0 transition-all duration-300"
        style={{
          height: '64px',
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.divider}`,
          paddingLeft: sidebarCollapsed ? '12px' : '16px',
        }}
      >
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-3" style={{ width: sidebarCollapsed ? '48px' : '240px', flexShrink: 0 }}>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 rounded-lg transition-all duration-200"
            style={{
              color: colors.textSecondary,
              backgroundColor: colors.surfaceHover,
            }}
            title={sidebarCollapsed ? 'Expand menu' : 'Collapse menu'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            </svg>
          </button>

          {!sidebarCollapsed && (
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <span
                className="text-lg font-semibold"
                style={{ color: colors.textPrimary }}
              >
                Sternmed Mail
              </span>
            </div>
          )}
        </div>

        {/* Center: search bar */}
        <div className="flex-1 max-w-2xl mx-4">
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-200"
            style={{
              backgroundColor: colors.searchBackground,
              border: `1px solid ${colors.border}`,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={colors.textSecondary}>
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              placeholder="Search all emails..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: colors.textPrimary }}
            />
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Settings */}
          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg transition-all duration-200"
            style={{
              backgroundColor: colors.surfaceHover,
              color: colors.textSecondary,
            }}
            title="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
          </button>

          {/* User avatar */}
          {user && (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium cursor-pointer transition-all duration-200"
              style={{ backgroundColor: colors.primary }}
              title={user.email}
            >
              {getInitials(user.email)}
            </div>
          )}
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── SIDEBAR ── */}
        <aside
          className="flex flex-col border-r transition-all duration-300 overflow-y-auto"
          style={{
            width: sidebarCollapsed ? '64px' : '240px',
            backgroundColor: colors.surface,
            borderColor: colors.divider,
            padding: sidebarCollapsed ? '12px 8px' : '8px',
          }}
        >
          {/* Compose Button */}
          <button
            onClick={() => handleCompose()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-all duration-200 text-white mb-4"
            style={{ backgroundColor: colors.primary }}
            title={sidebarCollapsed ? 'Compose' : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            {!sidebarCollapsed && 'Compose'}
          </button>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
            {navItems.map(({ label, icon: Icon, path }) => {
              const isActive = currentPath === path || (label === 'Inbox' && currentPath === '/')

              return (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-left"
                  style={{
                    backgroundColor: isActive ? colors.primary : 'transparent',
                    color: isActive ? '#ffffff' : colors.textSecondary,
                  }}
                  title={sidebarCollapsed ? label : undefined}
                >
                  <span className="flex-shrink-0">
                    <Icon filled={isActive} />
                  </span>
                  {!sidebarCollapsed && (
                    <span className="flex-1 text-sm font-medium truncate">
                      {label}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Bottom section */}
          <div className="pt-4 border-t" style={{ borderColor: colors.divider }}>
            {/* Logout */}
            <button
              onClick={() => {/* TODO: implement logout */}}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200"
              style={{ color: colors.textSecondary }}
              title={sidebarCollapsed ? 'Sign out' : undefined}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
              </svg>
              {!sidebarCollapsed && <span className="text-sm">Sign out</span>}
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 bg-gray-50 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* ── GLOBAL MODALS ── */}
      <EmailDetailModal
        onReply={(email) => {
          openCompose({
            to: [email.senderEmail],
            subject: `Re: ${email.subject}`,
            body: `\n\n--- Original message ---\nFrom: ${email.senderEmail}\nDate: ${new Date(email.receivedAt).toLocaleString()}\n\n${email.bodyText}`,
          })
        }}
        onForward={(email) => {
          openCompose({
            subject: `Fwd: ${email.subject}`,
            body: `\n\n--- Forwarded message ---\nFrom: ${email.senderEmail}\nDate: ${new Date(email.receivedAt).toLocaleString()}\n\n${email.bodyText}`,
          })
        }}
        onDelete={() => {
          // Refresh handled by event listener
        }}
      />
      <ComposeWindowManager />
    </div>
  )
}
