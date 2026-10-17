import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import clsx from 'clsx'
import { useTheme, radius, fontSize } from '../../contexts/ThemeContext'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type Size = 'xs' | 'sm' | 'md' | 'lg'

const SIZE: Record<Size, { height: string; padding: string; font: string; gap: string }> = {
  xs: { height: '28px', padding: '0 8px', font: fontSize.sm, gap: '4px' },
  sm: { height: '32px', padding: '0 12px', font: fontSize.base, gap: '6px' },
  md: { height: '38px', padding: '0 16px', font: fontSize.base, gap: '8px' },
  lg: { height: '44px', padding: '0 20px', font: fontSize.md, gap: '8px' },
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  /** Stretch to the width of the container. */
  block?: boolean
  /** Shows a spinner and blocks interaction. */
  loading?: boolean
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    block,
    loading,
    leadingIcon,
    trailingIcon,
    className,
    children,
    disabled,
    ...rest
  },
  ref
) {
  const { colors } = useTheme()
  const s = SIZE[size]

  const surface: Record<Variant, { bg: string; bgHover: string; fg: string; border: string }> = {
    primary: { bg: colors.primary, bgHover: colors.primaryHover, fg: '#ffffff', border: 'transparent' },
    secondary: { bg: colors.surface, bgHover: colors.surfaceHover, fg: colors.textPrimary, border: colors.border },
    ghost: { bg: 'transparent', bgHover: colors.surfaceHover, fg: colors.textSecondary, border: 'transparent' },
    subtle: { bg: colors.surfaceSubtle, bgHover: colors.surfaceHover, fg: colors.textPrimary, border: 'transparent' },
    danger: { bg: colors.error, bgHover: colors.error, fg: '#ffffff', border: 'transparent' },
  }

  const v = surface[variant]
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type="button"
      disabled={isDisabled}
      className={clsx(
        'inline-flex items-center justify-center font-medium whitespace-nowrap select-none',
        'transition-colors duration-150',
        block && 'w-full',
        isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className
      )}
      style={{
        height: s.height,
        padding: s.padding,
        gap: s.gap,
        fontSize: s.font,
        backgroundColor: v.bg,
        color: v.fg,
        border: `1px solid ${v.border}`,
        borderRadius: radius.md,
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) e.currentTarget.style.backgroundColor = v.bgHover
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = v.bg
      }}
      {...rest}
    >
      {loading ? <Spinner color={v.fg} /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  )
})

function Spinner({ color }: { color: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ animation: 'spin 700ms linear infinite', color }}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Square edge length. Defaults to 36. */
  size?: number
  variant?: 'ghost' | 'solid' | 'danger'
  /** Required: icon-only controls carry no visible text. */
  label: string
  /** Renders a filled background — use for the active/selected state. */
  active?: boolean
  tone?: 'default' | 'danger'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { size = 36, variant = 'ghost', label, active, tone = 'default', className, children, disabled, ...rest },
  ref
) {
  const { colors } = useTheme()

  const isDanger = tone === 'danger'
  const restBg = active ? colors.selected : variant === 'solid' ? colors.surfaceSubtle : 'transparent'
  const restFg = active
    ? colors.primary
    : variant === 'solid'
      ? colors.textSecondary
      : isDanger
        ? colors.textSecondary
        : colors.textSecondary
  const hoverBg = variant === 'solid' ? colors.surfaceHover : colors.surfaceHover
  const hoverFg = active ? colors.primary : isDanger ? colors.error : colors.textPrimary

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center flex-shrink-0 transition-colors duration-150',
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer',
        className
      )}
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: restBg,
        color: restFg,
        border: 'none',
        padding: 0,
      }}
      onMouseEnter={(e) => {
        if (disabled) return
        e.currentTarget.style.backgroundColor = hoverBg
        e.currentTarget.style.color = hoverFg
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = restBg
        e.currentTarget.style.color = restFg
      }}
      {...rest}
    >
      {children}
    </button>
  )
})