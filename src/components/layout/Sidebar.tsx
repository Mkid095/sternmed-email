import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Inbox,
  Star,
  Send,
  FileText,
  Archive,
  Trash2,
  AlertTriangle,
  PenSquare,
  ChevronLeft,
  PanelLeftClose,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { useTheme, layout, radius, fontSize } from '../../contexts/ThemeContext'
import { Avatar } from '../ui/Avatar'
import { IconButton } from '../ui/Button'
import type { FolderCounts } from '../../types'

interface NavEntry {
  label: string
  path: string
  icon: typeof Inbox
  count?: number
  /** Renders the count as an emphasised pill (used for unread). */
  emphasised?: boolean
}

export interface SidebarProps {
  collapsed: boolean
  onToggleCollapsed: () => void
}

export default function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { colors } = useTheme()
  const { user, emailAliasId } = useAuthStore()

  const [counts, setCounts] = useState<FolderCounts>({
    inbox: 0,
    archive: 0,
    spam: 0,
    trash: 0,
  })
  const [draftCount, setDraftCount] = useState(0)

  /**
   * Nav counts. The service already exposes getUnreadCount / getOutboundEmails
   * but nothing called them — the Inbox item had no badge at all.
   */
  const refreshCounts = useCallback(async () => {
    if (!emailAliasId) return
    try {
      const [folderCounts, drafts] = await Promise.all([
        emailInboundService.getFolderCounts(emailAliasId),
        emailOutboundService.getOutboundEmails(emailAliasId, {
          page: 1,
          pageSize: 1,
          status: 'pending',
        }),
      ])
      setCounts(folderCounts)
      setDraftCount(drafts.count)
    } catch {
      // A failed badge must never break navigation — stay silent.
    }
  }, [emailAliasId])

  useEffect(() => {
    refreshCounts()
  }, [refreshCounts, location.pathname])

  // Pick up changes made by the list views (they already dispatch this event).
  useEffect(() => {
    const handler = () => refreshCounts()
    window.addEventListener('email-deleted', handler)
    window.addEventListener('mailbox-changed', handler)
    return () => {
      window.removeEventListener('email-deleted', handler)
      window.removeEventListener('mailbox-changed', handler)
    }
  }, [refreshCounts])

  const primary: NavEntry[] = [
    { label: 'Inbox', path: '/inbox', icon: Inbox, count: counts.inbox, emphasised: true },
    { label: 'Starred', path: '/starred', icon: Star },
    { label: 'Drafts', path: '/drafts', icon: FileText, count: draftCount },
    { label: 'Sent', path: '/sent', icon: Send },
  ]

  const folders: NavEntry[] = [
    { label: 'Archive', path: '/archive', icon: Archive, count: counts.archive },
    { label: 'Spam', path: '/spam', icon: AlertTriangle, count: counts.spam },
    { label: 'Trash', path: '/trash', icon: Trash2, count: counts.trash },
  ]

  const isActive = (path: string) => location.pathname === path

  const renderItem = (entry: NavEntry) => {
    const Icon = entry.icon
    const active = isActive(entry.path)

    return (
      <button
        key={entry.path}
        type="button"
        onClick={() => navigate(entry.path)}
        aria-current={active ? 'page' : undefined}
        title={collapsed ? entry.label : undefined}
        className="w-full flex items-center transition-colors duration-150 cursor-pointer"
        style={{
          height: 38,
          gap: 12,
          padding: collapsed ? 0 : '0 10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: radius.md,
          backgroundColor: active ? colors.sidebarActive : 'transparent',
          color: active ? colors.sidebarTextActive : colors.sidebarText,
          fontSize: fontSize.base,
          fontWeight: active ? 600 : 500,
        }}
        onMouseEnter={(e) => {
          if (active) return
          e.currentTarget.style.backgroundColor = colors.sidebarHover
        }}
        onMouseLeave={(e) => {
          if (active) return
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        <span className="flex items-center justify-center flex-shrink-0" style={{ width: 18 }}>
          <Icon size={18} strokeWidth={active ? 2.2 : 1.9} />
        </span>

        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate">{entry.label}</span>
            {entry.count !== undefined && entry.count > 0 && (
              <span
                className="tabular text-xs font-semibold rounded-full px-2 py-0.5 flex-shrink-0"
                style={{
                  backgroundColor: entry.emphasised ? colors.primary : 'transparent',
                  color: entry.emphasised ? '#ffffff' : colors.textSecondary,
                  minWidth: 22,
                  textAlign: 'center',
                }}
              >
                {entry.count > 99 ? '99+' : entry.count}
              </span>
            )}
          </>
        )}

        {collapsed && entry.count !== undefined && entry.count > 0 && (
          <span
            aria-hidden="true"
            className="absolute rounded-full"
            style={{
              width: 7,
              height: 7,
              backgroundColor: colors.primary,
              marginLeft: 26,
              marginTop: -18,
            }}
          />
        )}
      </button>
    )
  }

  return (
    <aside
      className="flex flex-col flex-shrink-0 transition-[width] duration-200 scrollbar-thin"
      style={{
        width: collapsed ? layout.sidebarWidthCollapsed : layout.sidebarWidth,
        backgroundColor: colors.sidebar,
        borderRight: `1px solid ${colors.sidebarBorder}`,
        padding: collapsed ? '12px 10px' : '14px 12px',
      }}
    >
      {/* Compose */}
      <button
        type="button"
        onClick={() => navigate('/compose')}
        title="Compose"
        className="flex items-center justify-center gap-2 font-semibold text-white transition-all duration-150 cursor-pointer"
        style={{
          height: collapsed ? 42 : 42,
          padding: collapsed ? 0 : '0 16px',
          borderRadius: radius.md,
          backgroundColor: colors.primary,
          boxShadow: '0 1px 2px rgb(15 23 42 / 0.12)',
          fontSize: fontSize.base,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.primaryHover }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.primary }}
      >
        <PenSquare size={collapsed ? 19 : 17} strokeWidth={2.2} />
        {!collapsed && 'Compose'}
      </button>

      {/* Primary nav */}
      <nav
        aria-label="Mailboxes"
        className="flex flex-col gap-0.5 mt-4"
        style={{ position: 'relative' }}
      >
        {primary.map((entry) => renderItem(entry))}
      </nav>

      {/* Folders */}
      <div className="mt-6">
        {!collapsed && (
          <div
            className="font-semibold uppercase tracking-wider px-2.5 mb-2"
            style={{ fontSize: 11, color: colors.textTertiary }}
          >
            Folders
          </div>
        )}
        {collapsed && (
          <div
            className="mx-auto mb-2"
            style={{ width: 20, height: 1, backgroundColor: colors.divider }}
          />
        )}
        <nav aria-label="Folders" className="flex flex-col gap-0.5" style={{ position: 'relative' }}>
          {folders.map((entry) => renderItem(entry))}
        </nav>
      </div>

      {/* Account block */}
      <div className="mt-auto pt-4" style={{ borderTop: `1px solid ${colors.sidebarBorder}` }}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            {user && <Avatar name={user.email} size={34} />}
          </div>
        ) : (
          <div
            className="flex items-center gap-3 px-2 py-2 rounded-lg"
            style={{ backgroundColor: colors.sidebarHover }}
          >
            {user && <Avatar name={user.email} size={34} />}
            <div className="flex-1 min-w-0">
              <div
                className="truncate font-semibold"
                style={{ fontSize: fontSize.sm, color: colors.textPrimary }}
              >
                {user?.email?.split('@')[0] ?? 'Account'}
              </div>
              <div
                className="truncate"
                style={{ fontSize: fontSize.xs, color: colors.textTertiary }}
              >
                {user?.email ?? ''}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center mt-2">
          <IconButton
            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            size={32}
            onClick={onToggleCollapsed}
          >
            {collapsed ? (
              <ChevronLeft size={17} style={{ transform: 'rotate(180deg)' }} />
            ) : (
              <PanelLeftClose size={17} />
            )}
          </IconButton>
        </div>
      </div>
    </aside>
  )
}