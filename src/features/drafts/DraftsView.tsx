/**
 * Drafts
 *
 * Lists unsent messages and opens them in the full-page compose view.
 * The previous version routed drafts through the floating compose window
 * (which had no autosave) and rendered a checkbox that did nothing.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Trash2, RefreshCw, PenSquare } from 'lucide-react'
import { emailOutboundService } from '../../services/supabase/email-outbound.service'
import { useAuthStore } from '../../store/authStore'
import { useTheme } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'
import { useToastSuccess, useToastError } from '../shared/ui'
import { Button, IconButton } from '../../components/ui/Button'
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

export default function DraftsView() {
  const navigate = useNavigate()
  const { emailAliasId } = useAuthStore()
  const { colors } = useTheme()
  const { confirm, confirmation } = useConfirmationModal()
  const showSuccess = useToastSuccess()
  const showError = useToastError()

  const [drafts, setDrafts] = useState<EmailOutbound[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const fetchDrafts = useCallback(
    async (pageNum: number, reset = true) => {
      if (!emailAliasId) return
      if (pageNum === 1) setLoading(true)
      else setLoadingMore(true)
      setError(null)

      try {
        const result = await emailOutboundService.getOutboundEmails(emailAliasId, {
          page: pageNum,
          pageSize: PAGE_SIZE,
          status: 'pending',
        })
        setDrafts((prev) => (reset ? result.data : [...prev, ...result.data]))
        setTotal(result.count)
        setHasMore(result.hasMore)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load drafts.')
        showError('Failed to load drafts')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [emailAliasId, showError]
  )

  useEffect(() => {
    setPage(1)
    fetchDrafts(1, true)
  }, [emailAliasId, fetchDrafts])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchDrafts(1, true)
    setRefreshing(false)
    showSuccess('Drafts refreshed')
  }

  const handleLoadMore = () => {
    const next = page + 1
    setPage(next)
    fetchDrafts(next, false)
  }

  const toggleSelect = (draft: EmailOutbound) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(draft.id)) next.delete(draft.id)
      else next.add(draft.id)
      return next
    })
  }

  /** Opening a draft hands its id to the compose route via sessionStorage. */
  const openDraft = (draft: EmailOutbound) => {
    sessionStorage.setItem('compose:draftId', draft.id)
    navigate('/compose')
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return
    const count = selectedIds.size
    const ok = await confirm({
      title: 'Delete drafts',
      message: `Permanently delete ${count} draft${count === 1 ? '' : 's'}? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!ok) return

    const ids = Array.from(selectedIds)
    try {
      await Promise.all(ids.map((id) => emailOutboundService.softDelete(id)))
      setDrafts((prev) => prev.filter((d) => !selectedIds.has(d.id)))
      setTotal((prev) => Math.max(0, prev - count))
      setSelectedIds(new Set())
      window.dispatchEvent(new Event('mailbox-changed'))
      showSuccess(`Deleted ${count} draft${count === 1 ? '' : 's'}`)
    } catch {
      showError('Could not delete drafts')
    }
  }

  const hasSelection = selectedIds.size > 0

  const header = hasSelection ? (
    <SelectionToolbar count={selectedIds.size} onClear={() => setSelectedIds(new Set())}>
      <ToolbarButton onClick={handleDelete} icon={<Trash2 size={16} />}>
        Delete
      </ToolbarButton>
    </SelectionToolbar>
  ) : (
    <ListHeader
      title="Drafts"
      meta={<span className="tabular">{total} draft{total === 1 ? '' : 's'}</span>}
      actions={
        <>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/compose')}
            leadingIcon={<PenSquare size={15} />}
          >
            New draft
          </Button>
          <IconButton label="Refresh drafts" size={34} onClick={handleRefresh}>
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

      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        {loading ? (
          <SkeletonRows count={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchDrafts(1, true)} />
        ) : drafts.length === 0 ? (
          <EmptyState
            icon={<FileText size={26} />}
            title="No drafts"
            description="Anything you start writing is saved here automatically."
            action={
              <Button
                variant="primary"
                onClick={() => navigate('/compose')}
                leadingIcon={<PenSquare size={16} />}
              >
                Write a message
              </Button>
            }
          />
        ) : (
          <>
            <div role="rowgroup">
              {drafts.map((draft) => (
                <OutboundRow
                  key={draft.id}
                  email={draft}
                  variant="draft"
                  selected={selectedIds.has(draft.id)}
                  onOpen={openDraft}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>

            <LoadMore
              onClick={handleLoadMore}
              loading={loadingMore}
              hasMore={hasMore}
              shown={drafts.length}
              total={total}
            />
          </>
        )}
      </div>

      {confirmation && <ConfirmationModal {...confirmation} />}
    </div>
  )
}