import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveDraft } from '@/lib/onboardingDraft'
import PageTransition from '@/components/PageTransition'

export default function OnboardRecipient() {
  const navigate = useNavigate()
  const [sunet, setSunet] = useState('')
  const [error] = useState('')

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sunet.trim()) return

    const recipientEmail = `${sunet.trim().toLowerCase()}@stanford.edu`
    saveDraft({ recipient: { name: sunet.trim().toLowerCase(), phone: recipientEmail } })

    // Navigate to receipt editor with recipient pre-selected
    navigate(`/compose?email=${encodeURIComponent(recipientEmail)}`)
  }

  return (
    <PageTransition className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-black">
          Who do you want to send this to?
        </h1>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSend} className="mt-10 flex w-full flex-col gap-3">
          <div className="relative">
            <input
              type="text"
              value={sunet}
              onChange={(e) => setSunet(e.target.value.toLowerCase())}
              required
              placeholder="Enter SUNet ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black pr-32"
              autoFocus
            />
            <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
              @stanford.edu
            </span>
          </div>

          <button
            type="submit"
            className="bg-black text-white font-semibold rounded-md mt-8 flex w-full h-14 items-center justify-center disabled:opacity-50"
          >
            Continue to compose
          </button>
        </form>
      </div>
    </PageTransition>
  )
}
