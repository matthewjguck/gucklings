import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import PageTransition from '@/components/PageTransition'

export default function SignUp() {
  const { signUp } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextPath = searchParams.get('next')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fullName = `${firstName} ${lastName}`.trim()

    try {
      await signUp(email, password, fullName)

      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const username = email.split('@')[0]
          await supabase
            .from('profiles')
            .upsert({
              id: user.id,
              username,
              display_name: fullName,
            })
        }
      }

      if (nextPath) {
        navigate(nextPath)
      } else {
        navigate('/onboard/compose')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed')
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-4 py-4 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-fill-primary'

  return (
    <PageTransition className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-regular-semibold text-text-primary">
          Create your account
        </h1>
        <p className="text-subheadline text-text-secondary mt-2">
          For your password, use at least 8 chars, and a symbol
        </p>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-10 flex w-full flex-col gap-3"
        >
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            placeholder="First Name"
            className={inputClass}
            disabled={loading}
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            placeholder="Last Name"
            className={inputClass}
            disabled={loading}
          />
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
            placeholder="Password (8+ chars)"
            className={inputClass}
            disabled={loading}
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number (optional)"
            className="w-full px-4 py-4 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-fill-primary"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="flex w-full h-14 items-center justify-center mt-4 bg-fill-primary text-white rounded-md font-medium hover:opacity-80 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-text-secondary">
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-fill-primary font-medium hover:underline"
          >
            Login
          </button>
        </p>
      </div>
    </PageTransition>
  )
}
