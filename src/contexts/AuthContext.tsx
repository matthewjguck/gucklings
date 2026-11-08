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
const PERSISTED_USER_KEY = 'gucklings.auth.user'

function createMockUser(email: string, id: string, displayName?: string) {
  return {
    id,
    aud: 'authenticated',
    app_metadata: { provider: 'phone', providers: ['phone'] },
    user_metadata: { phone: email, display_name: displayName },
    created_at: new Date(0).toISOString(),
    email,
  } as User
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    const stored = window.localStorage.getItem(PERSISTED_USER_KEY)
    if (stored) {
      try {
        return JSON.parse(stored) as User
      } catch (e) {
        console.error('Failed to parse stored user:', e)
        return null
      }
    }
    return null
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

    // Normalize phone number to digits only for comparison (add country code if missing)
    const phoneDigits = parseInt('1' + phone.replace(/\D/g, ''), 10)

    // Verify phone + passcode against database
    const { data: allProfiles, error: queryError } = await supabase
      .from('profiles')
      .select('id, phone_number, passcode_hash, display_name')

    if (queryError || !allProfiles) {
      throw new Error('Unable to verify phone number')
    }

    // Find profile matching phone number (now stored as bigint)
    const data = allProfiles.find(p =>
      p.phone_number === phoneDigits
    )

    if (!data) {
      throw new Error('Phone number not found. Contact your family to be added.')
    }

    // Simple passcode verification (in production, use bcrypt)
    if (data.passcode_hash !== passcode) {
      throw new Error('Incorrect passcode')
    }

    // Create a mock authenticated user from the profile
    const mockUser = {
      id: data.id,
      aud: 'authenticated',
      app_metadata: { provider: 'phone', providers: ['phone'] },
      user_metadata: { phone: phoneDigits, display_name: data.display_name },
      created_at: new Date().toISOString(),
      email: `${phoneDigits}@gucklings.local`,
    } as User

    // Persist user to localStorage
    window.localStorage.setItem(PERSISTED_USER_KEY, JSON.stringify(mockUser))
    setUser(mockUser)
    setSession(null)
  }

  const signOut = async () => {
    // Clear persisted user
    window.localStorage.removeItem(PERSISTED_USER_KEY)
    setUser(null)
    setSession(null)

    if (supabase) {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    }
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
