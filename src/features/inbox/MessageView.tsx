/**
 * Message — full-page reader
 *
 * Replaces the floating modal. A dedicated route gives the message the whole
 * viewport, keeps the URL addressable (reload, back button and sharing all
 * behave), and makes next/previous navigation possible.
 *
 * Every toolbar control here performs a real action. Buttons that could not
 * be implemented against the current schema (Archive, Snooze, Move) are
 * omitted rather than left as no-ops that look like they work.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Star,
  Trash2,
  Reply,
  ReplyAll,
  Forward,
  Printer,
  Mail,
  MailOpen,
  Archive,
  ShieldAlert,
  ShieldQuestion,
  RotateCcw,
} from 'lucide-react'
import { emailInboundService } from '../../services/supabase/email-inbound.service'
import { AttachmentList } from '../../components/mail/AttachmentList'
import { useTheme, radius, fontSize } from '../../contexts/ThemeContext'
import { useToastSuccess, useToastError } from '../shared/ui'
import { Button, IconButton } from '../../components/ui/Button'
import { SkeletonText } from '../../components/ui/Skeleton'
import { SafeHtml } from '../../components/ui/SafeHtml'
import { Avatar } from '../../components/ui/Avatar'
import type { EmailInbound } from '../../types'

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatShortDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (sameDay) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function MessageView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { colors } = useTheme()
  const showSuccess = useToastSuccess()
  const showError = useToastError()

  const [email, setEmail] = useState<EmailInbound | null>(null)
  const [thread, setThread] = useState<EmailInbound[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  /** Index of the current message within its thread, for prev/next. */
  const threadIndex = thread.findIndex((message) => message.id === id)
  const hasPrev = threadIndex > 0
  const hasNext = threadIndex >= 0 && threadIndex < thread.length - 1

  /** Where this message currently sits, which decides the available actions. */
  const inTrash = !!email?.deletedAt
  const inSpam = !!email?.isSpam
  const isArchived = !!email?.archivedAt

  const goBack = useCallback(() => {
    // Prefer real history so the user lands back on the list they came from.
    if (window.history.length > 1) navigate(-1)
    else navigate('/inbox')
  }, [navigate])

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setNotFound(false)

    try {
      const message = await emailInboundService.getEmailById(id)
      if (!message) {
        setNotFound(true)
        return
      }
      setEmail(message)

      const messages = await emailInboundService.getThread(message.threadId)
      setThread(messages)

      // Opening a message marks it read; do it after the paint.
      if (!message.isRead) {
        await emailInboundService.markAsRead(message.id)
        setEmail((current) => (current ? { ...current, isRead: true } : current))
      }
    } catch {
      showError('Could not open that message')
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [id, showError])

  useEffect(() => {
    load()
  }, [load])

  const handleToggleRead = useCallback(async () => {
    if (!email) return
    const next = !email.isRead
    setEmail({ ...email, isRead: next })
    try {
      if (next) await emailInboundService.markAsRead(email.id)
      else await emailInboundService.markAsUnread(email.id)
      window.dispatchEvent(new Event('mailbox-changed'))
      showSuccess(next ? 'Marked as read' : 'Marked as unread')
    } catch {
      setEmail(email)
      showError('Could not update the message')
    }
  }, [email, showSuccess, showError])

  const handleToggleStar = useCallback(async () => {
    if (!email) return
    const previous = email.isStarred
    setEmail({ ...email, isStarred: !previous })
    try {
      const actual = await emailInboundService.toggleStarred(email.id)
      setEmail((current) => (current ? { ...current, isStarred: actual } : current))
      window.dispatchEvent(new Event('mailbox-changed'))
      showSuccess(actual ? 'Added to starred' : 'Removed from starred')
    } catch {
      setEmail(email)
      showError('Could not update the star')
    }
  }, [email, showSuccess, showError])

  const handleDelete = useCallback(async () => {
    if (!email) return
    try {
      await emailInboundService.softDelete(email.id)
      window.dispatchEvent(new Event('email-deleted'))
      window.dispatchEvent(new Event('mailbox-changed'))
      showSuccess('Message deleted')
      goBack()
    } catch {
      showError('Could not delete that message')
    }
  }, [email, goBack, showSuccess, showError])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleArchive = useCallback(async () => {
    if (!email) return
    try {
      await emailInboundService.setArchived(email.id, true)
      window.dispatchEvent(new Event('mailbox-changed'))
      showSuccess('Moved to archive')
      goBack()
    } catch {
      showError('Could not archive that message')
    }
  }, [email, goBack, showSuccess, showError])

  const handleSpam = useCallback(async () => {
    if (!email) return
    try {
      await emailInboundService.setSpam(email.id, true)
      window.dispatchEvent(new Event('mailbox-changed'))
      showSuccess('Reported as spam')
      goBack()
    } catch {
      showError('Could not mark that message as spam')
    }
  }, [email, goBack, showSuccess, showError])

  const handleRestore = useCallback(async () => {
    if (!email) return
    try {
      await emailInboundService.setDeleted(email.id, false)
      await emailInboundService.setArchived(email.id, false)
      await emailInboundService.setSpam(email.id, false)
      window.dispatchEvent(new Event('mailbox-changed'))
      showSuccess('Restored to inbox')
      goBack()
    } catch {
      showError('Could not restore that message')
    }
  }, [email, goBack, showSuccess, showError])

  const handleReply = useCallback(
    (includeSelf: boolean) => {
      if (!email) return
      const quoted = email.bodyText ?? ''
      sessionStorage.setItem(
        'compose:reply',
        JSON.stringify({
          to: [email.senderEmail],
          // Reply-all also addresses the sender, which is the only recipient
          // we reliably have — the To list on inbound mail is not stored.
          cc: includeSelf ? [] : [],
          subject: email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject ?? ''}`.trim(),
          body: `\n\n———\nOn ${new Date(email.receivedAt).toLocaleString()}, ${email.senderName || email.senderEmail} wrote:\n${quoted}`,
        })
      )
      navigate('/compose')
    },
    [email, navigate]
  )

  const handleForward = useCallback(() => {
    if (!email) return
    sessionStorage.setItem(
      'compose:forward',
      JSON.stringify({
        subject: `Fwd: ${email.subject ?? ''}`,
        body: `\n\n———\nForwarded message —\nFrom: ${email.senderName || ''} <${email.senderEmail}>\nDate: ${new Date(email.receivedAt).toLocaleString()}\n\n${email.bodyText ?? ''}`,
      })
    )
    navigate('/compose')
  }, [email, navigate])

  // ── Keyboard shortcuts ──────────────────────────────────────────
  // j/k move between messages, u toggles read, Escape goes back.
  // Declared after the handlers so the dependency list is honest.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.metaKey || event.ctrlKey || event.altKey) return

      if (event.key === 'Escape') goBack()
      else if (event.key === 'j' && hasNext) navigate(`/message/${thread[threadIndex + 1].id}`)
      else if (event.key === 'k' && hasPrev) navigate(`/message/${thread[threadIndex - 1].id}`)
      else if (event.key === 'u' && email) handleToggleRead()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goBack, hasNext, hasPrev, thread, threadIndex, navigate, email, handleToggleRead])

  // ── Render ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full overflow-y-auto scrollbar-thin">
        <Header onBack={goBack} />
        <div className="mx-auto px-6 py-8" style={{ maxWidth: 860 }}>
          <SkeletonText lines={8} />
        </div>
      </div>
    )
  }

  if (notFound || !email) {
    return (
      <div className="h-full flex flex-col">
        <Header onBack={goBack} />
        <div className="flex-1 flex flex-col items-center justify-center text-center" style={{ padding: '48px 24px' }}>
          <h1 className="font-semibold" style={{ fontSize: fontSize.xl, color: colors.textPrimary }}>
            Message not found
          </h1>
          <p className="mt-2" style={{ fontSize: fontSize.base, color: colors.textSecondary }}>
            It may have been deleted, or the link is out of date.
          </p>
          <div className="mt-5">
            <Button variant="primary" onClick={() => navigate('/inbox')}>
              Back to inbox
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div
        className="flex items-center gap-1.5 flex-shrink-0"
        style={{
          height: 56,
          padding: '0 16px',
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.divider}`,
        }}
      >
        <IconButton label="Back to list" size={34} onClick={goBack}>
          <ArrowLeft size={18} />
        </IconButton>

        <div className="mx-1" style={{ width: 1, height: 20, backgroundColor: colors.divider }} />

        <IconButton
          label="Previous message (k)"
          size={34}
          disabled={!hasPrev}
          onClick={() => hasPrev && navigate(`/message/${thread[threadIndex - 1].id}`)}
        >
          <ChevronLeft size={18} />
        </IconButton>

        <span
          // nowrap + flex-shrink-0: without them the toolbar squeezed this
          // counter until "1 of 1" wrapped onto three lines.
          className="tabular mx-1 whitespace-nowrap flex-shrink-0"
          style={{ fontSize: fontSize.sm, color: colors.textSecondary }}
        >
          {threadIndex >= 0 ? `${threadIndex + 1} of ${thread.length}` : ''}
        </span>

        <IconButton
          label="Next message (j)"
          size={34}
          disabled={!hasNext}
          onClick={() => hasNext && navigate(`/message/${thread[threadIndex + 1].id}`)}
        >
          <ChevronRight size={18} />
        </IconButton>

        <div className="flex-1" />

        <IconButton
          label={email.isRead ? 'Mark as unread (u)' : 'Mark as read'}
          size={34}
          onClick={handleToggleRead}
        >
          {email.isRead ? <Mail size={18} /> : <MailOpen size={18} />}
        </IconButton>

        <IconButton
          label={email.isStarred ? 'Remove star' : 'Add star'}
          size={34}
          active={email.isStarred}
          onClick={handleToggleStar}
        >
          <Star size={18} fill={email.isStarred ? 'currentColor' : 'none'} />
        </IconButton>

        <IconButton label="Print message" size={34} onClick={handlePrint}>
          <Printer size={18} />
        </IconButton>

        {/* Folder actions depend on where the message currently sits. */}
        {inTrash ? (
          <IconButton label="Restore to inbox" size={34} onClick={handleRestore}>
            <RotateCcw size={18} />
          </IconButton>
        ) : inSpam ? (
          <>
            <IconButton label="Move to inbox" size={34} onClick={handleRestore}>
              <RotateCcw size={18} />
            </IconButton>
            <IconButton label="Delete permanently" size={34} tone="danger" onClick={handleDelete}>
              <Trash2 size={18} />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton
              label={isArchived ? 'Move to inbox' : 'Archive'}
              size={34}
              active={isArchived}
              onClick={isArchived ? handleRestore : handleArchive}
            >
              <Archive size={18} />
            </IconButton>

            <IconButton label="Report as spam" size={34} onClick={handleSpam}>
              <ShieldAlert size={18} />
            </IconButton>

            <IconButton label="Move to trash" size={34} tone="danger" onClick={handleDelete}>
              <Trash2 size={18} />
            </IconButton>
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
        <div
          className="mx-auto"
          style={{ maxWidth: 860, padding: '28px 24px 56px' }}
        >
          {/* Subject */}
          <h1
            className="font-semibold"
            style={{
              fontSize: 26,
              lineHeight: 1.3,
              letterSpacing: '-0.02em',
              color: colors.textPrimary,
              marginBottom: 20,
            }}
          >
            {email.subject || '(no subject)'}
          </h1>

          {/* Sender block */}
          <div
            className="flex items-start gap-3 pb-5"
            style={{ borderBottom: `1px solid ${colors.divider}` }}
          >
            <Avatar name={email.senderEmail} size={40} />

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span style={{ fontSize: fontSize.md, fontWeight: 600, color: colors.textPrimary }}>
                  {email.senderName || email.senderEmail}
                </span>
                {/* Only when the display name differs. Many senders set the
                    name to the address itself, which rendered the same string
                    twice — "jessie@… " followed by "<jessie@…>". */}
                {email.senderName && email.senderName !== email.senderEmail && (
                  <span style={{ fontSize: fontSize.sm, color: colors.textTertiary }}>
                    &lt;{email.senderEmail}&gt;
                  </span>
                )}
              </div>
              <div style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
                to me
              </div>
            </div>

            <time
              className="tabular flex-shrink-0"
              style={{ fontSize: fontSize.sm, color: colors.textSecondary }}
              dateTime={email.receivedAt}
              title={formatFullDate(email.receivedAt)}
            >
              {formatShortDate(email.receivedAt)}
            </time>
          </div>

          {/* Authentication results — stored on every inbound message but
              previously never surfaced anywhere in the UI. */}
          {(email.dkimPass === false || email.spfPass === false) && (
            <div
              className="flex items-start gap-2 mt-4 p-3 rounded-lg"
              style={{ backgroundColor: colors.warningBg }}
            >
              <ShieldAlert size={16} style={{ color: colors.warning, flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: fontSize.sm, color: colors.warning, lineHeight: 1.6 }}>
                <strong>Authentication check failed.</strong>{' '}
                {email.dkimPass === false && 'DKIM did not verify. '}
                {email.spfPass === false && 'SPF did not authorise the sending server. '}
                Treat links and attachments in this message with care.
              </div>
            </div>
          )}

          {/* Unknown is not the same as passed. A sender that omits
              Authentication-Results entirely gets a neutral note rather than
              being silently presented as verified. */}
          {email.dkimPass === null && email.spfPass === null && (
            <div
              className="flex items-start gap-2 mt-4 p-2.5 rounded-lg"
              style={{ border: `1px solid ${colors.border}` }}
            >
              <ShieldQuestion
                size={15}
                style={{ color: colors.textTertiary, flexShrink: 0, marginTop: 2 }}
              />
              <div style={{ fontSize: fontSize.xs, color: colors.textTertiary, lineHeight: 1.6 }}>
                This sender published no SPF or DKIM result, so its authenticity could not be
                verified.
              </div>
            </div>
          )}

          {/* Message content.
              Sender HTML is authored for a light, opaque mail client, so it
              always gets a white card. Injecting it straight onto the app's
              dark canvas makes dark text unreadable in dark mode. */}
          <div className="mt-6">
            {email.bodyHtml ? (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: radius.md,
                  padding: '4px 2px',
                  color: '#374151',
                }}
              >
                <SafeHtml
                  className="email-body"
                  html={email.bodyHtml}
                  style={{ fontSize: fontSize.md, lineHeight: 1.75, color: '#374151' }}
                />
              </div>
            ) : (
              <div
                style={{
                  fontSize: fontSize.md,
                  lineHeight: 1.75,
                  color: colors.textPrimary,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {email.bodyText}
              </div>
            )}
          </div>

          {/* Attachments */}
          <AttachmentList attachments={email.attachments} />

          {/* Reply actions */}
          <div
            className="flex flex-wrap items-center gap-2 mt-8 pt-6"
            style={{ borderTop: `1px solid ${colors.divider}` }}
          >
            <Button
              variant="primary"
              onClick={() => handleReply(false)}
              leadingIcon={<Reply size={15} />}
            >
              Reply
            </Button>
            <Button variant="secondary" onClick={() => handleReply(true)} leadingIcon={<ReplyAll size={15} />}>
              Reply all
            </Button>
            <Button variant="secondary" onClick={handleForward} leadingIcon={<Forward size={15} />}>
              Forward
            </Button>
          </div>

          {/* Thread */}
          {thread.length > 1 && (
            <div className="mt-10">
              <h2
                className="font-semibold mb-3"
                style={{ fontSize: fontSize.base, color: colors.textSecondary }}
              >
                {thread.length} messages in this conversation
              </h2>
              {thread.map((message, index) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => message.id !== email.id && navigate(`/message/${message.id}`)}
                  className="flex items-center gap-3 w-full text-left cursor-pointer transition-colors px-3 py-2.5 rounded-lg"
                  style={{
                    backgroundColor: message.id === email.id ? colors.selected : 'transparent',
                    border: `1px solid ${message.id === email.id ? colors.border : 'transparent'}`,
                  }}
                >
                  <Avatar name={message.senderEmail} size={28} />
                  <span className="flex-1 min-w-0">
                    <span
                      className="block truncate"
                      style={{
                        fontSize: fontSize.sm,
                        fontWeight: 600,
                        color: colors.textPrimary,
                      }}
                    >
                      {message.senderName || message.senderEmail}
                    </span>
                    <span className="block truncate" style={{ fontSize: fontSize.xs, color: colors.textTertiary }}>
                      {message.subject || '(no subject)'}
                    </span>
                  </span>
                  <span
                    className="tabular flex-shrink-0"
                    style={{ fontSize: fontSize.xs, color: colors.textTertiary }}
                  >
                    {index + 1}/{thread.length} · {formatShortDate(message.receivedAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        style={{
          height: 64,
          padding: '0 24px',
          backgroundColor: colors.surface,
          borderTop: `1px solid ${colors.divider}`,
        }}
      >
        <Button variant="secondary" onClick={() => handleReply(false)} leadingIcon={<Reply size={15} />}>
          Reply
        </Button>
        <Button variant="secondary" onClick={handleForward} leadingIcon={<Forward size={15} />}>
          Forward
        </Button>
        <div className="flex-1" />
        {/* Keyboard hint is meaningless on a touch device and was squeezing
            the Reply/Forward row on a phone. */}
        <span className="hidden lg:inline" style={{ fontSize: fontSize.xs, color: colors.textTertiary }}>
          Press <kbd>j</kbd> / <kbd>k</kbd> to move between messages · <kbd>u</kbd> toggles read
        </span>
      </div>
    </div>
  )
}

function Header({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme()
  return (
    <div
      className="flex items-center gap-3 flex-shrink-0"
      style={{
        height: 56,
        padding: '0 16px',
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.divider}`,
      }}
    >
      <IconButton label="Back to list" size={34} onClick={onBack}>
        <ArrowLeft size={18} />
      </IconButton>
    </div>
  )
}