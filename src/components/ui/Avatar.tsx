import { forwardRef } from 'react'
import clsx from 'clsx'
import { useTheme, radius } from '../../contexts/ThemeContext'

/**
 * Deterministic avatar colour derived from the address, so the same person
 * always gets the same swatch across sessions and views.
 */
const PALETTE = [
  { bg: '#17487a', fg: '#ffffff' },
  { bg: '#0f766e', fg: '#ffffff' },
  { bg: '#7c2d92', fg: '#ffffff' },
  { bg: '#b45309', fg: '#ffffff' },
  { bg: '#1d4ed8', fg: '#ffffff' },
  { bg: '#9d174d', fg: '#ffffff' },
  { bg: '#3f6212', fg: '#ffffff' },
  { bg: '#5b21b6', fg: '#ffffff' },
]

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0 // force 32-bit
  }
  return Math.abs(hash)
}

export function avatarColors(seed: string) {
  return PALETTE[hashString(seed) % PALETTE.length]
}

function initialsFrom(value: string): string {
  const cleaned = value.trim()
  if (!cleaned) return '?'

  // Prefer the local part of an email, so "john.smith@x.com" -> "JS".
  const local = cleaned.split('@')[0] ?? cleaned
  const parts = local.split(/[._-]+/).filter(Boolean)

  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return local.slice(0, 2).toUpperCase()
}

export interface AvatarProps {
  /** Email address, display name or any stable string. */
  name: string
  size?: number
  className?: string
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  { name, size = 32, className },
  ref
) {
  const { colors } = useTheme()
  const { bg, fg } = avatarColors(name)

  return (
    <span
      ref={ref}
      aria-hidden="true"
      title={name}
      className={clsx(
        'inline-flex items-center justify-center flex-shrink-0 font-semibold uppercase select-none',
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.38)),
        letterSpacing: '0.02em',
        backgroundColor: bg,
        color: fg,
        borderRadius: radius.full,
      }}
    >
      {initialsFrom(name)}
    </span>
  )
})

/** Small unread/new dot used on nav items and rows. */
export function Dot({ color }: { color?: string }) {
  const { colors } = useTheme()
  return (
    <span
      aria-hidden="true"
      className="inline-block rounded-full flex-shrink-0"
      style={{ width: 8, height: 8, backgroundColor: color ?? colors.primary }}
    />
  )
}