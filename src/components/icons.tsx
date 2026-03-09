import React from 'react'

interface IconProps {
  className?: string
  style?: React.CSSProperties
  size?: number
}

export const HamburgerIcon: React.FC<IconProps> = ({ className, style, size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
  </svg>
)

export const SearchIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} style={style}>
    <circle cx="11" cy="11" r="7"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

export const FilterIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} style={style}>
    <line x1="4" y1="6" x2="20" y2="6"/>
    <line x1="7" y1="12" x2="17" y2="12"/>
    <line x1="10" y1="18" x2="14" y2="18"/>
  </svg>
)

export const HelpIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} style={style}>
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
    <circle cx="12" cy="17" r="1" fill="currentColor"/>
  </svg>
)

export const SettingsIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
)

export const AppsIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <rect x="3" y="3" width="4" height="4" rx="0.5"/>
    <rect x="10" y="3" width="4" height="4" rx="0.5"/>
    <rect x="17" y="3" width="4" height="4" rx="0.5"/>
    <rect x="3" y="10" width="4" height="4" rx="0.5"/>
    <rect x="10" y="10" width="4" height="4" rx="0.5"/>
    <rect x="17" y="10" width="4" height="4" rx="0.5"/>
    <rect x="3" y="17" width="4" height="4" rx="0.5"/>
    <rect x="10" y="17" width="4" height="4" rx="0.5"/>
    <rect x="17" y="17" width="4" height="4" rx="0.5"/>
  </svg>
)

export const ComposeIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
  </svg>
)

export const InboxIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H5v-2h14v2zm0-4H5v-2h14v2zm0-4H5V7h14v2z"/>
  </svg>
)

export const StarIcon: React.FC<IconProps & { filled?: boolean }> = ({ className, style, filled }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className={className} style={style}>
    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
  </svg>
)

export const SnoozedIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/>
  </svg>
)

export const SentIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
)

export const DraftsIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H5c-.55 0-1-.45-1-1V7l8 5 8-5v10c0 .55-.45 1-1 1zm-7-7L4 6h16l-8 5z"/>
  </svg>
)

export const ChevronDownIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M7 10l5 5 5-5z"/>
  </svg>
)

export const CloseIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
)

export const LabelIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M17.63 5.84C17.27 5.33 16.67 5 16 5L5 5.01C3.9 5.01 3 5.9 3 7v10c0 1.1.9 1.99 2 1.99L16 19c.67 0 1.27-.33 1.63-.84L22 12l-4.37-6.16zM14 5h-2l2-2v6l-2 4h-2l-2-4V5h2l2 2v6l-2 4h-2l-2-4V5h2l-2 2-2-2v-2l2-2zm-7 8.65c-.8.44-1.36.36-1.78.16C3.63 10.64 3 10.04 3 9.35V7.65c.34-.7.63-1.3 1.22-1.74l2.29-1.6V11.5c-.54.36-1.04.8-1.13 1.5-.09-.7-.59-1.14-1.13-1.5v-1.6l2.29 1.6c.59.44.88 1.04 1.22 1.74V9.35c0-.69-.63-1.29-1.19-1.5-.42-.2-.98-.28-1.78-.16l-2.97 1.94V11.5l2.97-1.94z"/>
  </svg>
)

export const MoreIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
  </svg>
)

export const PaperclipIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
  </svg>
)

export const SendIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
)

export const TrashIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
)

export const ArchiveIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4v4h-4z"/>
  </svg>
)

export const MarkUnreadIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
  </svg>
)

export const MenuIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7h18V6H3v2z"/>
  </svg>
)

export const LogOutIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16,17 21,12 16,7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

export const MailIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12z"/>
  </svg>
)

export const ChevronRightIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
  </svg>
)

export const SunIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)

export const MoonIcon: React.FC<IconProps> = ({ className, style }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)
