/**
 * Inbox View
 *
 * Gmail-style list: selection, star, unread state, filtering and paging.
 * Rows come from the shared <EmailRow> so Inbox / Starred stay visually identical.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { useAuthStore } from '../../store/authStore'
import { useTheme, radius, fontSize } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import { useToastSuccess, useToastError } from '../shared/ui'
import {
  RefreshCw,
  Trash2,
  Star,
  Archive,
  ShieldAlert,
  MailOpen,
  Mail,
  CheckCheck,
  Inbox as InboxIcon,
} from 'lucide-react'
import ConfirmationModal from '../shared/ui/ConfirmationModal'
import { IconButton, Button } from '../../components/ui/Button'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { EmailRow } from '../../components/mail/EmailRow'
import {
  ListHeader,
  SelectionToolbar,
  ToolbarButton,
  EmptyState,
  ErrorState,
  LoadMore,
} from '../../components/mail/MailList'
import type { EmailInbound } from '../../types'

type Filter = 'all' | 'unread' | 'starred'

const PAGE_SIZE = 20

export default function InboxView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()
  const showSuccess = useToastSuccess()
  const showError = useToastError()

  const [emails, setEmails] = useState<EmailInbound[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchEmails = useCallback(
    async (pageNum: number, reset = true) => {
      if (!emailAliasId) return

      if (pageNum === 1) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      try {
        const result = await emailInboundService.getInboundEmails(emailAliasId, {
          page: pageNum,
          pageSize: PAGE_SIZE,
        })

        setEmails((prev) => (reset ? result.data : [...prev, ...result.data]))
        setTotal(result.count)
        setHasMore(result.hasMore)
      } catch (err) {
        // Previously this only reached console.log, so a failed fetch looked
        // identical to an empty mailbox.
        const message =
          err instanceof Error ? err.message : 'Could not load your inbox.'
        setError(message)
        showError('Failed to load inbox')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [emailAliasId, showError]
  )

  useEffect(() => {
    setPage(1)
    fetchEmails(1, true)
  }, [emailAliasId, fetchEmails])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchEmails(1, true)
    setRefreshing(false)
    showSuccess('Inbox refreshed')
  }

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    fetchEmails(next, false)
  }

  // ── Selection ──────────────────────────────────────────────────
  const toggleSelect = (email: EmailInbound) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(email.id)) next.delete(email.id)
      else next.add(email.id)
      return next
    })
  }

  const clearSelection = () => setSelectedIds(new Set())

  const visible = emails.filter((email) => {
    if (filter === 'unread') return !email.isRead
    if (filter === 'starred') return email.isStarred
    return true
  })

  const unreadCount = emails.filter((e) => !e.isRead).length
  const hasSelection = selectedIds.size > 0

  // ── Mutations ──────────────────────────────────────────────────
  const handleOpen = async (email: EmailInbound) => {
    // Navigate to the full-page reader. It marks the message read on mount,
    // so we do not duplicate that write here.
    navigate(`/message/${email.id}`)
  }

  const handleToggleStar = async (email: EmailInbound) => {
    const previous = email.isStarred
    setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, isStarred: !previous } : e)))
    try {
      const actual = await emailInboundService.toggleStarred(email.id)
      setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, isStarred: actual } : e)))
    } catch {
      // Roll back — previously the star silently drifted out of sync.
      setEmails((prev) => prev.map((e) => (e.id === email.id ? { ...e, isStarred: previous } : e)))
      showError('Could not update star')
    }
  }

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return
    const targets = emails.filter((e) => !e.isRead)
    try {
      await Promise.all(targets.map((e) => emailInboundService.markAsRead(e.id)))
      setEmails((prev) => prev.map((e) => ({ ...e, isRead: true })))
      showSuccess(`Marked ${targets.length} email${targets.length === 1 ? '' : 's'} as read`)
      window.dispatchEvent(new Event('mailbox-changed'))
    } catch {
      showError('Could not mark emails as read')
      fetchEmails(1, true)
    }
  }

  const handleBatchArchive = async () => {
    if (!hasSelection) return
    const count = selectedIds.size
    const ids = Array.from(selectedIds)
    const previous = emails

    setEmails((prev) => prev.filter((email) => !selectedIds.has(email.id)))
    setTotal((prev) => Math.max(0, prev - count))
    clearSelection()

    try {
      await emailInboundService.setArchived(ids, true)
      window.dispatchEvent(new Event('mailbox-changed'))
      showSuccess(`Archived ${count} email${count === 1 ? '' : 's'}`)
    } catch {
      setEmails(previous)
      setTotal((prev) => prev + count)
      setSelectedIds(new Set(ids))
      showError('Could not archive those emails')
    }
  }

  const handleBatchSpam = async () => {
    if (!hasSelection) return
    const count = selectedIds.size
    const ids = Array.from(selectedIds)
    const previous = emails

    setEmails((prev) => prev.filter((email) => !selectedIds.has(email.id)))
    setTotal((prev) => Math.max(0, prev - count))
    clearSelection()

    try {
      await emailInboundService.setSpam(ids, true)
      window.dispatchEvent(new Event('mailbox-changed'))
      showSuccess(`Reported ${count} email${count === 1 ? '' : 's'} as spam`)
    } catch {
      setEmails(previous)
      setTotal((prev) => prev + count)
      setSelectedIds(new Set(ids))
      showError('Could not report those emails')
    }
  }

  const handleBatchDelete = async () => {
    if (!hasSelection) return
    const count = selectedIds.size
    const ok = await confirm({
      title: 'Delete emails',
      message: `Delete ${count} email${count === 1 ? '' : 's'}? You can restore them from Trash.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return

    const ids = Array.from(selectedIds)
    try {
      await Promise.all(ids.map((id) => emailInboundService.softDelete(id)))
      setEmails((prev) => prev.filter((e) => !selectedIds.has(e.id)))
      setTotal((prev) => Math.max(0, prev - ids.length))
      clearSelection()
      window.dispatchEvent(new Event('email-deleted'))
      window.dispatchEvent(new Event('mailbox-changed'))
      showSuccess(`Deleted ${count} email${count === 1 ? '' : 's'}`)
    } catch {
      showError('Could not delete emails')
    }
  }

  const handleBatchStar = async (makeStarred: boolean) => {
    if (!hasSelection) return
    const targets = emails.filter((e) => selectedIds.has(e.id) && e.isStarred !== makeStarred)
    if (targets.length === 0) {
      showSuccess(`Already ${makeStarred ? 'starred' : 'unstarred'}`)
      return
    }
    try {
      await Promise.all(targets.map((e) => emailInboundService.toggleStarred(e.id)))
      setEmails((prev) => prev.map((e) => (selectedIds.has(e.id) ? { ...e, isStarred: makeStarred } : e)))
      showSuccess(
        `${targets.length} email${targets.length === 1 ? '' : 's'} ${makeStarred ? 'starred' : 'unstarred'}`
      )
    } catch {
      showError('Could not update stars')
      fetchEmails(1, true)
    }
  }

  const handleBatchMarkRead = async (markAsRead: boolean) => {
    if (!hasSelection) return
    const targets = emails.filter((e) => selectedIds.has(e.id) && e.isRead !== markAsRead)
    if (targets.length === 0) return
    try {
      await Promise.all(
        targets.map((e) =>
          markAsRead ? emailInboundService.markAsRead(e.id) : emailInboundService.markAsUnread(e.id)
        )
      )
      setEmails((prev) => prev.map((e) => (selectedIds.has(e.id) ? { ...e, isRead: markAsRead } : e)))
      showSuccess(
        `${targets.length} email${targets.length === 1 ? '' : 's'} marked as ${markAsRead ? 'read' : 'unread'}`
      )
      window.dispatchEvent(new Event('mailbox-changed'))
    } catch {
      showError('Could not update emails')
      fetchEmails(1, true)
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  const header = hasSelection ? (
    <SelectionToolbar count={selectedIds.size} onClear={clearSelection}>
      <ToolbarButton onClick={() => handleBatchMarkRead(true)} icon={<MailOpen size={16} />}>
        Read
      </ToolbarButton>
      <ToolbarButton onClick={() => handleBatchMarkRead(false)} icon={<Mail size={16} />}>
        Unread
      </ToolbarButton>
      <ToolbarButton onClick={() => handleBatchStar(true)} icon={<Star size={16} />}>
        Star
      </ToolbarButton>
      <ToolbarButton onClick={handleBatchArchive} icon={<Archive size={16} />}>
        Archive
      </ToolbarButton>
      <ToolbarButton onClick={handleBatchSpam} icon={<ShieldAlert size={16} />}>
        Spam
      </ToolbarButton>
      <ToolbarButton onClick={handleBatchDelete} icon={<Trash2 size={16} />}>
        Delete
      </ToolbarButton>
    </SelectionToolbar>
  ) : (
    <ListHeader
      title="Inbox"
      meta={
        <span className="tabular">
          {total} email{total === 1 ? '' : 's'}
          {unreadCount > 0 && ` · ${unreadCount} unread`}
        </span>
      }
      actions={
        <>
          {/* Segmented filter */}
          <div
            className="flex items-center gap-0.5 p-0.5 rounded-lg"
            style={{ backgroundColor: colors.surfaceSubtle }}
            role="group"
            aria-label="Filter inbox"
          >
            {(['all', 'unread', 'starred'] as Filter[]).map((value) => {
              const active = filter === value
              const label =
                value === 'all' ? 'All' : value === 'unread' ? 'Unread' : 'Starred'
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={active}
                  className="font-medium transition-colors cursor-pointer"
                  style={{
                    height: 28,
                    padding: '0 11px',
                    borderRadius: radius.sm,
                    fontSize: fontSize.sm,
                    backgroundColor: active ? colors.surface : 'transparent',
                    color: active ? colors.textPrimary : colors.textSecondary,
                    boxShadow: active ? '0 1px 2px rgb(15 23 42 / 0.08)' : 'none',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <IconButton label="Refresh inbox" size={34} onClick={handleRefresh}>
            <RefreshCw
              size={17}
              style={{ animation: refreshing ? 'spin 700ms linear infinite' : undefined }}
            />
          </IconButton>
        </>
      }
    />
  )

  return (
    <div className="flex flex-col h-full min-h-0" style={{ backgroundColor: colors.surface }}>
      {header}

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        {loading ? (
          <SkeletonRows count={8} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchEmails(1, true)} />
        ) : visible.length === 0 ? (
          filter !== 'all' ? (
            <EmptyState
              icon={<InboxIcon size={26} />}
              title={`No ${filter} emails`}
              description={
                filter === 'unread'
                  ? 'You are all caught up — nothing left to read.'
                  : 'Starred emails will collect here.'
              }
              action={
                <Button variant="secondary" onClick={() => setFilter('all')}>
                  Show all emails
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<InboxIcon size={26} />}
              title="Your inbox is empty"
              description="New messages sent to your address will appear here."
            />
          )
        ) : (
          <>
            <div role="rowgroup">
              {visible.map((email) => (
                <EmailRow
                  key={email.id}
                  email={email}
                  selected={selectedIds.has(email.id)}
                  onOpen={handleOpen}
                  onToggleSelect={toggleSelect}
                  onToggleStar={handleToggleStar}
                />
              ))}
            </div>

            <LoadMore
              onClick={handleLoadMore}
              loading={loadingMore}
              hasMore={hasMore}
              shown={emails.length}
              total={total}
            />
          </>
        )}
      </div>

      {confirmation && <ConfirmationModal {...confirmation} />}
    </div>
  )
}