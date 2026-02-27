import { create } from 'zustand'
import { auth, signIn, signOut } from '../config/firebase'
import { supabase, User } from '../config/supabase'
import { onAuthStateChanged } from 'firebase/auth'

interface AuthState {
  user: User | null
  firebaseUser: any | null
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

    try {
      onAuthStateChanged(auth, async (firebaseUser) => {
        set({ firebaseUser, loading: true })

        if (firebaseUser) {
          // Fetch user profile from Supabase
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('firebase_uid', firebaseUser.uid)
            .single()

          if (data && !error) {
            set({
              user: data as User,
              emailAliasId: data.email_alias_id || undefined,
              loading: false,
              initialized: true,
            })
          } else {
            set({ user: null, loading: false, initialized: true })
          }
        } else {
          set({ user: null, emailAliasId: undefined, loading: false, initialized: true })
        }
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ loading: false, initialized: true })
    }
  },

  login: async (email: string, password: string) => {
    await signIn(email, password)
    const { initialize } = get()

    // Wait for user data to be loaded
    await new Promise(resolve => setTimeout(resolve, 500))
    await initialize()
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
