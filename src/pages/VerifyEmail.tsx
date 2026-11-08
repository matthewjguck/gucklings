import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function VerifyEmail() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    if (user.email_confirmed_at) {
      navigate('/home')
    }
  }, [user, navigate])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleResendEmail = async () => {
    if (!user || !supabase) return
    setLoading(true)
    setError('')

    try {
      const { error: err } = await supabase.auth.resend({
        type: 'signup',
        email: user.email || '',
      })

      if (err) throw err
      setSuccess(true)
      setResendCooldown(60)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend email')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckVerification = async () => {
    if (!user || !supabase) return
    setLoading(true)
    setError('')

    try {
      const { data: { user: updatedUser }, error: err } = await supabase.auth.getUser()
      if (err) throw err

      if (updatedUser?.email_confirmed_at) {
        navigate('/home')
      } else {
        setError('Email not verified yet. Please check your inbox.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check verification status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-black">One last step!</h1>
          <p className="text-gray-600">
            We've sent a verification link to <strong>{user?.email}</strong>
          </p>
        </div>

        <div className="bg-bg-secondary border border-fill-tertiary rounded-lg p-4 space-y-3">
          <p className="text-sm text-gray-700">
            Check your email and click the verification link to confirm your account.
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            Verification email sent! Check your inbox.
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleCheckVerification}
            disabled={loading}
            className="w-full py-3 rounded-lg bg-fill-primary text-white font-semibold text-sm hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Checking...' : "I've verified my email"}
          </button>

          <button
            onClick={handleResendEmail}
            disabled={loading || resendCooldown > 0}
            className="w-full py-3 rounded-lg border border-gray-300 bg-white text-black font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Didn't receive the email? Resend"}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Check your spam folder if you don&apos;t see the email
        </p>
      </div>
    </div>
  )
}
