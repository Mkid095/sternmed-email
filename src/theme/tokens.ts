/**
 * Design tokens
 *
 * Single source of truth for colour. The `ThemeColors` interface extends the
 * legacy `colors` shape that existing components already consume, so adding
 * tokens here is additive and never breaks a call site.
 *
 * Structure:
 *  - Neutral ramp   surfaces, borders, text
 *  - Brand          Sternmed Afrika navy
 *  - Semantic       success / warning / danger / info, each with a text + subtle bg
 *  - Sidebar        its own ramp so the rail reads as a distinct plane
 */

export type Theme = 'light' | 'dark'

export interface ThemeColors {
  // ── Legacy keys (kept for existing components) ────────────────
  background: string
  surface: string
  surfaceHover: string
  border: string
  textPrimary: string
  textSecondary: string
  textTertiary: string
  primary: string
  primaryHover: string
  accent: string
  searchBackground: string
  selected: string
  divider: string
  success: string
  error: string

  // ── Added tokens ──────────────────────────────────────────────
  /** Page background behind panels (the "canvas"). */
  canvas: string
  /** Panel that sits above the canvas and carries a shadow. */
  surfaceRaised: string
  /** Stronger border for inputs and dividers that must read clearly. */
  borderStrong: string

  /** Very low-contrast fill for chips and hover rows. */
  surfaceSubtle: string

  // Sidebar ramp
  sidebar: string
  sidebarHover: string
  sidebarActive: string
  sidebarText: string
  sidebarTextActive: string
  sidebarBorder: string

  // Semantic
  warning: string
  successBg: string
  errorBg: string
  warningBg: string
  infoBg: string

  /** Focus ring colour. */
  focusRing: string

  /** Drop shadow for menus, popovers and modals. */
  shadow: string
}

// ── Brand ────────────────────────────────────────────────────────
const BRAND = {
  primary: '#17487a',
  primaryHover: '#123a62',
  primarySubtle: '#e8f0f7',
  primarySubtleDark: '#1b3350',
  accent: '#f59e0b',
} as const

const SEMANTIC = {
  success: '#16a34a',
  error: '#dc2626',
  warning: '#d97706',
  info: '#0284c7',
} as const

export const lightColors: ThemeColors = {
  // Legacy
  background: '#ffffff',
  surface: '#ffffff',
  surfaceHover: '#f4f6f9',
  border: '#e3e8ef',
  textPrimary: '#0f172a',
  textSecondary: '#4b5768',
  textTertiary: '#8b97a8',
  primary: BRAND.primary,
  primaryHover: BRAND.primaryHover,
  accent: BRAND.accent,
  searchBackground: '#f4f6f9',
  selected: '#e8f0f7',
  divider: '#e3e8ef',
  success: SEMANTIC.success,
  error: SEMANTIC.error,

  // Added
  canvas: '#f6f8fb',
  surfaceRaised: '#ffffff',
  borderStrong: '#cfd7e3',
  surfaceSubtle: '#eef2f7',

  sidebar: '#ffffff',
  sidebarHover: '#f1f5f9',
  sidebarActive: '#e8f0f7',
  sidebarText: '#5a6675',
  sidebarTextActive: BRAND.primary,
  sidebarBorder: '#e8edf3',

  warning: SEMANTIC.warning,
  successBg: '#e9f7ef',
  errorBg: '#fdecec',
  warningBg: '#fdf4e6',
  infoBg: '#e8f4fb',

  focusRing: '#17487a',
  shadow:
    '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 12px -2px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.04)',
}

export const darkColors: ThemeColors = {
  // Legacy
  background: '#0f172a',
  surface: '#1e293b',
  surfaceHover: '#2b3a52',
  border: '#2b3a52',
  textPrimary: '#e8eef7',
  textSecondary: '#93a3b8',
  textTertiary: '#61748c',
  primary: BRAND.primary,
  primaryHover: BRAND.primaryHover,
  accent: BRAND.accent,
  searchBackground: '#1b2537',
  selected: '#1d3557',
  divider: '#2b3a52',
  success: '#34d399',
  error: '#f87171',

  // Added
  canvas: '#0b1220',
  surfaceRaised: '#1e293b',
  borderStrong: '#3d4d68',
  surfaceSubtle: '#243349',

  sidebar: '#0d1524',
  sidebarHover: '#1a2437',
  sidebarActive: '#1d3557',
  sidebarText: '#93a3b8',
  sidebarTextActive: '#ffffff',
  sidebarBorder: '#1c2739',

  warning: '#fbbf24',
  successBg: '#10331f',
  errorBg: '#3a1a1c',
  warningBg: '#3a2a10',
  infoBg: '#0f2c40',

  focusRing: '#4d9bdd',
  shadow:
    '0 1px 2px 0 rgb(0 0 0 / 0.3), 0 8px 24px -4px rgb(0 0 0 / 0.45), 0 2px 6px -2px rgb(0 0 0 / 0.3)',
}

export const getColors = (theme: Theme): ThemeColors =>
  theme === 'light' ? lightColors : darkColors

// ── Type scale ───────────────────────────────────────────────────
export const fontFamily = {
  sans: "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
} as const

export const fontSize = {
  xs: '11px',
  sm: '12.5px',
  base: '14px',
  md: '15px',
  lg: '17px',
  xl: '20px',
  '2xl': '26px',
} as const

// ── Spacing (4px base) ───────────────────────────────────────────
export const space = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
} as const

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const

// ── Layout constants ─────────────────────────────────────────────
export const layout = {
  topbarHeight: '60px',
  sidebarWidth: '248px',
  sidebarWidthCollapsed: '68px',
  /** Height of one email row in the list. */
  rowHeight: '60px',
  /**
   * Bottom navigation on small screens. Exported so routed views can reserve
   * the space — a message list that runs underneath it hides its last row.
   */
  bottomNavHeight: '62px',
  /**
   * The safe-area inset reserved below the bottom bar on notched devices.
   * Added to the bar's own height rather than padding every child.
   */
  safeAreaBottom: 'env(safe-area-inset-bottom, 0px)',
} as const