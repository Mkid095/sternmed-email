import { create } from 'zustand'
import { auth, signIn, signOut } from '../config/firebase'
import { supabase, User } from '../config/supabase'
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth'

interface AuthState {
  user: User | null
  firebaseUser: FirebaseUser | null
  emailAliasId: string | undefined
  emailAlias: any | null
  loading: boolean
  initialized: boolean
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
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

  initialize: async () => {
    const { initialized } = get()
    if (initialized) return

    // Set up persistent auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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
            loading: false,
            initialized: true,
          })
        } else {
          // Firebase user exists but no Supabase profile
          set({
            firebaseUser,
            user: null,
            emailAliasId: undefined,
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
          loading: false,
          initialized: true,
        })
      }
    })

    // Return cleanup function (optional)
    return unsubscribe
  },

  login: async (email: string, password: string) => {
    // signIn will trigger onAuthStateChanged listener which updates the store
    await signIn(email, password)
    // No need to call initialize - the persistent listener handles it
  },

  logout: async () => {
    await signOut()
    set({
      user: null,
      firebaseUser: null,
      emailAliasId: undefined,
      emailAlias: null,
    })
  },

  setUser: (user) => set({ user }),
  setEmailAliasId: (aliasId) => set({ emailAliasId: aliasId }),
}))
