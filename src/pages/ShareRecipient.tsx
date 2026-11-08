import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ShareRecipient() {
  const navigate = useNavigate()
  const [sunet, setSunet] = useState('')

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    const id = sunet.trim().toLowerCase()
    if (!id) return
    navigate(`/compose?email=${encodeURIComponent(`${id}@stanford.edu`)}`)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-black">
          Who do you want to send this to?
        </h1>

        <form onSubmit={handleContinue} className="mt-10 flex w-full flex-col gap-3">
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
            className="bg-black text-white font-semibold rounded-md mt-8 flex w-full h-14 items-center justify-center"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}
