import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Search, Settings, Menu as MenuIcon } from 'lucide-react'
import { useTheme, layout, radius, fontSize } from '../../contexts/ThemeContext'
import { IconButton } from '../ui/Button'
import ProfileMenu from './ProfileMenu'

export interface TopbarProps {
  onSignOut: () => void
  /** Extra actions rendered before the settings/profile cluster. */
  children?: React.ReactNode
}

export default function Topbar({ onSignOut, children }: TopbarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { colors } = useTheme()

  const [searchQuery, setSearchQuery] = useState('')

  const runSearch = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) {
        if (location.pathname === '/search') navigate('/inbox')
        return
      }
      navigate(`/search?q=${encodeURIComponent(trimmed)}`)
    },
    [navigate, location.pathname]
  )

  // Debounce typing into the URL; Enter bypasses the wait.
  useEffect(() => {
    const fromUrl = location.pathname === '/search'
      ? (new URLSearchParams(location.search).get('q') ?? '')
      : ''

    if (fromUrl === searchQuery) return

    const timer = window.setTimeout(() => runSearch(searchQuery), 400)
    return () => window.clearTimeout(timer)
  }, [searchQuery, runSearch, location.pathname, location.search])

  // Keep the box in step with the URL when navigation happens elsewhere.
  useEffect(() => {
    const fromUrl =
      location.pathname === '/search'
        ? (new URLSearchParams(location.search).get('q') ?? '')
        : ''
    setSearchQuery(fromUrl)
  }, [location.pathname, location.search])

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    runSearch(searchQuery)
  }

  return (
    <header
      className="flex items-center flex-shrink-0"
      style={{
        height: layout.topbarHeight,
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.divider}`,
        padding: '0 14px 0 16px',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => navigate('/inbox')}
          className="flex items-center gap-2.5 cursor-pointer rounded-lg px-1.5 py-1 -ml-1.5 transition-colors"
          style={{ color: colors.textPrimary }}
          title="Go to Inbox"
        >
          <span
            aria-hidden="true"
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 30,
              height: 30,
              borderRadius: radius.md,
              backgroundColor: colors.primary,
              color: '#fff',
            }}
          >
            <MenuIcon size={17} strokeWidth={2.3} />
          </span>
          <span className="font-semibold" style={{ fontSize: fontSize.lg, letterSpacing: '-0.01em' }}>
            Sternmed&nbsp;Mail
          </span>
        </button>
      </div>

      {/* Search — centred on the remaining space rather than the viewport, so it
          stays optically centred against the content column. */}
      <div className="flex-1 flex justify-center px-6">
        <form
          role="search"
          onSubmit={onSubmit}
          className="flex items-center w-full max-w-[560px] transition-all duration-150"
          style={{
            height: 38,
            gap: 10,
            padding: '0 12px',
            borderRadius: radius.md,
            backgroundColor: colors.searchBackground,
            border: `1px solid ${colors.border}`,
          }}
        >
          <Search size={16} style={{ color: colors.textTertiary, flexShrink: 0 }} aria-hidden="true" />

          <input
            type="search"
            name="q"
            autoComplete="off"
            aria-label="Search all emails"
            placeholder="Search mail"
            className="flex-1 bg-transparent outline-none min-w-0"
            style={{ fontSize: fontSize.base, color: colors.textPrimary }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="flex items-center justify-center flex-shrink-0 rounded cursor-pointer"
              style={{
                width: 20,
                height: 20,
                color: colors.textSecondary,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </form>
      </div>

      {/* Right cluster — settings and profile sit together in one group so the
          eye reads them as a pair instead of two items flung to the edge. */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {children}

        <div
          className="flex items-center gap-0.5 ml-1 pl-1.5"
          style={{ borderLeft: `1px solid ${colors.divider}` }}
        >
          <IconButton
            label="Settings"
            size={34}
            onClick={() => navigate('/settings')}
          >
            <Settings size={18} strokeWidth={1.9} />
          </IconButton>

          <ProfileMenu onSignOut={onSignOut} />
        </div>
      </div>
    </header>
  )
}