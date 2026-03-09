import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../contexts/ThemeContext'
import ComposeModal from '../features/compose/ComposeModal'
import {
  HamburgerIcon,
  SearchIcon,
  FilterIcon,
  HelpIcon,
  SettingsIcon,
  AppsIcon,
  ComposeIcon,
  InboxIcon,
  StarIcon,
  SnoozedIcon,
  SentIcon,
  DraftsIcon,
  ChevronDownIcon,
  LabelIcon,
  MoreIcon,
  CloseIcon,
} from '../components/icons'

const navItems = [
  { label: 'Inbox', icon: InboxIcon, path: '/inbox' },
  { label: 'Starred', icon: StarIcon, path: '/starred' },
  { label: 'Snoozed', icon: SnoozedIcon, path: '/snoozed' },
  { label: 'Sent', icon: SentIcon, path: '/sent' },
  { label: 'Drafts', icon: DraftsIcon, path: '/drafts' },
]

export default function EmailLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, emailAliasId, logout } = useAuthStore()
  const { colors, toggleTheme } = useTheme()

  const [sidebarOpen, setSidebarOpen] = useState(true)
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
        fontFamily: "'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* ── TOP BAR ── */}
      <header
        className="flex items-center px-3 gap-2 flex-shrink-0"
        style={{
          height: '64px',
          backgroundColor: colors.background,
          borderBottom: `1px solid ${colors.divider}`,
        }}
      >
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-2" style={{ width: sidebarOpen ? '248px' : 'auto', flexShrink: 0 }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            style={{ color: colors.textSecondary }}
          >
            <HamburgerIcon />
          </button>

          {sidebarOpen && (
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="w-8 h-8 flex items-center justify-center rounded">
                <svg width="32" height="32" viewBox="0 0 40 29">
                  <path fill="#4285F4" d="M0 28.5V7.5L20 19 40 7.5V28.5H0Z"/>
                  <path fill="#34A853" d="M40 7.5V28.5h-6V12.5L20 23 6 12.5v16H0V7.5l20 12z" opacity="0"/>
                  <path fill="#EA4335" d="M0 7.5L20 19.5 40 7.5 20 0z"/>
                  <path fill="#FBBC05" d="M0 7.5v21h6V12.5z"/>
                  <path fill="#34A853" d="M40 7.5v21h-6V12.5z"/>
                  <path fill="#C5221F" d="M0 7.5L20 0l20 7.5-20 12z" opacity="0"/>
                </svg>
              </div>
              <span
                className="text-xl font-normal"
                style={{ color: colors.textPrimary, letterSpacing: '-0.3px' }}
              >
                Sternmed Mail
              </span>
            </div>
          )}
        </div>

        {/* Center: search bar */}
        <div className="flex-1 max-w-2xl mx-4">
          <div
            className="flex items-center gap-3 px-4 py-2 rounded-full"
            style={{
              backgroundColor: colors.searchBackground,
              border: `1px solid transparent`,
              transition: 'border-color 0.2s',
            }}
          >
            <SearchIcon />
            <input
              type="text"
              placeholder="Search emails..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: colors.textPrimary }}
            />
            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
              <FilterIcon />
            </button>
          </div>
        </div>

        {/* Right: action icons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => handleCompose()}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors"
            style={{ backgroundColor: colors.primary, color: 'white' }}
          >
            <ComposeIcon />
            {sidebarOpen && 'Compose'}
          </button>

          <button
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            style={{ color: colors.textSecondary }}
            title="Help"
          >
            <HelpIcon />
          </button>

          <button
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            style={{ color: colors.textSecondary }}
            title="Settings"
            onClick={() => navigate('/settings')}
          >
            <SettingsIcon />
          </button>

          <button
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            style={{ color: colors.textSecondary }}
            title="Theme"
            onClick={toggleTheme}
          >
            {colors.background === '#0d1117' ? '☀️' : '🌙'}
          </button>

          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium cursor-pointer border"
            style={{ backgroundColor: colors.primary, borderColor: colors.divider }}
          >
            {getInitials(user?.email)}
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── SIDEBAR ── */}
        {sidebarOpen && (
          <aside
            className="flex flex-col overflow-y-auto"
            style={{ width: '256px', padding: '8px 0 16px' }}
          >
            {/* Compose Button (duplicate for accessibility) */}
            <div className="px-3 pb-2">
              <button
                onClick={() => handleCompose()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-colors"
                style={{ backgroundColor: colors.primary, color: 'white' }}
              >
                <ComposeIcon />
                Compose
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1">
              {navItems.map(({ label, icon: Icon, path }) => {
                const isActive = currentPath === path || (label === 'Inbox' && currentPath === '/')
                return (
                  <button
                    key={label}
                    onClick={() => navigate(path)}
                    className="w-full flex items-center gap-4 px-3 py-2 mx-1 rounded-lg transition-colors text-left"
                    style={{
                      backgroundColor: isActive ? colors.selected : 'transparent',
                      color: isActive ? colors.primary : colors.textPrimary,
                      fontWeight: isActive ? 700 : 400,
                    }}
                  >
                    <span style={{ color: isActive ? colors.primary : colors.textSecondary }}>
                      <Icon />
                    </span>
                    <span className="flex-1">{label}</span>
                  </button>
                )
              })}

              {/* More */}
              <button
                onClick={() => setShowMore(!showMore)}
                className="w-full flex items-center gap-4 px-3 py-2 mx-1 rounded-lg transition-colors text-left"
                style={{
                  backgroundColor: showMore ? colors.surfaceHover : 'transparent',
                  color: colors.textSecondary,
                }}
              >
                <span style={{ transform: showMore ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <ChevronDownIcon />
                </span>
                <span className="flex-1">{showMore ? 'Less' : 'More'}</span>
              </button>

              {/* Labels */}
              <div className="px-3 py-2 mt-2 border-t" style={{ borderColor: colors.divider }}>
                <div className="flex items-center justify-between px-2 mb-1">
                  <span
                    className="text-xs font-semibold uppercase tracking-wider"
                    style={{ color: colors.textTertiary }}
                  >
                    Labels
                  </span>
                  <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                    <LabelIcon style={{ color: colors.textSecondary }} />
                  </button>
                </div>

                <button
                  className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm transition-colors text-left"
                  style={{
                    color: colors.textSecondary,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#7cb342' }} />
                  Personal
                </button>

                <button
                  className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm transition-colors text-left"
                  style={{
                    color: colors.textSecondary,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#43a047' }} />
                  Receipts
                </button>

                <button
                  className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm transition-colors text-left"
                  style={{
                    color: colors.textSecondary,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <span className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#1565c0' }} />
                  Medical
                </button>
              </div>
            </nav>

            {/* Storage/Upgrade */}
            <div className="px-3 py-2 border-t" style={{ borderColor: colors.divider }}>
              <div className="flex items-center gap-2 px-2 text-sm mb-1" style={{ color: colors.textSecondary }}>
                <span className="flex-1">Storage</span>
                <span>7.5 GB of 15 GB</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '50%' }} />
              </div>
            </div>

            {/* Logout */}
            <div className="px-3 mt-2 pt-2 border-t" style={{ borderColor: colors.divider }}>
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors"
                style={{ color: colors.textSecondary }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = colors.surfaceHover)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        )}

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
