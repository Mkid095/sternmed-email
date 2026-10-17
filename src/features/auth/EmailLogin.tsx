/**
 * Sign-in screen.
 *
 * Two-column on desktop: the brand panel explains the product, the right
 * column carries the form in its own scroll area so a short window or a long
 * error message never traps the submit button off-screen. On mobile the brand
 * panel is dropped and the form takes the full width.
 *
 * Error handling is the substantive part. `normaliseAuthError` collapses
 * Firebase, Supabase and app-level failures into one shape, because before this
 * the two most common failures were indistinguishable to the user:
 *
 *   * a wrong password showed the raw string
 *     "Firebase: Error (auth/invalid-credential)."
 *   * a valid password with no mailbox assigned, or an unreachable Supabase,
 *     produced a successful-looking sign-in followed by a silent bounce back to
 *     this screen with nothing explaining why.
 *
 * Both now render a specific, actionable message.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, AlertCircle, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { sendPasswordReset } from '../../config/firebase'
import { normaliseAuthError, type NormalisedAuthError } from '../../lib/authErrors'
import { useTheme, radius, fontSize } from '../../contexts/ThemeContext'
import { COMPANY } from '../../config/brand'
import { LoginAside } from './LoginAside'

export default function EmailLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<NormalisedAuthError | null>(null)

  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetState, setResetState] = useState<{
    status: 'idle' | 'loading' | 'sent'
    error: NormalisedAuthError | null
  }>({ status: 'idle', error: null })

  const { login, profileError } = useAuthStore()
  const navigate = useNavigate()
  const { colors } = useTheme()

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  /**
   * A profile failure recorded by the auth listener can arrive after this
   * component mounted (the guard bounces to /login, but the store keeps the
   * cause). Surfacing it here is what turns a silent redirect into an
   * explanation.
   */
  useEffect(() => {
    if (!profileError) return
    setError(normaliseAuthError(profileError))
  }, [profileError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    setError(null)
    setLoading(true)

    try {
      await login(email.trim(), password)
      // The route guard redirects once the store has a user and an alias;
      // navigating here would race it.
      navigate('/inbox', { replace: true })
    } catch (err) {
      // Keep the raw value in the console for diagnosis; never render it.
      console.error('[auth] sign-in failed:', err)
      setError(normaliseAuthError(err))
      passwordRef.current?.focus()
      passwordRef.current?.select()
    } finally {
      setLoading(false)
    }
  }

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetState({ status: 'loading', error: null })

    try {
      await sendPasswordReset(resetEmail.trim())
      setResetState({ status: 'sent', error: null })
    } catch (err) {
      console.error('[auth] password reset failed:', err)
      setResetState({ status: 'idle', error: normaliseAuthError(err) })
    }
  }

  const backToSignIn = () => {
    setResetMode(false)
    setResetState({ status: 'idle', error: null })
    setResetEmail('')
  }

  return (
    <div
      // h-screen + overflow-hidden, not min-h-screen: each column scrolls on
      // its own. With min-h-screen a tall aside grew the page and dragged the
      // form along, so the submit button could sit below the fold.
      className="h-screen flex overflow-hidden"
      style={{ backgroundColor: colors.canvas }}
    >
      <LoginAside />

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full" style={{ maxWidth: 400 }}>
            {/* Mobile-only brand header */}
            <div className="lg:hidden text-center mb-8">
              <div
                className="inline-flex items-center justify-center rounded-2xl mb-4"
                style={{ width: 56, height: 56, backgroundColor: colors.primary }}
              >
                <Mail size={26} style={{ color: '#ffffff' }} />
              </div>
              <p className="font-semibold" style={{ fontSize: fontSize.xl, color: colors.textPrimary }}>
                {COMPANY.brandName} Mail
              </p>
            </div>

            {resetMode ? (
              /* ── Password reset ─────────────────────────────────────── */
              <div>
                <button
                  type="button"
                  onClick={backToSignIn}
                  className="flex items-center gap-1.5 mb-5 cursor-pointer"
                  style={{ fontSize: fontSize.sm, color: colors.textSecondary }}
                >
                  <ArrowLeft size={15} />
                  Back to sign in
                </button>

                <h2
                  className="font-semibold mb-1.5"
                  style={{ fontSize: 24, color: colors.textPrimary }}
                >
                  Reset your password
                </h2>
                <p className="mb-6" style={{ fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 1.6 }}>
                  Enter your email address and we will send you a link to choose a new one.
                </p>

                {resetState.status === 'sent' ? (
                  <div
                    className="flex items-start gap-3 p-4 rounded-lg"
                    style={{ backgroundColor: colors.successBg }}
                    role="status"
                  >
                    <CheckCircle2 size={18} style={{ color: colors.success, flexShrink: 0, marginTop: 1 }} />
                    <div style={{ fontSize: fontSize.sm, color: colors.success, lineHeight: 1.6 }}>
                      <strong>Check your inbox.</strong>
                      <br />
                      If an account exists for that address, a reset link is on its way. It expires
                      after an hour.
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
                    {resetState.error && <AuthErrorPanel error={resetState.error} />}

                    <Field
                      id="resetEmail"
                      label="Email address"
                      icon={<Mail size={16} style={{ color: colors.textTertiary }} />}
                    >
                      <input
                        id="resetEmail"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        autoComplete="email"
                        required
                        placeholder="you@sternmedafrika.com"
                        className="w-full outline-none"
                        style={{
                          height: 44,
                          padding: '0 14px 0 40px',
                          borderRadius: radius.md,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.border}`,
                          color: colors.textPrimary,
                          fontSize: fontSize.base,
                        }}
                      />
                    </Field>

                    <button
                      type="submit"
                      disabled={resetState.status === 'loading' || !resetEmail.trim()}
                      className="w-full font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                      style={{
                        height: 44,
                        borderRadius: radius.md,
                        border: 'none',
                        backgroundColor: colors.primary,
                        color: '#ffffff',
                        fontSize: fontSize.base,
                      }}
                    >
                      {resetState.status === 'loading' ? 'Sending…' : 'Send reset link'}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* ── Sign in ───────────────────────────────────────────── */
              <div>
                <h2
                  className="font-semibold mb-1.5"
                  style={{ fontSize: 24, color: colors.textPrimary }}
                >
                  Sign in
                </h2>
                <p className="mb-6" style={{ fontSize: fontSize.sm, color: colors.textSecondary }}>
                  Access your {COMPANY.domain} mailbox.
                </p>

                {error && <AuthErrorPanel error={error} onRetry={error.retryable ? () => setError(null) : undefined} />}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                  <Field
                    id="email"
                    label="Email address"
                    icon={<Mail size={16} style={{ color: colors.textTertiary }} />}
                  >
                    <input
                      id="email"
                      ref={emailRef}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      required
                      disabled={loading}
                      placeholder="you@sternmedafrika.com"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? 'auth-error' : undefined}
                      className="w-full outline-none disabled:opacity-70"
                      style={{
                        height: 44,
                        padding: '0 14px 0 40px',
                        borderRadius: radius.md,
                        backgroundColor: colors.surface,
                        border: `1px solid ${error ? colors.error : colors.border}`,
                        color: colors.textPrimary,
                        fontSize: fontSize.base,
                      }}
                    />
                  </Field>

                  <Field
                    id="password"
                    label="Password"
                    icon={<Lock size={16} style={{ color: colors.textTertiary }} />}
                  >
                    <input
                      id="password"
                      ref={passwordRef}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                      disabled={loading}
                      placeholder="Enter your password"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? 'auth-error' : undefined}
                      className="w-full outline-none disabled:opacity-70"
                      style={{
                        height: 44,
                        // Right padding clears the visibility toggle.
                        padding: '0 44px 0 40px',
                        borderRadius: radius.md,
                        backgroundColor: colors.surface,
                        border: `1px solid ${error ? colors.error : colors.border}`,
                        color: colors.textPrimary,
                        fontSize: fontSize.base,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="absolute cursor-pointer"
                      style={{
                        right: 6,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 32,
                        height: 32,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: radius.sm,
                        border: 'none',
                        background: 'transparent',
                        color: colors.textSecondary,
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </Field>

                  <div className="text-right -mt-1">
                    <button
                      type="button"
                      onClick={() => setResetMode(true)}
                      className="font-medium cursor-pointer"
                      style={{ fontSize: fontSize.sm, color: colors.primary }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
                    style={{
                      height: 46,
                      marginTop: 4,
                      borderRadius: radius.md,
                      border: 'none',
                      backgroundColor: loading ? colors.primaryHover : colors.primary,
                      color: '#ffffff',
                      fontSize: fontSize.base,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    {loading && <Loader2 size={16} style={{ animation: 'spin 700ms linear infinite' }} />}
                    {loading ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>

                <p
                  className="text-center mt-8"
                  style={{ fontSize: fontSize.xs, color: colors.textTertiary }}
                >
                  {COMPANY.legalName.replace(/\.$/, '')} · {COMPANY.domain}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

/** Label + icon-anchored input wrapper. */
function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  const { colors } = useTheme()
  return (
    <div>
      <label
        htmlFor={id}
        className="block font-medium mb-1.5"
        style={{ fontSize: fontSize.sm, color: colors.textSecondary }}
      >
        {label}
      </label>
      <div className="relative">
        <span
          className="absolute flex items-center pointer-events-none"
          style={{ left: 14, top: '50%', transform: 'translateY(-50%)' }}
        >
          {icon}
        </span>
        {children}
      </div>
    </div>
  )
}

/**
 * Error panel. `role="alert"` so it is announced the moment it appears, and
 * `id="auth-error"` so the inputs can point aria-describedby at it.
 */
function AuthErrorPanel({
  error,
  onRetry,
}: {
  error: NormalisedAuthError
  onRetry?: () => void
}) {
  const { colors } = useTheme()

  return (
    <div
      id="auth-error"
      role="alert"
      className="flex items-start gap-3 p-3.5 rounded-lg mb-5"
      style={{ backgroundColor: colors.errorBg }}
    >
      <AlertCircle size={18} style={{ color: colors.error, flexShrink: 0, marginTop: 1 }} />
      <div className="min-w-0" style={{ fontSize: fontSize.sm, color: colors.error, lineHeight: 1.6 }}>
        <strong className="block" style={{ fontWeight: 600 }}>
          {error.title}
        </strong>
        <span>{error.message}</span>
        {error.needsSupport && (
          <span className="block mt-1.5">
            <a
              href={`mailto:${COMPANY.supportEmail}`}
              style={{ color: colors.error, textDecoration: 'underline', fontWeight: 500 }}
            >
              Contact support
            </a>
          </span>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1.5 font-semibold cursor-pointer"
            style={{ color: colors.error, textDecoration: 'underline', background: 'none', border: 'none', padding: 0 }}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}