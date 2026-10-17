import clsx from 'clsx'
import { useTheme, radius } from '../../contexts/ThemeContext'

/**
 * Loading placeholder. The previous UI showed a blank white panel while the
 * first page of emails fetched, which read as "broken" rather than "loading".
 */

export interface SkeletonProps {
  width?: string | number
  height?: string | number
  radius?: string
  className?: string
}

export function Skeleton({ width, height = 12, radius: r = radius.sm, className }: SkeletonProps) {
  const { colors } = useTheme()
  return (
    <span
      aria-hidden="true"
      className={clsx('block', className)}
      style={{
        width,
        height,
        borderRadius: r,
        backgroundColor: colors.surfaceSubtle,
        backgroundImage: `linear-gradient(90deg, transparent, ${colors.surfaceHover}, transparent)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
      }}
    />
  )
}

/** Placeholder rows matching the height and rhythm of the email list. */
export function SkeletonRows({ count = 8 }: { count?: number }) {
  const { colors } = useTheme()

  return (
    <div role="status" aria-label="Loading emails" className="flex flex-col">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-6"
          style={{ height: 60, borderBottom: `1px solid ${colors.divider}` }}
        >
          <Skeleton width={36} height={36} radius={radius.full} />
          <div className="flex-1 flex flex-col gap-2">
            {/* Vary widths so the block does not read as a repeating pattern. */}
            <Skeleton width={`${45 + ((i * 13) % 30)}%`} height={11} />
            <Skeleton width={`${65 + ((i * 9) % 25)}%`} height={9} />
          </div>
          <Skeleton width={52} height={10} />
        </div>
      ))}
      <span className="sr-only">Loading emails…</span>
    </div>
  )
}

/** Placeholder for a single line of body copy. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  const { colors } = useTheme()
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={11}
          width={i === lines - 1 ? '60%' : `${92 - ((i * 7) % 18)}%`}
        />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}