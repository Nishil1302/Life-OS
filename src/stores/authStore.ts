import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { User } from '../types'

interface AuthState {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, name: string) => Promise<string | null>
  signInWithGoogle: () => Promise<string | null>
  signOut: () => Promise<void>
  init: () => Promise<void>
}

function mapUser(u: { id: string; email?: string; user_metadata?: Record<string, string> }): User {
  return {
    id: u.id,
    email: u.email ?? '',
    full_name: u.user_metadata?.full_name ?? u.user_metadata?.name,
    avatar_url: u.user_metadata?.avatar_url ?? u.user_metadata?.picture,
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  setUser: (user) => set({ user }),

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({
      user: session?.user ? mapUser(session.user) : null,
      loading: false,
    })

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ? mapUser(session.user) : null })
    })
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  },

  signUp: async (email, password, name) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })
    return error?.message ?? null
  },

  signInWithGoogle: async () => {
    // redirectTo must match exactly what is set in:
    //   Supabase Dashboard → Auth → URL Configuration → Redirect URLs
    //   Google Cloud Console → OAuth 2.0 → Authorized redirect URIs
    const redirectTo = `${window.location.origin}/auth/callback`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    return error?.message ?? null
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },
}))
