import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import PageTransition from '@/components/PageTransition'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      await signIn(email, password)
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
        <h1 className="text-regular-semibold text-text-primary">Log in</h1>
        <p className="text-subheadline text-text-secondary mt-2">
          Enter your email and password to log back into your account
        </p>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-10 flex w-full flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email"
            className={inputClass}
            disabled={loading}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Password"
            className={inputClass}
            disabled={loading}
          />

          <button
            type="submit"
            disabled={loading}
            className="text-headline text-text-inverse bg-fill-primary rounded-md mt-8 flex w-full h-14 items-center justify-center disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Continue'}
          </button>

          <Link
            to="/forgot-password"
            className="text-subheadline text-text-primary mt-3 self-center underline"
          >
            Forgot password?
          </Link>
        </form>
      </div>
    </PageTransition>
  )
}
