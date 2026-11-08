import { Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import PageTransition from '@/components/PageTransition'

export default function OnboardIntro() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      navigate('/home', { replace: true })
    }
  }, [user, loading, navigate])

  return (
    <PageTransition className="flex min-h-screen flex-col bg-white px-6">
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="text-6xl font-bold text-black text-center">Inklings</h1>
        <p className="text-xl text-center text-grey mt-6"> Simple messages to the friends you love.</p>

        <Link
          to="/signup"
          className="bg-black text-white font-semibold rounded-md mt-8 flex w-full h-14 items-center justify-center"
        >
          Create an account
        </Link>

        <Link
          to="/login"
          className="text-gray-700 mt-4 w-full text-center block"
        >
          Log in
        </Link>
      </div>
    </PageTransition>
  )
}
