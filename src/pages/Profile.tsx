import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import PageTransition from '@/components/PageTransition'

interface ProfileData {
  first_name: string | null
  last_name: string | null
  display_name: string | null
  username: string | null
  email: string | null
}

function splitDisplayName(display_name: string | null): { first: string; last: string } {
  if (!display_name) return { first: '', last: '' }
  const parts = display_name.trim().split(/\s+/)
  return { first: parts[0] || '', last: parts.slice(1).join(' ') }
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ first_name: '', last_name: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    const loadProfile = async () => {
      let displayName: string | null = null
      let username: string | null = null

      if (supabase) {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('id', user.id)
          .maybeSingle()

        displayName = data?.display_name ?? null
        username = data?.username ?? null
      }

      // Fall back to user_metadata if profile row is missing or has no display_name
      if (!displayName) {
        displayName = (user.user_metadata?.display_name as string) ?? null
      }
      if (!displayName) {
        displayName = (user.user_metadata?.full_name as string) ?? null
      }
      if (!username) {
        username = user.email?.split('@')[0] ?? null
      }

      const { first, last } = splitDisplayName(displayName)
      const newProfile: ProfileData = {
        first_name: first || null,
        last_name: last || null,
        display_name: displayName,
        username,
        email: user.email ?? null,
      }
      setProfile(newProfile)
      setFormData({ first_name: first, last_name: last })
      setLoading(false)
    }

    loadProfile()
  }, [user?.id])

  const handleSave = async () => {
    if (!user?.id || !supabase) return

    setSaving(true)
    setError('')

    try {
      const displayName = [formData.first_name.trim(), formData.last_name.trim()]
        .filter(Boolean)
        .join(' ') || null

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile((p) =>
        p
          ? {
              ...p,
              first_name: formData.first_name.trim() || null,
              last_name: formData.last_name.trim() || null,
              display_name: displayName,
            }
          : null
      )
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-base items-center justify-center">
        <p className="text-text-tertiary">Loading...</p>
      </div>
    )
  }

  return (
    <PageTransition className="flex min-h-screen flex-col bg-bg-base px-6 pt-12 pb-8">
      <header className="flex items-end justify-between">
        <h1 className="text-regular-semibold text-text-primary">Profile</h1>
        <div className="flex flex-col gap-3">
          <IconButton label="Home" onClick={() => navigate('/home')}>
            <HomeIcon />
          </IconButton>
          <IconButton label="New" onClick={() => navigate('/compose')}>
            <PlusIcon />
          </IconButton>
        </div>
      </header>

      {profile && (
        <div className="mt-12 flex flex-col gap-6 max-w-sm">
          {!isEditing ? (
            <>
              <div className="flex flex-col gap-3">
                <label className="text-callout text-text-secondary">First Name</label>
                <div className="text-body text-text-primary border-fill-tertiary bg-bg-base rounded-md w-full border px-4 py-3">
                  {profile.first_name || 'Not set'}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-callout text-text-secondary">Last Name</label>
                <div className="text-body text-text-primary border-fill-tertiary bg-bg-base rounded-md w-full border px-4 py-3">
                  {profile.last_name || 'Not set'}
                </div>
              </div>

              {profile.username && (
                <div className="flex flex-col gap-3">
                  <label className="text-callout text-text-secondary">SUNet ID</label>
                  <div className="text-body text-text-primary border-fill-tertiary bg-bg-base rounded-md w-full border px-4 py-3">
                    @{profile.username}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <label className="text-callout text-text-secondary">Email</label>
                <div className="text-body text-text-primary border-fill-tertiary bg-bg-base rounded-md w-full border px-4 py-3">
                  {profile.email}
                </div>
              </div>

              <button
                onClick={() => setIsEditing(true)}
                className="text-callout text-text-primary border-fill-tertiary rounded-md mt-4 w-full border py-3 hover:bg-bg-secondary"
              >
                Edit Profile
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <label className="text-callout text-text-secondary">First Name</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData((f) => ({ ...f, first_name: e.target.value }))}
                  placeholder="First name"
                  className="text-body text-text-primary border-fill-tertiary bg-bg-base rounded-md w-full border px-4 py-3 focus:outline-none focus:border-fill-primary"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-callout text-text-secondary">Last Name</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData((f) => ({ ...f, last_name: e.target.value }))}
                  placeholder="Last name"
                  className="text-body text-text-primary border-fill-tertiary bg-bg-base rounded-md w-full border px-4 py-3 focus:outline-none focus:border-fill-primary"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-callout text-text-secondary">Email</label>
                <div className="text-body text-text-tertiary border-fill-tertiary bg-bg-secondary rounded-md w-full border px-4 py-3">
                  {profile.email}
                </div>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-callout text-text-inverse bg-fill-primary rounded-md flex flex-1 h-14 items-center justify-center disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setFormData({
                      first_name: profile.first_name || '',
                      last_name: profile.last_name || '',
                    })
                    setError('')
                  }}
                  className="text-callout text-text-primary border-fill-tertiary rounded-md flex flex-1 h-14 items-center justify-center border hover:bg-bg-secondary"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={handleSignOut}
        className="text-headline text-text-inverse bg-fill-primary rounded-md mt-8 flex w-full h-14 items-center justify-center"
      >
        Sign Out
      </button>

      <div className="mt-12 text-xs text-text-tertiary text-center">
        Deployed: {import.meta.env.VITE_DEPLOYMENT_TIME || 'Development'}
      </div>
    </PageTransition>
  )
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors"
    >
      {children}
    </button>
  )
}

function HomeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H15V14H9V21H4C3.45 21 3 20.55 3 20V10.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 5V19M5 12H19"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
