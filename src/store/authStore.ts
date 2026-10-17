import { create } from 'zustand'
import { auth, signIn, signOut, changePassword as firebaseChangePassword } from '../config/firebase'
import { supabase, User } from '../config/supabase'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'
import { AuthFlowError } from '../lib/authErrors'

/** How long to wait for the post-sign-in profile lookup before giving up. */
const PROFILE_LOOKUP_TIMEOUT_MS = 12_000

/**
 * Resolve once the auth listener has either loaded a profile or definitively
 * failed to.
 *
 * `sinceEpoch` is the listener-invocation counter captured *before*
 * signIn. Polling the store's `initialized` flag instead looked reasonable and
 * was wrong: the listener fires once on app boot with nobody signed in, so
 * `initialized` is already true when the form is submitted. The store then
 * still reads `{ firebaseUser: null, user: null, initialized: true }` —
 * indistinguishable from a session that had genuinely ended — and every
 * successful sign-in threw "your session ended" on the first iteration,
 * before the listener had processed the new credentials.
 *
 * Counting listener invocations separates "nothing has happened yet" from "the
 * listener ran and found no user".
 */
async function waitForProfile(sinceEpoch: number): Promise<void> {
  const deadline = Date.now() + PROFILE_LOOKUP_TIMEOUT_MS

  while (Date.now() < deadline) {
    const state = useAuthStore.getState()

    // Signed in and fully resolved.
    if (state.user && state.emailAliasId) return

    // The listener has not processed this sign-in yet. Keep waiting.
    if (state.sessionEpoch <= sinceEpoch) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      continue
    }

    // The listener ran and the profile lookup failed. Surface its cause
    // rather than a generic message.
    if (state.profileError) {
      throw state.profileError
    }

    // Signed in, profile still resolving — keep waiting. Falling through to
    // the "no user" branch here is what made every sign-in report a dead
    // session during the Supabase round trip.
    if (state.firebaseUser) {
      await new Promise((resolve) => setTimeout(resolve, 60))
      continue
    }

    // The listener ran and found no user: the session genuinely ended.
    throw new AuthFlowError(
      'session-ended',
      'Your session ended before the mailbox could be loaded. Please sign in again.'
    )
  }

  throw new AuthFlowError(
    'profile-timeout',
    'Signing in took longer than expected and we could not load your mailbox. Please try again.',
    { retryable: true }
  )
}

interface AuthState {
  user: User | null
  firebaseUser: FirebaseUser | null
  emailAliasId: string | undefined
  emailAlias: any | null
  loading: boolean
  initialized: boolean
  /**
   * Why the mailbox profile lookup failed, when it did.
   *
   * Previously this was discarded: the listener just left `user` null and the
   * guard redirected to /login, so a missing mailbox and an unreachable
   * Supabase looked identical — a signed-in user bounced back with no message.
   * Retaining the cause lets the login screen explain what actually happened.
   */
  profileError: unknown | null
  /**
   * Increments on every `onAuthStateChanged` invocation.
   *
   * Gives `waitForProfile` a way to tell "the listener has not run for this
   * sign-in yet" from "the listener ran and found nobody signed in" — the
   * `initialized` flag cannot, because it is already true from app boot.
   */
  sessionEpoch: number
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  setUser: (user: User | null) => void
  setEmailAliasId: (aliasId: string | undefined) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  firebaseUser: null,
  emailAliasId: undefined,
  emailAlias: null,
  loading: true,
  initialized: false,
  profileError: null,
  sessionEpoch: 0,

  initialize: async () => {
    const { initialized } = get()
    if (initialized) return

    // Set up persistent auth state listener
    onAuthStateChanged(auth, async (firebaseUser) => {
      // Publish the identity BEFORE the Supabase lookup.
      //
      // Advancing the epoch alone was not enough: `firebaseUser` used to be
      // written only after `await supabase...` resolved, so for the duration
      // of that round trip the store read `{ sessionEpoch: 1, firebaseUser:
      // null }`. waitForProfile saw the epoch advance, concluded the listener
      // had run and found nobody, and threw "your session ended" — every
      // successful sign-in, again.
      set((state) => ({
        sessionEpoch: state.sessionEpoch + 1,
        firebaseUser,
        profileError: null,
      }))

      if (firebaseUser) {
        // Fetch user profile from Supabase
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('firebase_uid', firebaseUser.uid)
          .single()

        if (data && !error) {
          set({
            firebaseUser,
            user: data as User,
            emailAliasId: data.email_alias_id || undefined,
            profileError: null,
            loading: false,
            initialized: true,
          })
        } else {
          // Firebase accepted the sign-in but the mailbox profile is missing
          // or unreadable. Record why — see `profileError`.
          set({
            firebaseUser,
            user: null,
            emailAliasId: undefined,
            profileError: error ?? new AuthFlowError(
              'no-profile',
              'No mailbox is linked to this account. Ask your administrator to assign an email alias.',
              { needsSupport: true }
            ),
            loading: false,
            initialized: true,
          })
        }
      } else {
        // No user signed in
        set({
          user: null,
          firebaseUser: null,
          emailAliasId: undefined,
          profileError: null,
          loading: false,
          initialized: true,
        })
      }
    })
  },

  login: async (email: string, password: string) => {
    // Captured before sign-in so waitForProfile knows which listener
    // invocations belong to this attempt.
    const epoch = get().sessionEpoch

    await signIn(email, password)

    // signIn resolves as soon as Firebase accepts the credentials, but the
    // mailbox profile is fetched afterwards by the onAuthStateChanged
    // listener. Returning here meant the login screen cleared its loading
    // state and showed success, then the route guard bounced straight back to
    // /login with nothing on screen to explain why — a silent dead end for
    // anyone whose profile lookup failed.
    //
    // Wait for the listener to settle instead, so every failure surfaces as a
    // real error the user can act on.
    await waitForProfile(epoch)
  },

  logout: async () => {
    await signOut()
    set({
      user: null,
      firebaseUser: null,
      emailAliasId: undefined,
      emailAlias: null,
      // Cleared so a stale failure cannot be shown on the next sign-in.
      profileError: null,
    })
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    await firebaseChangePassword(currentPassword, newPassword)
  },

  setUser: (user) => set({ user }),
  setEmailAliasId: (aliasId) => set({ emailAliasId: aliasId }),
}))
