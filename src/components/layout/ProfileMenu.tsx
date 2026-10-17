import { useNavigate } from 'react-router-dom'
import { Settings, User, LogOut, Sun, Moon, ShieldCheck, Palette } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useTheme, radius, fontSize } from '../../contexts/ThemeContext'
import { Avatar } from '../ui/Avatar'
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuHeader,
  MenuTrigger,
} from '../ui/Menu'
import { useToastError } from '../../features/shared/ui'

export interface ProfileMenuProps {
  onSignOut: () => void
}

/**
 * Account menu triggered by the avatar in the top bar.
 *
 * Radix handles the interaction layer: focus trapping, Escape, arrow-key
 * navigation, click-outside and correct menu semantics.
 */
export default function ProfileMenu({ onSignOut }: ProfileMenuProps) {
  const navigate = useNavigate()
  const { user, emailAliasId } = useAuthStore()
  const { theme, setTheme, colors } = useTheme()
  const showError = useToastError()

  const handleSignOut = () => {
    onSignOut()
  }

  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          aria-label="Account menu"
          title="Account"
          className="rounded-full transition-transform duration-150 cursor-pointer"
          style={{
            padding: 2,
            // A ring on hover signals "this opens something".
            outline: `2px solid transparent`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.outlineColor = colors.borderStrong }}
          onMouseLeave={(e) => { e.currentTarget.style.outlineColor = 'transparent' }}
        >
          <Avatar name={user?.email ?? 'account'} size={32} />
        </button>
      </MenuTrigger>

      <MenuContent width={264}>
        {/* Identity summary — the detail the user asked to see on click. */}
        <div
          className="flex items-center gap-3"
          style={{ padding: '10px 10px 12px' }}
        >
          <Avatar name={user?.email ?? 'account'} size={42} />
          <div className="min-w-0 flex-1">
            <div
              className="truncate font-semibold"
              style={{ fontSize: fontSize.base, color: colors.textPrimary }}
            >
              {user?.email?.split('@')[0] ?? 'Account'}
            </div>
            <div
              className="truncate"
              style={{ fontSize: fontSize.sm, color: colors.textSecondary }}
              title={user?.email}
            >
              {user?.email ?? ''}
            </div>
            <div
              className="inline-flex items-center gap-1 mt-1.5"
              style={{
                fontSize: fontSize.xs,
                color: colors.textTertiary,
                backgroundColor: colors.surfaceSubtle,
                padding: '2px 7px',
                borderRadius: radius.full,
              }}
            >
              <ShieldCheck size={11} />
              {user?.role === 'email_user' ? 'Mailbox account' : (user?.role ?? 'user')}
            </div>
          </div>
        </div>

        <MenuSeparator />

        <MenuItem
          icon={<User size={16} />}
          onSelect={() => navigate('/settings')}
        >
          Profile &amp; alias
        </MenuItem>

        <MenuItem
          icon={<Settings size={16} />}
          onSelect={() => navigate('/settings')}
        >
          Settings
        </MenuItem>

        <MenuSeparator />

        <MenuHeader>Appearance</MenuHeader>

        <MenuItem
          icon={<Sun size={16} />}
          hint={theme === 'light' ? '✓' : undefined}
          onSelect={() => setTheme('light')}
        >
          Light theme
        </MenuItem>
        <MenuItem
          icon={<Moon size={16} />}
          hint={theme === 'dark' ? '✓' : undefined}
          onSelect={() => setTheme('dark')}
        >
          Dark theme
        </MenuItem>

        <MenuSeparator />

        <MenuItem
          tone="danger"
          icon={<LogOut size={16} />}
          onSelect={handleSignOut}
        >
          Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}