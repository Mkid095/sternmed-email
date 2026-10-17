/**
 * Small-screen navigation.
 *
 * Below `lg` the 248px sidebar is unusable on a phone, so the primary
 * destinations move into a fixed bottom bar:
 *
 *     [ Inbox ]      ( MENU )      [ Settings ]
 *
 * Inbox and Settings sit at the edges because those are the two destinations
 * people return to reflexively. The centre button is deliberately larger and
 * raised: it is the only way to reach the other six mailboxes, so it has to
 * look like the primary action rather than a third peer.
 *
 * The drawer is a Radix Dialog rather than a plain div so focus is trapped
 * while open, Escape closes it, and it is announced as a dialog — all of
 * which a hand-rolled overlay would have to reimplement incorrectly.
 *
 * Counts are fetched here rather than lifted into a shared hook: this only
 * mounts below `lg`, where Sidebar is hidden, so the two never run at once.
 */

import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Inbox,
  Star,
  Send,
  FileText,
  Archive,
  AlertTriangle,
  Trash2,
  PenSquare,
  Settings,
  X,
  Menu,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { useTheme, layout, radius, fontSize } from '../../contexts/ThemeContext'
import { Avatar } from '../ui/Avatar'
import type { FolderCounts } from '../../types'

interface NavEntry {
  label: string
  path: string
  icon: typeof Inbox
  count?: number
  emphasised?: boolean
}

export default function MobileNav({ onSignOut }: { onSignOut: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { colors } = useTheme()
  const { user, emailAliasId } = useAuthStore()

  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState<FolderCounts>({ inbox: 0, archive: 0, spam: 0, trash: 0 })
  const [draftCount, setDraftCount] = useState(0)

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
      // A failed badge must not break navigation.
    }
  }, [emailAliasId])

  useEffect(() => {
    refreshCounts()
  }, [refreshCounts, location.pathname])

  useEffect(() => {
    const handler = () => refreshCounts()
    window.addEventListener('email-deleted', handler)
    window.addEventListener('mailbox-changed', handler)
    return () => {
      window.removeEventListener('email-deleted', handler)
      window.removeEventListener('mailbox-changed', handler)
    }
  }, [refreshCounts])

  // Close the drawer on navigation so returning to a route does not leave the
  // overlay hanging over it.
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

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

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 60,
              backgroundColor: 'rgb(15 23 42 / 0.6)',
            }}
          />
          <Dialog.Content
            style={{
              position: 'fixed',
              inset: '0 auto 0 0',
              zIndex: 61,
              width: 'min(320px, 86vw)',
              backgroundColor: colors.surface,
              borderRight: `1px solid ${colors.divider}`,
              display: 'flex',
              flexDirection: 'column',
              outline: 'none',
            }}
          >
            {/* Drawer header */}
            <div
              className="flex items-center justify-between flex-shrink-0"
              style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.divider}` }}
            >
              <Dialog.Title className="font-semibold" style={{ fontSize: fontSize.base, color: colors.textPrimary }}>
                Menu
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  aria-label="Close menu"
                  className="cursor-pointer"
                  style={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 34,
                    height: 34,
                    borderRadius: radius.md,
                    border: 'none',
                    background: 'transparent',
                    color: colors.textSecondary,
                  }}
                >
                  <X size={19} />
                </button>
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-y-auto" style={{ padding: 12 }}>
              {/* Compose */}
              <button
                type="button"
                onClick={() => go('/compose')}
                className="w-full flex items-center gap-3 font-semibold cursor-pointer"
                style={{
                  height: 44,
                  padding: '0 14px',
                  marginBottom: 12,
                  borderRadius: radius.md,
                  border: 'none',
                  backgroundColor: colors.primary,
                  color: '#ffffff',
                  fontSize: fontSize.base,
                }}
              >
                <PenSquare size={17} />
                Compose
              </button>

              <DrawerSection label="Mailboxes" entries={primary} isActive={isActive} onNavigate={go} />
              <DrawerSection label="Folders" entries={folders} isActive={isActive} onNavigate={go} />

              <button
                type="button"
                onClick={() => go('/settings')}
                aria-current={isActive('/settings') ? 'page' : undefined}
                className="w-full flex items-center gap-3 text-left cursor-pointer"
                style={{
                  height: 44,
                  padding: '0 12px',
                  borderRadius: radius.md,
                  backgroundColor: isActive('/settings') ? colors.surfaceSubtle : 'transparent',
                  color: isActive('/settings') ? colors.primary : colors.textPrimary,
                  fontSize: fontSize.base,
                  fontWeight: isActive('/settings') ? 600 : 500,
                }}
              >
                <Settings size={18} strokeWidth={isActive('/settings') ? 2.2 : 1.9} />
                Settings
              </button>
            </div>

            {/* Account */}
            <div
              className="flex-shrink-0"
              style={{ padding: 12, borderTop: `1px solid ${colors.divider}` }}
            >
              <div
                className="flex items-center gap-3 px-2 py-2 rounded-lg mb-2"
                style={{ backgroundColor: colors.surfaceSubtle }}
              >
                {user && <Avatar name={user.email} size={34} />}
                <div className="flex-1 min-w-0">
                  <div
                    className="truncate font-semibold"
                    style={{ fontSize: fontSize.sm, color: colors.textPrimary }}
                  >
                    {user?.email?.split('@')[0] ?? 'Account'}
                  </div>
                  <div className="truncate" style={{ fontSize: fontSize.xs, color: colors.textTertiary }}>
                    {user?.email ?? ''}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onSignOut}
                className="w-full flex items-center gap-3 cursor-pointer"
                style={{
                  height: 42,
                  padding: '0 12px',
                  borderRadius: radius.md,
                  border: 'none',
                  background: 'transparent',
                  color: colors.error,
                  fontSize: fontSize.base,
                  fontWeight: 500,
                }}
              >
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>

        {/* ── The bottom bar ─────────────────────────────────────── */}
        <nav
          aria-label="Primary"
          className="lg:hidden flex-shrink-0 flex items-stretch"
          style={{
            height: layout.bottomNavHeight,
            paddingBottom: layout.safeAreaBottom,
            backgroundColor: colors.surface,
            borderTop: `1px solid ${colors.divider}`,
          }}
        >
          {/* Inbox */}
          <BarItem
            label="Inbox"
            active={isActive('/inbox')}
            onClick={() => go('/inbox')}
            icon={<Inbox size={21} strokeWidth={isActive('/inbox') ? 2.3 : 1.9} />}
            badge={counts.inbox}
          />

          {/* Prominent menu trigger */}
          <div className="flex-1 flex items-center justify-center">
            <Dialog.Trigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="cursor-pointer"
                style={{
                  // Raised above the bar so it reads as the primary action.
                  marginTop: -22,
                  width: 54,
                  height: 54,
                  borderRadius: 999,
                  border: 'none',
                  backgroundColor: colors.primary,
                  color: '#ffffff',
                  display: 'grid',
                  placeItems: 'center',
                  boxShadow: '0 6px 16px rgb(15 23 42 / 0.28)',
                  borderWidth: 3,
                  borderStyle: 'solid',
                  borderColor: colors.surface,
                }}
              >
                <Menu size={22} strokeWidth={2.3} />
              </button>
            </Dialog.Trigger>
          </div>

          {/* Settings */}
          <BarItem
            label="Settings"
            active={isActive('/settings')}
            onClick={() => go('/settings')}
            icon={<Settings size={21} strokeWidth={isActive('/settings') ? 2.3 : 1.9} />}
          />
        </nav>
      </Dialog.Root>
    </>
  )
}

function BarItem({
  label,
  icon,
  active,
  onClick,
  badge,
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  onClick: () => void
  badge?: number
}) {
  const { colors } = useTheme()
  const color = active ? colors.primary : colors.textSecondary

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 cursor-pointer"
      style={{
        background: 'transparent',
        border: 'none',
        color,
        fontSize: fontSize.xs,
        fontWeight: active ? 600 : 500,
        // 44px minimum touch target.
        minHeight: 44,
      }}
    >
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
        {icon}
        {badge !== undefined && badge > 0 && (
          <span
            aria-hidden="true"
            className="tabular rounded-full"
            style={{
              position: 'absolute',
              top: -6,
              right: -12,
              minWidth: 17,
              height: 17,
              padding: '0 4px',
              fontSize: 10,
              fontWeight: 700,
              lineHeight: '17px',
              textAlign: 'center',
              borderRadius: 999,
              backgroundColor: colors.primary,
              color: '#ffffff',
            }}
          >
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span>{label}</span>
    </button>
  )
}

function DrawerSection({
  label,
  entries,
  isActive,
  onNavigate,
}: {
  label: string
  entries: NavEntry[]
  isActive: (path: string) => boolean
  onNavigate: (path: string) => void
}) {
  const { colors } = useTheme()
  return (
    <div className="mb-4">
      <div
        className="font-semibold uppercase tracking-wider px-3 mb-1.5"
        style={{ fontSize: 11, color: colors.textTertiary }}
      >
        {label}
      </div>
      {entries.map((entry) => {
        const active = isActive(entry.path)
        const Icon = entry.icon
        return (
          <button
            key={entry.path}
            type="button"
            onClick={() => onNavigate(entry.path)}
            aria-current={active ? 'page' : undefined}
            className="w-full flex items-center gap-3 text-left cursor-pointer"
            style={{
              height: 44,
              padding: '0 12px',
              borderRadius: radius.md,
              border: 'none',
              backgroundColor: active ? colors.surfaceSubtle : 'transparent',
              color: active ? colors.primary : colors.textPrimary,
              fontSize: fontSize.base,
              fontWeight: active ? 600 : 500,
            }}
          >
            <Icon size={18} strokeWidth={active ? 2.2 : 1.9} />
            <span className="flex-1 truncate">{entry.label}</span>
            {entry.count !== undefined && entry.count > 0 && (
              <span
                className="tabular text-xs font-semibold rounded-full px-2 py-0.5"
                style={{ color: colors.textSecondary }}
              >
                {entry.count > 99 ? '99+' : entry.count}
              </span>
            )}
            <ChevronRight size={15} style={{ color: colors.textTertiary }} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}