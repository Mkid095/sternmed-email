import type { ReactNode } from 'react'
import clsx from 'clsx'
import { useTheme, radius, fontSize, layout } from '../../contexts/ThemeContext'
import { Button, IconButton } from '../ui/Button'

export interface ListHeaderProps {
  title: string
  /** Right-aligned supporting text, e.g. "3 unread". */
  meta?: ReactNode
  actions?: ReactNode
}

/** Fixed-height header shared by Inbox / Starred / Sent / Drafts. */
export function ListHeader({ title, meta, actions }: ListHeaderProps) {
  const { colors } = useTheme()
  return (
    <div
      className="flex items-center gap-4 flex-shrink-0"
      style={{
        height: 56,
        padding: '0 16px',
        borderBottom: `1px solid ${colors.divider}`,
        backgroundColor: colors.surface,
      }}
    >
      <div className="flex items-baseline gap-2.5 min-w-0">
        <h1
          className="font-semibold truncate"
          style={{ fontSize: fontSize.xl, color: colors.textPrimary, letterSpacing: '-0.015em' }}
        >
          {title}
        </h1>
        {meta && (
          <span className="text-sm truncate" style={{ color: colors.textTertiary }}>
            {meta}
          </span>
        )}
      </div>

      <div className="flex-1" />

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export interface SelectionToolbarProps {
  count: number
  onClear: () => void
  children: ReactNode
}

/** Replaces the header actions while rows are selected. */
export function SelectionToolbar({ count, onClear, children }: SelectionToolbarProps) {
  const { colors } = useTheme()
  return (
    <div
      className="flex items-center gap-3 flex-shrink-0"
      style={{
        height: 56,
        padding: '0 16px',
        borderBottom: `1px solid ${colors.divider}`,
        backgroundColor: colors.primary,
        animation: 'toast-in 120ms ease-out',
      }}
    >
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className="flex items-center justify-center cursor-pointer transition-colors"
        style={{
          width: 28,
          height: 28,
          borderRadius: radius.sm,
          color: '#ffffff',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.16)' }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <span className="font-semibold tabular" style={{ fontSize: fontSize.base, color: '#ffffff' }}>
        {count} selected
      </span>

      <div className="flex-1" />
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  )
}

/** Solid button styled for use on the coloured selection toolbar. */
export function ToolbarButton({
  onClick,
  icon,
  children,
  disabled,
}: {
  onClick: () => void
  icon: ReactNode
  children?: ReactNode
  disabled?: boolean
}) {
  const rest = 'rgba(255,255,255,0.14)'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex items-center gap-1.5 font-medium transition-colors',
        disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'
      )}
      style={{
        height: 32,
        padding: children ? '0 11px' : 0,
        width: children ? undefined : 32,
        justifyContent: 'center',
        borderRadius: radius.md,
        color: '#ffffff',
        fontSize: fontSize.sm,
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.backgroundColor = rest
      }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      {icon}
      {children}
    </button>
  )
}

export interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const { colors } = useTheme()
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center text-center"
      style={{ padding: '48px 24px' }}
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 60,
          height: 60,
          backgroundColor: colors.surfaceSubtle,
          color: colors.textTertiary,
          marginBottom: 18,
        }}
      >
        {icon}
      </div>
      <h2 className="font-semibold" style={{ fontSize: fontSize.lg, color: colors.textPrimary }}>
        {title}
      </h2>
      {description && (
        <p
          className="mt-1.5 max-w-sm"
          style={{ fontSize: fontSize.base, color: colors.textSecondary, lineHeight: 1.6 }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { colors } = useTheme()
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center text-center"
      style={{ padding: '48px 24px' }}
      role="alert"
    >
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 60,
          height: 60,
          backgroundColor: colors.errorBg,
          color: colors.error,
          marginBottom: 18,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v5M12 16.5v.01" />
        </svg>
      </div>
      <h2 className="font-semibold" style={{ fontSize: fontSize.lg, color: colors.textPrimary }}>
        Something went wrong
      </h2>
      <p
        className="mt-1.5 max-w-sm"
        style={{ fontSize: fontSize.base, color: colors.textSecondary, lineHeight: 1.6 }}
      >
        {message}
      </p>
      <div className="mt-5">
        <Button variant="primary" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </div>
  )
}

/** "Load more" footer with a busy state. */
export function LoadMore({
  onClick,
  loading,
  hasMore,
  shown,
  total,
}: {
  onClick: () => void
  loading: boolean
  hasMore: boolean
  shown: number
  total: number
}) {
  const { colors } = useTheme()
  if (!hasMore && shown === 0) return null

  return (
    <div
      className="flex flex-col items-center justify-center gap-2 flex-shrink-0"
      style={{ padding: '20px 16px 28px' }}
    >
      {hasMore ? (
        <>
          <Button variant="secondary" size="sm" onClick={onClick} loading={loading}>
            {loading ? 'Loading' : 'Load more'}
          </Button>
          <span className="tabular" style={{ fontSize: fontSize.xs, color: colors.textTertiary }}>
            Showing {shown} of {total}
          </span>
        </>
      ) : (
        <span className="tabular" style={{ fontSize: fontSize.xs, color: colors.textTertiary }}>
          {shown} email{shown === 1 ? '' : 's'}
          {total > shown ? ` of ${total}` : ''}
        </span>
      )}
    </div>
  )
}

export { IconButton, layout }