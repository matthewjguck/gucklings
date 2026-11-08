import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (phone: string, passcode: string) => Promise<void>
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

  const signIn = async (phone: string, passcode: string) => {
    if (!supabase) {
      // Mock: accept any phone + passcode in dev
      if (!phone || !passcode) {
        throw new Error('Phone and passcode are required')
      }
      window.localStorage.setItem(MOCK_USER_EMAIL_KEY, phone)
      setUser(createMockUser(phone))
      setSession(null)
      return
    }

    // Normalize phone number: add +1 if not present
    let normalizedPhone = phone.trim()
    if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+1' + normalizedPhone.replace(/\D/g, '')
    }

    // Verify phone + passcode against database
    const { data, error: queryError } = await supabase
      .from('profiles')
      .select('id, phone_number, passcode_hash')
      .eq('phone_number', normalizedPhone)
      .single()

    if (queryError || !data) {
      throw new Error('Phone number not found. Contact your family to be added.')
    }

    // Simple passcode verification (in production, use bcrypt)
    // For now, comparing plaintext - should be hashed in real implementation
    if (data.passcode_hash !== passcode) {
      throw new Error('Incorrect passcode')
    }

    // Sign in with Supabase using their ID
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: `${normalizedPhone}@gucklings.local`,
      password: passcode,
    })
    if (signInError) throw signInError
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
    <AuthContext.Provider value={{ user, session, loading, signIn, signOut }}>
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
