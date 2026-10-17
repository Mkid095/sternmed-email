import { forwardRef, type ReactNode } from 'react'
import * as RDropdownMenu from '@radix-ui/react-dropdown-menu'
import { useTheme, radius, fontSize } from '../../contexts/ThemeContext'

/**
 * Styled wrappers over Radix DropdownMenu.
 *
 * Radix supplies the behaviour we would otherwise hand-roll and get wrong:
 * roving focus, Escape to close, arrow-key navigation, click-outside,
 * typeahead, and correct ARIA wiring.
 */

export const Menu = RDropdownMenu.Root
export const MenuTrigger = RDropdownMenu.Trigger
export const MenuGroup = RDropdownMenu.Group

interface MenuContentProps {
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  /** Menu width in px. */
  width?: number
  className?: string
}

export const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(function MenuContent(
  { children, align = 'end', sideOffset = 8, width = 232, className },
  ref
) {
  const { colors } = useTheme()

  return (
    <RDropdownMenu.Portal>
      <RDropdownMenu.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={12}
        className={className}
        style={{
          minWidth: width,
          padding: '6px',
          backgroundColor: colors.surfaceRaised,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          boxShadow: colors.shadow,
          zIndex: 9000,
          animation: 'toast-in 120ms ease-out',
          // Published as a custom property so menu items can highlight from
          // data-highlighted without needing theme-aware inline handlers.
          ['--menu-hover' as string]: colors.surfaceHover,
        }}
      >
        {children}
      </RDropdownMenu.Content>
    </RDropdownMenu.Portal>
  )
})

interface MenuItemProps {
  children: ReactNode
  onSelect?: () => void
  icon?: ReactNode
  /** Right-aligned hint text, e.g. the current theme. */
  hint?: string
  tone?: 'default' | 'danger'
  disabled?: boolean
}

export const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(function MenuItem(
  { children, onSelect, icon, hint, tone = 'default', disabled },
  ref
) {
  const { colors } = useTheme()
  const fg = tone === 'danger' ? colors.error : colors.textPrimary
  const iconColor = tone === 'danger' ? colors.error : colors.textSecondary

  return (
    <RDropdownMenu.Item
      ref={ref}
      disabled={disabled}
      onSelect={onSelect}
      className="menu-item flex items-center gap-3 cursor-pointer select-none outline-none transition-colors"
      style={{
        height: 36,
        padding: '0 10px',
        borderRadius: radius.md,
        fontSize: fontSize.base,
        color: fg,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {icon && (
        <span aria-hidden="true" className="flex items-center justify-center flex-shrink-0" style={{ color: iconColor }}>
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{children}</span>
      {hint && (
        <span className="text-xs flex-shrink-0" style={{ color: colors.textTertiary }}>
          {hint}
        </span>
      )}
    </RDropdownMenu.Item>
  )
})

export const MenuSeparator = () => {
  const { colors } = useTheme()
  return (
    <RDropdownMenu.Separator
      style={{ height: 1, backgroundColor: colors.divider, margin: '5px 0' }}
    />
  )
}

/** Non-interactive header block inside a menu (used for the profile summary). */
export function MenuHeader({ children }: { children: ReactNode }) {
  const { colors } = useTheme()
  return (
    <div style={{ padding: '10px 10px 12px' }}>
      <div
        style={{
          fontSize: fontSize.xs,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: colors.textTertiary,
          marginBottom: 6,
        }}
      >
        {children}
      </div>
    </div>
  )
}