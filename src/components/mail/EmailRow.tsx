import { memo } from 'react'
import clsx from 'clsx'
import { Star, Paperclip } from 'lucide-react'
import type { EmailInbound } from '../../types'
import { useTheme, radius, fontSize, layout } from '../../contexts/ThemeContext'
import { Avatar } from '../ui/Avatar'
import { IconButton } from '../ui/Button'
import { useIsDesktop } from '../../lib/useMediaQuery'

export interface EmailRowProps {
  email: EmailInbound
  selected?: boolean
  onOpen: (email: EmailInbound) => void
  onToggleSelect?: (email: EmailInbound) => void
  onToggleStar?: (email: EmailInbound) => void
}

/** Collapse whitespace and strip tags for the one-line preview. */
export function buildPreview(email: EmailInbound, maxLength = 160): string {
  const source = email.bodyText || email.bodyHtml || ''
  const text = source
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()

  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text
}

export function formatRowDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  if (sameDay(date, now)) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000)
  if (diffDays < 7) {
    return date.toLocaleDateString('en-GB', { weekday: 'short' })
  }

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: date.getFullYear() === now.getFullYear() ? 'short' : 'short',
    year: date.getFullYear() === now.getFullYear() ? undefined : '2-digit',
  })
}

function EmailRowInner({ email, selected, onOpen, onToggleSelect, onToggleStar }: EmailRowProps) {
  const { colors } = useTheme()
  const isDesktop = useIsDesktop()

  const isUnread = !email.isRead
  const senderLabel = email.senderName || email.senderEmail
  // Only show a second line when the display name differs from the address,
  // otherwise the row renders the same string twice.
  const senderSecondary =
    email.senderName && email.senderName !== email.senderEmail ? email.senderEmail : null
  const preview = buildPreview(email)
  const attachmentCount = email.attachments?.length ?? 0
  const displaySubject = email.subject?.trim() || '(no subject)'

  const rowBackground = selected
    ? colors.selected
    : isUnread
      ? colors.surfaceSubtle
      : 'transparent'

  const sharedRowProps = {
    role: 'row' as const,
    tabIndex: 0,
    onClick: () => onOpen(email),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onOpen(email)
      }
    },
    'aria-label': `${isUnread ? 'Unread. ' : ''}${displaySubject}, from ${senderLabel}`,
    className: 'cursor-pointer transition-colors duration-100 group outline-none',
    style: {
      borderBottom: `1px solid ${colors.divider}`,
      backgroundColor: rowBackground,
    },
    onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
      if (!selected) e.currentTarget.style.backgroundColor = colors.surfaceHover
    },
    onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
      e.currentTarget.style.backgroundColor = rowBackground
    },
  }

  const checkbox = onToggleSelect ? (
    <label
      className="flex items-center justify-center cursor-pointer transition-opacity"
      style={{ opacity: selected ? 1 : 0.35 }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = selected ? '1' : '0.35' }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        checked={!!selected}
        onChange={() => onToggleSelect(email)}
        aria-label={`Select ${displaySubject}`}
        className="w-4 h-4 rounded cursor-pointer"
        style={{ accentColor: colors.primary, color: colors.primary }}
      />
    </label>
  ) : null

  const star = onToggleStar ? (
    <IconButton
      label={email.isStarred ? 'Remove star' : 'Add star'}
      size={30}
      active={email.isStarred}
      onClick={(e) => {
        e.stopPropagation()
        onToggleStar(email)
      }}
    >
      <Star
        size={16}
        fill={email.isStarred ? 'currentColor' : 'none'}
        strokeWidth={2}
      />
    </IconButton>
  ) : null

  // ── Phone ────────────────────────────────────────────────────────
  // The seven-column desktop grid needs ~520px before it starts squeezing
  // the subject, so on a phone the row stacks instead: sender and date on the
  // first line, subject and preview on the second.
  if (!isDesktop) {
    return (
      <div
        {...sharedRowProps}
        className={`${sharedRowProps.className} flex items-start`}
        style={{ ...sharedRowProps.style, padding: '10px 14px', gap: 10 }}
      >
        {onToggleSelect && <div className="pt-1 flex-shrink-0">{checkbox}</div>}

        <div className="flex-shrink-0">
          <Avatar name={email.senderEmail} size={32} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="truncate flex-1"
              style={{
                fontSize: fontSize.base,
                fontWeight: isUnread ? 700 : 500,
                color: colors.textPrimary,
              }}
              title={senderLabel}
            >
              {senderLabel}
            </span>

            {attachmentCount > 0 && (
              <span
                className="flex items-center gap-0.5 flex-shrink-0 tabular"
                style={{ fontSize: fontSize.xs, color: colors.textTertiary }}
              >
                <Paperclip size={12} aria-hidden="true" />
                {attachmentCount}
              </span>
            )}

            <span
              className="tabular flex-shrink-0"
              style={{
                fontSize: fontSize.xs,
                color: isUnread ? colors.textPrimary : colors.textSecondary,
                fontWeight: isUnread ? 600 : 400,
              }}
            >
              {formatRowDate(email.receivedAt)}
            </span>

            <div className="flex-shrink-0 -mr-1">{star}</div>
          </div>

          <div className="flex items-baseline gap-1.5 mt-0.5">
            {isUnread && (
              <span
                aria-hidden="true"
                className="rounded-full flex-shrink-0"
                style={{ width: 6, height: 6, backgroundColor: colors.primary }}
              />
            )}
            <span
              className="truncate flex-shrink-0"
              style={{
                fontSize: fontSize.sm,
                fontWeight: isUnread ? 650 : 500,
                color: colors.textPrimary,
                maxWidth: '60%',
              }}
              title={displaySubject}
            >
              {displaySubject}
            </span>
            <span
              className="truncate flex-1"
              style={{ fontSize: fontSize.sm, color: colors.textTertiary }}
            >
              {preview ? `— ${preview}` : ''}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // ── Desktop ──────────────────────────────────────────────────────
  return (
    <div
      {...sharedRowProps}
      className={`${sharedRowProps.className} grid items-center`}
      style={{
        ...sharedRowProps.style,
        height: layout.rowHeight,
        padding: '0 16px',
        gridTemplateColumns: '28px 40px minmax(150px, 210px) 1fr 76px 92px 36px',
        columnGap: 10,
      }}
    >
      {/* Selection checkbox. Faint by default so the list stays calm, full
          strength on row hover — and never fully hidden, which made it
          unreachable on touch devices. */}
      <div className="flex items-center justify-center">{checkbox}</div>

      {/* Avatar */}
      <div className="flex items-center justify-center">
        <Avatar name={email.senderEmail} size={32} />
      </div>

      {/* Sender */}
      <div className="min-w-0 flex flex-col gap-0.5">
        <div
          className={clsx('truncate')}
          style={{
            fontSize: fontSize.base,
            fontWeight: isUnread ? 700 : 500,
            color: colors.textPrimary,
          }}
          title={senderLabel}
        >
          {senderLabel}
        </div>
        {senderSecondary && (
          <div
            className="truncate"
            style={{ fontSize: fontSize.xs, color: colors.textTertiary }}
            title={senderSecondary}
          >
            {senderSecondary}
          </div>
        )}
      </div>

      {/* Subject + preview */}
      <div className="min-w-0 flex items-center gap-2">
        {isUnread && (
          <span
            aria-hidden="true"
            className="rounded-full flex-shrink-0"
            style={{ width: 7, height: 7, backgroundColor: colors.primary }}
          />
        )}

        <div className="min-w-0 flex items-baseline gap-2 flex-1">
          <span
            className="truncate flex-shrink-0"
            style={{
              fontSize: fontSize.base,
              fontWeight: isUnread ? 650 : 500,
              color: colors.textPrimary,
              maxWidth: '52%',
            }}
            title={displaySubject}
          >
            {displaySubject}
          </span>
          <span
            className="truncate flex-1"
            style={{ fontSize: fontSize.sm, color: colors.textTertiary }}
            title={preview}
          >
            {preview ? `— ${preview}` : ''}
          </span>
        </div>
      </div>

      {/* Attachment count */}
      <div className="flex items-center justify-end gap-1 tabular" style={{ color: colors.textTertiary }}>
        {attachmentCount > 0 && (
          <>
            <Paperclip size={13} aria-hidden="true" />
            <span style={{ fontSize: fontSize.xs }}>{attachmentCount}</span>
          </>
        )}
      </div>

      {/* Date */}
      <div
        className="tabular text-right"
        style={{
          fontSize: fontSize.sm,
          color: isUnread ? colors.textPrimary : colors.textSecondary,
          fontWeight: isUnread ? 600 : 400,
        }}
      >
        {formatRowDate(email.receivedAt)}
      </div>

      {/* Star */}
      <div className="flex items-center justify-center">{star}</div>
    </div>
  )
}

export const EmailRow = memo(EmailRowInner)