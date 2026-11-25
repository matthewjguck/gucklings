import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (phone: string, passcode: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface SessionResponse {
  user: {
    id: string
    email: string
    user_metadata: {
      phone?: string
      display_name?: string
    }
  }
  sessionToken?: string
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
        })

        if (response.ok) {
          const data = (await response.json()) as SessionResponse
          const mockUser = {
            id: data.user.id,
            aud: 'authenticated',
            app_metadata: { provider: 'phone', providers: ['phone'] },
            user_metadata: data.user.user_metadata,
            created_at: new Date(0).toISOString(),
            email: data.user.email,
          } as User
          setUser(mockUser)
          setSession(null)
        } else {
          setUser(null)
          setSession(null)
        }
      } catch (error) {
        console.error('[AuthContext] Failed to initialize session:', error)
        setUser(null)
        setSession(null)
      } finally {
        setLoading(false)
      }
    }

    initializeSession()
  }, [])

  const signIn = async (phone: string, passcode: string) => {
    if (!phone || !passcode) {
      throw new Error('Phone and passcode are required')
    }

    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, passcode }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Login failed')
      }

      const data = (await response.json()) as SessionResponse
      const mockUser = {
        id: data.user.id,
        aud: 'authenticated',
        app_metadata: { provider: 'phone', providers: ['phone'] },
        user_metadata: data.user.user_metadata,
        created_at: new Date(0).toISOString(),
        email: data.user.email,
      } as User

      setUser(mockUser)
      setSession(null)
    } catch (error) {
      throw error
    }
  }

  const signOut = async () => {
    try {
      await fetch('/api/auth/session', {
        method: 'DELETE',
        credentials: 'include',
      })
    } catch (error) {
      console.error('[AuthContext] Error during logout:', error)
    } finally {
      setUser(null)
      setSession(null)
      if (typeof window !== 'undefined') {
        const dbReq = indexedDB.deleteDatabase('gucklings_drafts')
        dbReq.onerror = () => console.error('Failed to clear drafts on logout')
      }
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
