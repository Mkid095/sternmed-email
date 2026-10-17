/**
 * Starred
 *
 * Starred messages. Shares <EmailRow> and the list chrome with Inbox so the
 * two read as one mailbox. (This file previously existed twice — an identical
 * 592-line copy also lived at features/inbox/StarredView.tsx.)
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, RefreshCw, Trash2, StarOff } from 'lucide-react'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'
import { useToastSuccess, useToastError } from '../shared/ui'
import { IconButton } from '../../components/ui/Button'
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

const PAGE_SIZE = 20

export default function StarredView() {
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
          starredOnly: true,
        })
        setEmails((prev) => (reset ? result.data : [...prev, ...result.data]))
        setTotal(result.count)
        setHasMore(result.hasMore)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load starred messages.')
        showError('Failed to load starred messages')
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
    showSuccess('Starred refreshed')
  }

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    fetchEmails(next, false)
  }

  const toggleSelect = (email: EmailInbound) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(email.id)) next.delete(email.id)
      else next.add(email.id)
      return next
    })
  }

  const handleToggleStar = async (email: EmailInbound) => {
    // Removing the star here takes the row out of the view entirely.
    setEmails((prev) => prev.filter((e) => e.id !== email.id))
    setTotal((prev) => Math.max(0, prev - 1))
    try {
      await emailInboundService.toggleStarred(email.id)
      window.dispatchEvent(new Event('mailbox-changed'))
    } catch {
      showError('Could not update star')
      fetchEmails(1, true)
    }
  }

  const handleUnstarAll = async () => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    const ok = await confirm({
      title: 'Remove stars',
      message: `Remove the star from ${count} message${count === 1 ? '' : 's'}?`,
      confirmLabel: 'Remove star',
      variant: 'info',
    })
    if (!ok) return

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => emailInboundService.toggleStarred(id))
      )
      setEmails((prev) => prev.filter((e) => !selectedIds.has(e.id)))
      setTotal((prev) => Math.max(0, prev - count))
      setSelectedIds(new Set())
      window.dispatchEvent(new Event('mailbox-changed'))
      showSuccess(`Removed star from ${count} message${count === 1 ? '' : 's'}`)
    } catch {
      showError('Could not update stars')
      fetchEmails(1, true)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    const ok = await confirm({
      title: 'Delete messages',
      message: `Delete ${count} message${count === 1 ? '' : 's'}?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return

    const ids = Array.from(selectedIds)
    try {
      await Promise.all(ids.map((id) => emailInboundService.softDelete(id)))
      setEmails((prev) => prev.filter((e) => !selectedIds.has(e.id)))
      setTotal((prev) => Math.max(0, prev - count))
      setSelectedIds(new Set())
      window.dispatchEvent(new Event('email-deleted'))
      window.dispatchEvent(new Event('mailbox-changed'))
      showSuccess(`Deleted ${count} message${count === 1 ? '' : 's'}`)
    } catch {
      showError('Could not delete messages')
    }
  }

  const hasSelection = selectedIds.size > 0

  const header = hasSelection ? (
    <SelectionToolbar count={selectedIds.size} onClear={() => setSelectedIds(new Set())}>
      <ToolbarButton onClick={handleUnstarAll} icon={<StarOff size={16} />}>
        Unstar
      </ToolbarButton>
      <ToolbarButton onClick={handleBatchDelete} icon={<Trash2 size={16} />}>
        Delete
      </ToolbarButton>
    </SelectionToolbar>
  ) : (
    <ListHeader
      title="Starred"
      meta={<span className="tabular">{total} message{total === 1 ? '' : 's'}</span>}
      actions={
        <IconButton label="Refresh starred" size={34} onClick={handleRefresh}>
          <RefreshCw
            size={17}
            style={{ animation: refreshing ? 'spin 700ms linear infinite' : undefined }}
          />
        </IconButton>
      }
    />
  )

  return (
    <div className="flex flex-col h-full min-h-0" style={{ backgroundColor: colors.surface }}>
      {header}

      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        {loading ? (
          <SkeletonRows count={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchEmails(1, true)} />
        ) : emails.length === 0 ? (
          <EmptyState
            icon={<Star size={26} />}
            title="No starred messages"
            description="Star anything you want to find quickly — quotes, orders, supplier replies."
          />
        ) : (
          <>
            <div role="rowgroup">
              {emails.map((email) => (
                <EmailRow
                  key={email.id}
                  email={email}
                  selected={selectedIds.has(email.id)}
                  onOpen={(email) => navigate(`/message/${email.id}`)}
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