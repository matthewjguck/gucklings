import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, displayName?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const MOCK_USER_EMAIL_KEY = 'capstone.mock.user.email'

function createMockUser(email: string) {
  return {
    id: 'mock-user',
    aud: 'authenticated',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    created_at: new Date(0).toISOString(),
    email,
  } as User
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (supabase || typeof window === 'undefined') {
      return null
    }

    const email = window.localStorage.getItem(MOCK_USER_EMAIL_KEY)
    return email ? createMockUser(email) : null
  })
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))

  useEffect(() => {
    if (!supabase) {
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!supabase) {
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      window.localStorage.setItem(MOCK_USER_EMAIL_KEY, email)
      setUser(createMockUser(email))
      setSession(null)
      return
    }

    const trimmed = displayName?.trim()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: trimmed ? { data: { display_name: trimmed } } : undefined,
    })
    if (error) throw error
  }

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      if (!email || !password) {
        throw new Error('Email and password are required')
      }

      window.localStorage.setItem(MOCK_USER_EMAIL_KEY, email)
      setUser(createMockUser(email))
      setSession(null)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    if (!supabase) {
      window.localStorage.removeItem(MOCK_USER_EMAIL_KEY)
      setUser(null)
      setSession(null)
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
