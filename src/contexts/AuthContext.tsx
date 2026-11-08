import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  sendOTP: (phone: string) => Promise<void>
  verifyOTP: (phone: string, token: string) => Promise<void>
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

  const sendOTP = async (phone: string) => {
    if (!supabase) {
      // Mock: just accept any phone number in dev
      if (!phone) {
        throw new Error('Phone number is required')
      }
      return
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone,
    })
    if (error) throw error
  }

  const verifyOTP = async (phone: string, token: string) => {
    if (!supabase) {
      // Mock: create mock user with phone
      window.localStorage.setItem(MOCK_USER_EMAIL_KEY, phone)
      setUser(createMockUser(phone))
      setSession(null)
      return
    }

    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    })
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
    <AuthContext.Provider value={{ user, session, loading, sendOTP, verifyOTP, signOut }}>
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
