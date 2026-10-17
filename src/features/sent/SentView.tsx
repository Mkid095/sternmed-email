/**
 * Sent
 *
 * Lists successfully sent messages. Uses the shared <OutboundRow> so the
 * layout matches Inbox. Selection actually works here — the previous version
 * rendered a decorative checkbox and supported no bulk actions.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, RefreshCw, Send, MailCheck } from 'lucide-react'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { useAuthStore } from '../../store/authStore'
import { useSentDetailModalStore } from './useSentDetailModalStore'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'
import { useToastSuccess, useToastError } from '../shared/ui'
import { IconButton } from '../../components/ui/Button'
import { SkeletonRows } from '../../components/ui/Skeleton'
import { OutboundRow } from '../../components/mail/OutboundRow'
import {
  ListHeader,
  SelectionToolbar,
  ToolbarButton,
  EmptyState,
  ErrorState,
  LoadMore,
} from '../../components/mail/MailList'
import type { EmailOutbound } from '../../types'

const PAGE_SIZE = 20

export default function SentView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const { open } = useSentDetailModalStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()
  const showSuccess = useToastSuccess()
  const showError = useToastError()

  const [emails, setEmails] = useState<EmailOutbound[]>([])
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
        const result = await emailOutboundService.getOutboundEmails(emailAliasId, {
          page: pageNum,
          pageSize: PAGE_SIZE,
          status: 'sent',
        })
        setEmails((prev) => (reset ? result.data : [...prev, ...result.data]))
        setTotal(result.count)
        setHasMore(result.hasMore)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load sent messages.')
        showError('Failed to load sent messages')
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
    showSuccess('Sent folder refreshed')
  }

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    fetchEmails(next, false)
  }

  const toggleSelect = (email: EmailOutbound) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(email.id)) next.delete(email.id)
      else next.add(email.id)
      return next
    })
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    const ok = await confirm({
      title: 'Remove from Sent',
      message: `Remove ${count} message${count === 1 ? '' : 's'} from the Sent folder?`,
      confirmLabel: 'Remove',
      variant: 'danger',
    })
    if (!ok) return

    const ids = Array.from(selectedIds)
    try {
      await Promise.all(ids.map((id) => emailOutboundService.softDelete(id)))
      setEmails((prev) => prev.filter((e) => !selectedIds.has(e.id)))
      setTotal((prev) => Math.max(0, prev - ids.length))
      setSelectedIds(new Set())
      window.dispatchEvent(new Event('mailbox-changed'))
      showSuccess(`Removed ${count} message${count === 1 ? '' : 's'}`)
    } catch {
      showError('Could not remove messages')
    }
  }

  const hasSelection = selectedIds.size > 0

  const header = hasSelection ? (
    <SelectionToolbar count={selectedIds.size} onClear={() => setSelectedIds(new Set())}>
      <ToolbarButton onClick={handleBatchDelete} icon={<Trash2 size={16} />}>
        Delete
      </ToolbarButton>
    </SelectionToolbar>
  ) : (
    <ListHeader
      title="Sent"
      meta={<span className="tabular">{total} message{total === 1 ? '' : 's'}</span>}
      actions={
        <IconButton label="Refresh sent" size={34} onClick={handleRefresh}>
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
            icon={<Send size={26} />}
            title="Nothing sent yet"
            description="Emails you send will be listed here with their delivery status."
            action={
              <button
                type="button"
                onClick={() => navigate('/compose')}
                className="inline-flex items-center gap-2 font-medium px-4 h-9 rounded-lg text-white cursor-pointer"
                style={{ backgroundColor: colors.primary }}
              >
                <MailCheck size={16} />
                Compose a message
              </button>
            }
          />
        ) : (
          <>
            <div role="rowgroup">
              {emails.map((email) => (
                <OutboundRow
                  key={email.id}
                  email={email}
                  variant="sent"
                  selected={selectedIds.has(email.id)}
                  onOpen={open}
                  onToggleSelect={toggleSelect}
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