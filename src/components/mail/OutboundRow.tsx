import { memo, useState } from 'react'
import clsx from 'clsx'
import { Paperclip, CheckCircle2, AlertCircle, Clock, FileEdit, ChevronDown } from 'lucide-react'
import type { EmailOutbound } from '../../types'
import { useTheme, fontSize, layout, radius } from '../../contexts/ThemeContext'
import { Avatar } from '../ui/Avatar'
import { IconButton } from '../ui/Button'
import { useIsDesktop } from '../../lib/useMediaQuery'

export interface OutboundRowProps {
  email: EmailOutbound
  /** Drafts get a different label and no status glyph. */
  variant: 'sent' | 'draft'
  selected?: boolean
  onOpen: (email: EmailOutbound) => void
  onToggleSelect?: (email: EmailOutbound) => void
  onToggleStar?: (email: EmailOutbound) => void
}

function stripTags(html?: string): string {
  if (!html) return ''
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildOutboundPreview(email: EmailOutbound, maxLength = 120): string {
  const raw = email.bodyText || stripTags(email.bodyHtml)

  // Sent mail can still carry markdown markers from when the compose screen
  // only had a plain textarea. Showing "**bold text**" in a list preview is
  // noise — the recipient saw formatting, not asterisks.
  const source = raw
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[>\s]*[-*+]\s+/gm, '')
    .replace(/^[>\s]*\d+[.)]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()

  return source.length > maxLength ? `${source.slice(0, maxLength).trimEnd()}…` : source
}

function formatSentDate(iso: string): string {
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

/** Recipients arrive comma-joined in a single column. */
function splitRecipients(value: string): string[] {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function RecipientSummary({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false)
  const { colors } = useTheme()
  const recipients = splitRecipients(value)

  if (recipients.length === 0) return <span style={{ color: colors.textTertiary }}>—</span>

  const primary = recipients[0]
  const overflow = recipients.length - 1

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="truncate" title={primary} style={{ color: colors.textPrimary }}>
          {primary}
        </span>
        {overflow > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
            className="flex items-center gap-0.5 flex-shrink-0 rounded px-1.5 cursor-pointer transition-colors"
            style={{
              fontSize: fontSize.xs,
              color: colors.primary,
              backgroundColor: colors.surfaceSubtle,
            }}
            aria-expanded={expanded}
            title={recipients.join(', ')}
          >
            +{overflow}
            <ChevronDown
              size={11}
              style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }}
            />
          </button>
        )}
      </div>

      {expanded && overflow > 0 && (
        <div
          className="mt-1 flex flex-col gap-0.5 rounded px-2 py-1.5"
          style={{ backgroundColor: colors.surfaceSubtle }}
        >
          {recipients.slice(1).map((entry) => (
            <span
              key={entry}
              className="truncate"
              style={{ fontSize: fontSize.xs, color: colors.textSecondary }}
              title={entry}
            >
              {entry}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusGlyph({ status }: { status: EmailOutbound['status'] }) {
  const { colors } = useTheme()

  const map = {
    sent: { Icon: CheckCircle2, color: colors.success, label: 'Sent' },
    failed: { Icon: AlertCircle, color: colors.error, label: 'Failed' },
    pending: { Icon: Clock, color: colors.textTertiary, label: 'Pending' },
  } as const

  const { Icon, color, label } = map[status] ?? map.pending

  return (
    <span title={label} aria-label={label} className="flex items-center justify-center">
      <Icon size={16} style={{ color }} />
    </span>
  )
}

function OutboundRowInner({
  email,
  variant,
  selected,
  onOpen,
  onToggleSelect,
  onToggleStar,
}: OutboundRowProps) {
  const { colors } = useTheme()
  const isDesktop = useIsDesktop()

  const preview = buildOutboundPreview(email)
  const attachmentCount = email.attachments?.length ?? 0
  const isDraft = variant === 'draft'
  const subject = email.subject?.trim() || (isDraft ? '(no subject)' : '(no subject)')

  const rowBackground = selected ? colors.selected : 'transparent'

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
    'aria-label': `${isDraft ? 'Draft' : 'Sent'}: ${subject}, to ${email.recipientEmail}`,
    className: 'cursor-pointer transition-colors duration-100 outline-none',
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
        aria-label={`Select ${subject}`}
        className="w-4 h-4 rounded cursor-pointer"
        style={{ accentColor: colors.primary }}
      />
    </label>
  ) : null

  const statusCell = !isDraft && onToggleStar ? (
    <IconButton
      label="More actions"
      size={30}
      onClick={(e) => {
        e.stopPropagation()
        onToggleStar(email)
      }}
    >
      <StatusGlyph status={email.status} />
    </IconButton>
  ) : (
    <span className="flex items-center justify-center w-[30px]">
      <StatusGlyph status={isDraft ? 'pending' : email.status} />
    </span>
  )

  // ── Phone ────────────────────────────────────────────────────────
  // Same reason as EmailRow: at 390px the seven-column grid left room for
  // the recipient only — subject, date and delivery status were all squeezed
  // to zero width.
  if (!isDesktop) {
    return (
      <div
        {...sharedRowProps}
        className={`${sharedRowProps.className} flex items-start`}
        style={{ ...sharedRowProps.style, padding: '10px 14px', gap: 10 }}
      >
        {onToggleSelect && <div className="pt-1 flex-shrink-0">{checkbox}</div>}

        <div className="flex-shrink-0">
          <Avatar name={email.recipientEmail || 'draft'} size={32} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <RecipientSummary value={email.recipientEmail} />
            </div>

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
              style={{ fontSize: fontSize.xs, color: colors.textSecondary }}
            >
              {formatSentDate(email.sentAt ?? email.createdAt)}
            </span>

            <div className="flex-shrink-0 -mr-1">{statusCell}</div>
          </div>

          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span
              className="truncate flex-shrink-0 whitespace-nowrap"
              style={{
                fontSize: fontSize.sm,
                fontWeight: 500,
                color: colors.textPrimary,
                maxWidth: '62%',
              }}
              title={subject}
            >
              {isDraft && <FileEdit size={11} style={{ marginRight: 3, verticalAlign: -1 }} />}
              {subject}
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
      className={`${sharedRowProps.className} grid items-start`}
      style={{
        ...sharedRowProps.style,
        minHeight: layout.rowHeight,
        padding: '10px 16px',
        gridTemplateColumns: '28px 40px minmax(150px, 200px) 1fr 76px 92px 36px',
        columnGap: 10,
      }}
    >
      {/* Select */}
      <div className="flex items-center justify-center pt-2">{checkbox}</div>

      {/* Avatar */}
      <div className="flex items-center justify-center pt-0.5">
        <Avatar name={email.recipientEmail || 'draft'} size={32} />
      </div>

      {/* Recipient */}
      <div className="min-w-0 pt-0.5">
        <RecipientSummary value={email.recipientEmail} />
      </div>

      {/* Subject + preview */}
      <div className="min-w-0 pt-0.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <span
            className="truncate flex-shrink-0"
            style={{ fontSize: fontSize.base, fontWeight: 500, color: colors.textPrimary, maxWidth: '55%' }}
            title={subject}
          >
            {isDraft && <FileEdit size={12} style={{ marginRight: 4, verticalAlign: -1 }} />}
            {subject}
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

      {/* Attachments */}
      <div className="flex items-center justify-end gap-1 pt-1 tabular" style={{ color: colors.textTertiary }}>
        {attachmentCount > 0 && (
          <>
            <Paperclip size={13} aria-hidden="true" />
            <span style={{ fontSize: fontSize.xs }}>{attachmentCount}</span>
          </>
        )}
      </div>

      {/* Date */}
      <div
        className="tabular text-right pt-1"
        style={{ fontSize: fontSize.sm, color: colors.textSecondary }}
      >
        {formatSentDate(email.sentAt ?? email.createdAt)}
      </div>

      {/* Status / star */}
      <div className="flex items-center justify-center pt-0.5">{statusCell}</div>
    </div>
  )
}

export const OutboundRow = memo(OutboundRowInner)