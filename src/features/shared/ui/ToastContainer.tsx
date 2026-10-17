import { useEffect } from 'react'
import { useTheme } from '../../../contexts/ThemeContext'
import { useToastStore, type Toast, type ToastVariant } from './toastStore'

const VARIANT_STYLES: Record<ToastVariant, { accent: string; icon: string }> = {
  success: { accent: '#16a34a', icon: '✓' },
  error: { accent: '#dc2626', icon: '!' },
  info: { accent: '#17487a', icon: 'i' },
}

interface ToastItemProps {
  toast: Toast
}

function ToastItem({ toast }: ToastItemProps) {
  const dismiss = useToastStore((state) => state.dismiss)
  const { colors } = useTheme()
  const { accent, icon } = VARIANT_STYLES[toast.variant]

  // Auto-dismiss. Errors stay longer because they usually need reading twice.
  useEffect(() => {
    if (toast.duration <= 0) return
    const timer = window.setTimeout(() => dismiss(toast.id), toast.duration)
    return () => window.clearTimeout(timer)
  }, [toast.id, toast.duration, dismiss])

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
      className="flex items-center gap-3 w-full px-4 py-3 rounded-lg shadow-lg border"
      style={{
        backgroundColor: colors.surfaceRaised,
        borderColor: colors.border,
      }}
    >
      <span
        aria-hidden="true"
        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
        style={{ backgroundColor: accent }}
      >
        {icon}
      </span>

      <p className="flex-1 text-sm leading-snug" style={{ color: colors.textPrimary }}>
        {toast.message}
      </p>

      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors"
        style={{ color: colors.textSecondary }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.surfaceHover }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

/**
 * Renders the global toast stack. Mount once, near the root of the layout.
 */
export default function ToastContainer() {
  const toasts = useToastStore((state) => state.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 w-[360px] max-w-[calc(100vw-3rem)]"
      // Enter animation
      style={{ animation: 'toast-in 180ms ease-out' }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}