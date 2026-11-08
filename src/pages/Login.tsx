import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import PageTransition from '@/components/PageTransition'

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (!digits) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
}

export default function Login() {
  const { signIn } = useAuth()
  const [phone, setPhone] = useState('')
  const [passcode, setPasscode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextPath = searchParams.get('next')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signIn(phone, passcode)
      navigate(nextPath || '/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setLoading(false)
    }
  }

  const inputClass =
    'font-inter text-mini text-text-primary placeholder:text-text-tertiary border-fill-tertiary bg-bg-tertiary rounded-md w-full border px-4 py-4 focus:outline-none focus:border-fill-primary'

  return (
    <PageTransition className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-regular-semibold text-text-primary">Log in to Gucklings</h1>
        <p className="text-subheadline text-text-secondary mt-2">
          Enter your phone number and family passcode
        </p>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-10 flex w-full flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-mini text-text-primary font-semibold">+1</span>
            <input
              type="tel"
              autoComplete="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              required
              placeholder="(555) 000-0000"
              className={inputClass}
              disabled={loading}
            />
          </div>
          <input
            type="password"
            autoComplete="current-password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            required
            placeholder="Family Passcode"
            className={inputClass}
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading || !phone || !passcode}
            className="text-headline text-text-inverse bg-fill-primary rounded-md mt-8 flex w-full h-14 items-center justify-center disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Continue'}
          </button>
        </form>

        <p className="text-xs text-text-tertiary mt-6 text-center">
          Not in the family? Ask someone to add you first.
        </p>
      </div>
    </PageTransition>
  )
}
