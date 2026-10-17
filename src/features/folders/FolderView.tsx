/**
 * Archive, Spam and Trash
 *
 * All three are the same view over a different folder filter, so they share
 * one component and differ only in their actions and wording. Trash is the odd
 * one out: it can restore, and emptying it is irreversible.
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  ShieldAlert,
  Trash2,
  RefreshCw,
  RotateCcw,
  Inbox,
  Mail,
  AlertTriangle,
} from 'lucide-react'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { useAuthStore } from '../../store/authStore'
import { useTheme, fontSize } from '../../contexts/ThemeContext'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'
import { useToastSuccess, useToastError } from '../shared/ui'
import { Button, IconButton } from '../../components/ui/Button'
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
import type { EmailInbound, MailboxFolder } from '../../types'

const PAGE_SIZE = 20

interface FolderConfig {
  folder: MailboxFolder
  title: string
  icon: typeof Archive
  emptyTitle: string
  emptyDescription: string
}

const CONFIGS: Record<Exclude<MailboxFolder, 'inbox'>, FolderConfig> = {
  archive: {
    folder: 'archive',
    title: 'Archive',
    icon: Archive,
    emptyTitle: 'Archive is empty',
    emptyDescription: 'Messages you archive are stored here and removed from your inbox.',
  },
  spam: {
    folder: 'spam',
    title: 'Spam',
    icon: ShieldAlert,
    emptyTitle: 'No spam',
    emptyDescription: 'Messages you report as spam are moved here instead of being deleted.',
  },
  trash: {
    folder: 'trash',
    title: 'Trash',
    icon: Trash2,
    emptyTitle: 'Trash is empty',
    emptyDescription: 'Deleted messages are kept here so you can restore them.',
  },
}

export default function FolderView({ folder }: { folder: Exclude<MailboxFolder, 'inbox'> }) {
  const config = CONFIGS[folder]
  const isTrash = folder === 'trash'

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
          folder,
        })
        setEmails((prev) => (reset ? result.data : [...prev, ...result.data]))
        setTotal(result.count)
        setHasMore(result.hasMore)
      } catch (err) {
        setError(err instanceof Error ? err.message : `Could not load ${folder}.`)
        showError(`Failed to load ${folder}`)
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [emailAliasId, folder, showError]
  )

  useEffect(() => {
    setPage(1)
    fetchEmails(1, true)
  }, [emailAliasId, folder, fetchEmails])

  const refresh = async () => {
    setRefreshing(true)
    await fetchEmails(1, true)
    setRefreshing(false)
    showSuccess(`${config.title} refreshed`)
  }

  const loadMore = () => {
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

  /** Optimistically drop the row, then persist. Rolls back on failure. */
  const runOnSelection = async (
    action: (ids: string[]) => Promise<void>,
    successMessage: (count: number) => string
  ) => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    const count = ids.length

    const previous = emails
    setEmails((prev) => prev.filter((email) => !ids.includes(email.id)))
    setTotal((prev) => Math.max(0, prev - count))
    setSelectedIds(new Set())

    try {
      await action(ids)
      window.dispatchEvent(new Event('mailbox-changed'))
      showSuccess(successMessage(count))
    } catch {
      setEmails(previous)
      setTotal((prev) => prev + count)
      setSelectedIds(new Set(ids))
      showError('That action did not complete')
    }
  }

  const restoreSelected = () =>
    runOnSelection(
      (ids) => emailInboundService.setDeleted(ids, false),
      (count) => `Restored ${count} message${count === 1 ? '' : 's'}`
    )

  const moveToInboxSelected = () =>
    runOnSelection(
      async (ids) => {
        if (isTrash) {
          // Restoring from trash must also clear any archive/spam flag,
          // otherwise the message lands somewhere the user did not expect.
          await emailInboundService.setDeleted(ids, false)
          await emailInboundService.setArchived(ids, false)
          await emailInboundService.setSpam(ids, false)
        } else if (folder === 'archive') {
          await emailInboundService.setArchived(ids, false)
        } else {
          await emailInboundService.setSpam(ids, false)
        }
      },
      (count) => `Moved ${count} message${count === 1 ? '' : 's'} to the inbox`
    )

  const deleteForeverSelected = () =>
    runOnSelection(
      (ids) => emailInboundService.permanentlyDelete(ids),
      (count) => `Permanently deleted ${count} message${count === 1 ? '' : 's'}`
    )

  const emptyTrash = async () => {
    const ok = await confirm({
      title: 'Empty trash',
      message: `Permanently delete all ${total} message${total === 1 ? '' : 's'} in the trash? This cannot be undone.`,
      confirmLabel: 'Empty trash',
      variant: 'danger',
    })
    if (!ok) return

    // The UI deletes what is currently loaded; a background job handles the
    // rest once the retention-window function is wired to the service role.
    try {
      const loaded = emails.map((email) => email.id)
      if (loaded.length > 0) await emailInboundService.permanentlyDelete(loaded)
      setEmails([])
      setTotal(0)
      window.dispatchEvent(new Event('mailbox-changed'))
      showSuccess(
        loaded.length < total
          ? `Deleted ${loaded.length} of ${total} — refresh to clear older items`
          : 'Trash emptied'
      )
    } catch {
      showError('Could not empty the trash')
    }
  }

  const hasSelection = selectedIds.size > 0

  const header = hasSelection ? (
    <SelectionToolbar count={selectedIds.size} onClear={() => setSelectedIds(new Set())}>
      <ToolbarButton onClick={moveToInboxSelected} icon={<Inbox size={16} />}>
        Move to inbox
      </ToolbarButton>
      {isTrash && (
        <ToolbarButton onClick={restoreSelected} icon={<RotateCcw size={16} />}>
          Restore
        </ToolbarButton>
      )}
      <ToolbarButton onClick={deleteForeverSelected} icon={<Trash2 size={16} />}>
        Delete forever
      </ToolbarButton>
    </SelectionToolbar>
  ) : (
    <ListHeader
      title={config.title}
      meta={<span className="tabular">{total} message{total === 1 ? '' : 's'}</span>}
      actions={
        <>
          {isTrash && total > 0 && (
            <Button variant="danger" size="sm" onClick={emptyTrash} leadingIcon={<Trash2 size={15} />}>
              Empty trash
            </Button>
          )}
          <IconButton label={`Refresh ${folder}`} size={34} onClick={refresh}>
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
          <SkeletonRows count={6} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchEmails(1, true)} />
        ) : emails.length === 0 ? (
          <EmptyState icon={<config.icon size={26} />} title={config.emptyTitle} description={config.emptyDescription} />
        ) : (
          <>
            <div role="rowgroup">
              {emails.map((email) => (
                <EmailRow
                  key={email.id}
                  email={email}
                  selected={selectedIds.has(email.id)}
                  onOpen={(message) => navigate(`/message/${message.id}`)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>

            <LoadMore
              onClick={loadMore}
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