import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../contexts/ThemeContext'
import ComposeModal from '../features/compose/ComposeModal'
import {
  HamburgerIcon,
  SearchIcon,
  SettingsIcon,
  ComposeIcon,
  InboxIcon,
  StarIcon,
  SentIcon,
  DraftsIcon,
  ChevronRightIcon,
  LogOutIcon,
  SunIcon,
  MoonIcon,
} from '../components/icons'

const COMPANY_LOGO = 'https://res.cloudinary.com/dxb22swfg/image/upload/v1765747561/Asset_4_v5ksi6.png'

const navItems = [
  { label: 'Inbox', icon: InboxIcon, path: '/inbox' },
  { label: 'Starred', icon: StarIcon, path: '/starred' },
  { label: 'Sent', icon: SentIcon, path: '/sent' },
  { label: 'Drafts', icon: DraftsIcon, path: '/drafts' },
]

export default function EmailLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, emailAliasId, logout } = useAuthStore()
  const { colors, toggleTheme } = useTheme()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)

  const currentPath = location.pathname

  const handleCompose = (replyToId?: string) => {
    setComposeOpen(true)
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
            <HamburgerIcon />
          </button>

          {!sidebarCollapsed && (
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <img
                src={COMPANY_LOGO}
                alt="Sternmed Afrika"
                className="h-8 w-auto"
                style={{ height: '32px' }}
              />
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
            <SearchIcon />
            <input
              type="text"
              placeholder="Search emails..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: colors.textPrimary }}
            />
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-all duration-200"
            style={{
              backgroundColor: colors.surfaceHover,
              color: colors.textSecondary,
            }}
            title={colors.background === '#0f172a' ? 'Light mode' : 'Dark mode'}
          >
            {colors.background === '#0f172a' ? <SunIcon /> : <MoonIcon />}
          </button>

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
            <SettingsIcon />
          </button>

          {/* User avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium cursor-pointer transition-all duration-200"
            style={{ backgroundColor: colors.primary }}
            title={user?.email}
          >
            {getInitials(user?.email)}
          </div>
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
            <ComposeIcon />
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
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-left group"
                  style={{
                    backgroundColor: isActive ? colors.selected : 'transparent',
                    color: isActive ? colors.primary : colors.textSecondary,
                  }}
                  title={sidebarCollapsed ? label : undefined}
                >
                  <span className="flex-shrink-0">
                    <Icon />
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
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200"
              style={{ color: colors.textSecondary }}
              title={sidebarCollapsed ? 'Sign out' : undefined}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <LogOutIcon />
              {!sidebarCollapsed && <span className="text-sm">Sign out</span>}
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* ── COMPOSE MODAL ── */}
      <ComposeModal isOpen={composeOpen} onClose={() => setComposeOpen(false)} />
    </div>
  )
}
