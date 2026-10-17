/**
 * Normalised authentication errors.
 *
 * Sign-in can fail in three different systems, and each reports differently:
 *
 *   Firebase   throws `FirebaseError` with a `code` like "auth/invalid-credential".
 *   Supabase   rejects with a PostgREST error object: `{ code, message, details }`,
 *              e.g. PGRST116 when `.single()` matches no row.
 *   This app   raises its own failures — no mailbox assigned, account inactive —
 *              which the store throws as `AuthFlowError`.
 *
 * Left unhandled, all three surfaced as `err.message` in the UI, which meant the
 * user saw raw strings like "Firebase: Error (auth/invalid-credential)." or a
 * silent bounce to the login screen when the Supabase profile lookup came back
 * empty. This module maps all of them to one shape the UI can render.
 */

export type AuthErrorSource = 'firebase' | 'supabase' | 'app' | 'network' | 'unknown'

export interface NormalisedAuthError {
  /** Stable identifier, useful for analytics and tests. */
  code: string
  source: AuthErrorSource
  /** Short heading for the error panel. */
  title: string
  /** One sentence the user can act on. */
  message: string
  /** True when the same attempt may succeed shortly, so a retry is sensible. */
  retryable: boolean
  /** True when the fix is out of the user's hands (contact an admin). */
  needsSupport: boolean
}

/** Thrown by the auth store for app-level failures the UI should explain. */
export class AuthFlowError extends Error {
  readonly code: string
  readonly retryable: boolean
  readonly needsSupport: boolean

  constructor(
    code: string,
    message: string,
    options: { retryable?: boolean; needsSupport?: boolean } = {}
  ) {
    super(message)
    this.name = 'AuthFlowError'
    this.code = code
    this.retryable = options.retryable ?? false
    this.needsSupport = options.needsSupport ?? false
  }
}

type Mapping = Omit<NormalisedAuthError, 'source'>

/**
 * Firebase Auth error codes.
 *
 * `invalid-credential`, `user-not-found` and `wrong-password` deliberately share
 * one message: telling a caller which of the three occurred turns the login
 * form into an account-enumeration oracle.
 */
const FIREBASE_CODES: Record<string, Mapping> = {
  'auth/invalid-credential': {
    code: 'invalid-credential',
    title: 'Could not sign you in',
    message: 'That email and password combination was not recognised. Check for typos, or reset your password.',
    retryable: false,
    needsSupport: false,
  },
  'auth/user-not-found': {
    code: 'invalid-credential',
    title: 'Could not sign you in',
    message: 'That email and password combination was not recognised. Check for typos, or reset your password.',
    retryable: false,
    needsSupport: false,
  },
  'auth/wrong-password': {
    code: 'invalid-credential',
    title: 'Could not sign you in',
    message: 'That email and password combination was not recognised. Check for typos, or reset your password.',
    retryable: false,
    needsSupport: false,
  },
  'auth/invalid-email': {
    code: 'invalid-email',
    title: 'Check the email address',
    message: 'That does not look like a valid email address.',
    retryable: false,
    needsSupport: false,
  },
  'auth/user-disabled': {
    code: 'user-disabled',
    title: 'Account disabled',
    message: 'This account has been disabled. Please contact your administrator.',
    retryable: false,
    needsSupport: true,
  },
  'auth/too-many-requests': {
    code: 'too-many-requests',
    title: 'Too many attempts',
    message: 'You have tried to sign in too many times. Wait a minute, then try again.',
    retryable: true,
    needsSupport: false,
  },
  'auth/network-request-failed': {
    code: 'network',
    title: 'No connection',
    message: 'We could not reach the authentication service. Check your connection and try again.',
    retryable: true,
    needsSupport: false,
  },
  'auth/operation-not-allowed': {
    code: 'operation-not-allowed',
    title: 'Sign-in unavailable',
    message: 'Email and password sign-in is not enabled for this project.',
    retryable: false,
    needsSupport: true,
  },
  'auth/requires-recent-login': {
    code: 'requires-recent-login',
    title: 'Please sign in again',
    message: 'For security, sign in once more before continuing.',
    retryable: true,
    needsSupport: false,
  },
}

/** PostgREST codes that mean something specific during the profile lookup. */
const SUPABASE_CODES: Record<string, Mapping> = {
  // .single() with no matching row
  PGRST116: {
    code: 'no-profile',
    title: 'No mailbox found for this account',
    message:
      'Your sign-in worked, but no mailbox is linked to it yet. Ask your administrator to assign an email alias.',
    retryable: false,
    needsSupport: true,
  },
  // RLS / permission denied
  '42501': {
    code: 'permission-denied',
    title: 'Access denied',
    message: 'This account is not permitted to read its mailbox. Please contact your administrator.',
    retryable: false,
    needsSupport: true,
  },
}

const GENERIC: Mapping = {
  code: 'unknown',
  title: 'Something went wrong',
  message: 'We could not complete that request. Please try again in a moment.',
  retryable: true,
  needsSupport: false,
}

function isPostgrestShape(err: unknown): err is { code?: string; message?: string; details?: string } {
  return typeof err === 'object' && err !== null && 'code' in err && typeof (err as { code?: unknown }).code === 'string'
}

/** Map any thrown value onto the shape the login UI renders. */
export function normaliseAuthError(err: unknown): NormalisedAuthError {
  // 1. Our own app-level errors.
  if (err instanceof AuthFlowError) {
    return {
      code: err.code,
      source: 'app',
      title: 'Sign-in incomplete',
      message: err.message,
      retryable: err.retryable,
      needsSupport: err.needsSupport,
    }
  }

  // 2. Firebase — always exposes a `code` string.
  if (typeof err === 'object' && err !== null) {
    const code = (err as { code?: unknown }).code
    if (typeof code === 'string' && code.startsWith('auth/')) {
      const mapping = FIREBASE_CODES[code] ?? {
        ...GENERIC,
        code,
        title: 'Could not sign you in',
        message: 'Authentication failed unexpectedly. Please try again.',
      }
      return { ...mapping, source: 'firebase' }
    }
  }

  // 3. Supabase / PostgREST.
  if (isPostgrestShape(err) && err.code) {
    const mapping = SUPABASE_CODES[err.code]
    if (mapping) return { ...mapping, source: 'supabase' }
    return {
      code: err.code,
      source: 'supabase',
      title: 'Could not load your mailbox',
      message: 'We signed you in but could not load your mailbox details. Please try again.',
      retryable: true,
      needsSupport: false,
    }
  }

  // 4. Network-level failures that never reached an SDK.
  const message = err instanceof Error ? err.message : String(err ?? '')
  if (/failed to fetch|networkerror|load failed|econnrefused/i.test(message)) {
    return {
      code: 'network',
      source: 'network',
      title: 'No connection',
      message: 'We could not reach the server. Check your connection and try again.',
      retryable: true,
      needsSupport: false,
    }
  }

  // 5. Anything else. Deliberately does NOT surface the raw message: SDK
  // internals leak project ids and endpoint names. The original value is
  // logged by the caller instead.
  void message
  return { ...GENERIC, source: 'unknown' }
}