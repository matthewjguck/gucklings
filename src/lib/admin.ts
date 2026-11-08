import { useAuth } from '@/contexts/AuthContext'

const ADMIN_EMAILS = ['guck@stanford.edu']

export function useIsAdmin(): boolean {
  const { user } = useAuth()
  return !!user?.email && ADMIN_EMAILS.includes(user.email)
}
