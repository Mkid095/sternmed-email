import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Archive,
  Clock,
  Trash2,
  MailOpen,
  Move,
  MoreVertical,
  Reply,
  Forward,
  Star,
} from 'lucide-react'
import { useEmailModalStore } from './useEmailModalStore'
import { useTheme } from '../../contexts/ThemeContext'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import type { EmailInbound } from '../../types'
import { format } from 'date-fns'
import useConfirmationModal from '../shared/ui/useConfirmationModal'
import ConfirmationModal from '../shared/ui/ConfirmationModal'

export default function EmailDetailModal() {
  const navigate = useNavigate()
  const { colors } = useTheme()
  const { thread, isOpen, close } = useEmailModalStore()
  const { confirm, confirmation } = useConfirmationModal()

  const handleClose = useCallback(() => {
    close()
  }, [close])

  const handleBack = useCallback(() => {
    close()
    navigate(-1)
  }, [close, navigate])

  const handleArchive = useCallback(async () => {
    if (!thread) return
    const result = await confirm({
      title: 'Archive Email',
      message: 'Archive this conversation?',
      confirmLabel: 'Archive',
      variant: 'info',
    })
    if (!result) return

    try {
      // For now, archive means soft-delete (move to trash)
      // In a full implementation, you might add an 'is_archived' boolean field
      await Promise.all(
        thread.map((email) => emailInboundService.softDelete(email.id))
      )
      handleClose()
      window.dispatchEvent(new Event('email-deleted'))
    } catch (error) {
      console.error('Error archiving email:', error)
      alert('Failed to archive email')
    }
  }, [thread, confirm, handleClose])

  const handleDelete = useCallback(async () => {
    if (!thread) return
    const result = await confirm({
      title: 'Delete Email',
      message: 'Delete this conversation permanently?',
      confirmLabel: 'Delete',
      variant: 'danger',
    })
    if (!result) return

    try {
      await Promise.all(
        thread.map((email) => emailInboundService.softDelete(email.id))
      )
      handleClose()
      window.dispatchEvent(new Event('email-deleted'))
    } catch (error) {
      console.error('Error deleting email:', error)
      alert('Failed to delete email')
    }
  }, [thread, confirm, handleClose])

  const handleToggleStar = useCallback(async (emailId: string) => {
    try {
      await emailInboundService.toggleStarred(emailId)
      // Refresh thread data - optimistic update could be added
      // For now, just close and let list refresh on reopen
    } catch (error) {
      console.error('Error toggling star:', error)
      alert('Failed to update star')
    }
  }, [])

  const handleMarkUnread = useCallback(async () => {
    if (!thread) return
    try {
      // Mark all emails in thread as unread
      await Promise.all(
        thread.map((email) => emailInboundService.markAsUnread(email.id))
      )
      handleClose()
      window.dispatchEvent(new Event('email-deleted')) // Reuse event to refresh
    } catch (error) {
      console.error('Error marking as unread:', error)
      alert('Failed to mark as unread')
    }
  }, [thread, handleClose])

  const handleMove = useCallback(() => {
    // TODO: Implement move to folder/label
    alert('Move functionality coming soon')
  }, [])

  const handleMore = useCallback(() => {
    // TODO: More options dropdown
    alert('More options coming soon')
  }, [])

  const handleReply = useCallback((emailId: string) => {
    navigate(`/compose?reply=${emailId}`)
    handleClose()
  }, [navigate, handleClose])

  const handleForward = useCallback((emailId: string) => {
    navigate(`/compose?forward=${emailId}`)
    handleClose()
  }, [navigate, handleClose])

  // Keyboard handler for ESC
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose()
    }
  }, [handleClose])

  if (!isOpen || !thread) return null

  const lastEmail = thread[0]

  // Toolbar button style
  const toolbarBtn = (Icon: React.ElementType, label: string, onClick?: () => void, disabled = false) => (
    <button
      onClick={onClick}
      title={label}
      disabled={disabled}
      className="p-2 rounded-full transition-colors disabled:opacity-40"
      style={{ backgroundColor: 'transparent', color: colors.textSecondary }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.backgroundColor = colors.surfaceHover }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <Icon size={20} />
    </button>
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className="fixed inset-4 md:inset-8 z-50 flex flex-col rounded-xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: colors.surface }}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* ── TOP TOOLBAR ── */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b gap-2"
          style={{ borderColor: colors.divider }}
        >
          {/* Left: Back + actions */}
          <div className="flex items-center gap-1">
            {toolbarBtn(ArrowLeft, 'Back', handleBack)}
            {toolbarBtn(Archive, 'Archive', handleArchive)}
            {toolbarBtn(Clock, 'Snooze', () => alert('Snooze coming soon'))}
            {toolbarBtn(Trash2, 'Delete', handleDelete)}
            {toolbarBtn(MailOpen, 'Mark as unread', handleMarkUnread)}
            {toolbarBtn(Move, 'Move to', handleMove)}
            {toolbarBtn(MoreVertical, 'More options', handleMore)}
          </div>

          {/* Right: Subject + close */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <h1
              className="text-lg font-medium truncate"
              style={{ color: colors.textPrimary }}
            >
              {lastEmail?.subject || '(No subject)'}
            </h1>
            <button
              onClick={handleClose}
              className="flex-shrink-0 p-1 rounded-full transition-colors"
              style={{ color: colors.textSecondary }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.surfaceHover}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              ✕
            </button>
          </div>

          {/* Spacer for centering */}
          <div className="w-16" /> {/* Balance layout */}
        </div>

        {/* ── EMAIL CONTENT ── */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header: sender info, date, actions */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-lg flex-shrink-0"
                  style={{ backgroundColor: colors.primary }}
                >
                  {(lastEmail?.senderName || lastEmail?.senderEmail)?.[0]?.toUpperCase()}
                </div>

                {/* Sender + date */}
                <div className="min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold" style={{ color: colors.textPrimary }}>
                      {lastEmail?.senderName || lastEmail?.senderEmail}
                    </span>
                    <span className="text-sm" style={{ color: colors.textSecondary }}>
                      &lt;{lastEmail?.senderEmail}&gt;
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>to me</span>
                    <span>•</span>
                    <span>{lastEmail ? format(new Date(lastEmail.receivedAt), 'PPPp') : ''}</span>
                  </div>
                </div>
              </div>

              {/* Actions bar (right side of header) */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggleStar(lastEmail.id)}
                  className="p-2 rounded-full transition-colors"
                  style={{ color: lastEmail?.isStarred ? '#f4b400' : colors.textSecondary }}
                  title={lastEmail?.isStarred ? 'Remove star' : 'Star'}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.surfaceHover}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                >
                  <Star size={20} fill={lastEmail?.isStarred ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={() => handleReply(lastEmail.id)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  style={{ backgroundColor: colors.primary, color: 'white' }}
                >
                  Reply
                </button>
                <button
                  onClick={() => handleForward(lastEmail.id)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
                  style={{ backgroundColor: colors.surfaceHover, color: colors.textPrimary, border: `1px solid ${colors.border}` }}
                >
                  Forward
                </button>
              </div>
            </div>

            {/* ── EMAIL BODY ── */}
            <div className="prose max-w-none" style={{ color: colors.textPrimary }}>
              {thread.map((email, idx) => (
                <div
                  key={email.id}
                  className={`${idx > 0 ? 'pt-6 mt-6 border-t' : ''}`}
                  style={{ borderColor: colors.divider }}
                >
                  {idx > 0 && (
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm flex-shrink-0"
                        style={{ backgroundColor: colors.primary + '80' }}
                      >
                        {(email.senderName || email.senderEmail)?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium" style={{ color: colors.textPrimary }}>
                          {email.senderName || email.senderEmail}
                        </p>
                        <p className="text-xs" style={{ color: colors.textTertiary }}>
                          {format(new Date(email.receivedAt), 'PPPp')}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Subject subheader for replies */}
                  {idx > 0 && email.subject && (
                    <div className="mb-4 pb-4" style={{ borderBottom: `1px solid ${colors.divider}` }}>
                      <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
                        {email.subject}
                      </p>
                    </div>
                  )}

                  {/* Attachments */}
                  {email.attachments && email.attachments.length > 0 && (
                    <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: colors.searchBackground }}>
                      <p className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>Attachments:</p>
                      <div className="flex flex-wrap gap-2">
                        {email.attachments.map((att, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm"
                            style={{ backgroundColor: colors.surface, color: colors.textPrimary, border: `1px solid ${colors.divider}` }}
                          >
                            📎 {att.filename}
                            <span style={{ color: colors.textTertiary }}>({(att.size / 1024).toFixed(1)} KB)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Body */}
                  <div className="email-body">
                    {email.bodyHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: email.bodyHtml }} />
                    ) : (
                      <div className="whitespace-pre-wrap">{email.bodyText}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmation && (
        <ConfirmationModal
          isOpen={confirmation.isOpen}
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel={confirmation.confirmLabel}
          cancelLabel={confirmation.cancelLabel}
          variant={confirmation.variant}
          onConfirm={confirmation.onConfirm}
          onCancel={confirmation.onCancel}
        />
      )}
    </>
  )
}
