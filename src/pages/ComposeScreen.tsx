import { useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Avatar from '@/components/Avatar'
import BottomNav from '@/components/BottomNav'
import { FRIENDS } from '@/data/mock'

const PROMPTS = [
  'What was the best part of your day yesterday?',
  'What is something you have been thankful for recently?',
  'Tell me something you\'ve been excited about.',
  'What made you smile today?',
  'What\'s something you want to remember from this week?',
]

export default function ComposeScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTo = searchParams.get('to') ?? ''

  const [selectedFriendId, setSelectedFriendId] = useState(initialTo)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
  const receiptRef = useRef<HTMLDivElement>(null)

  const selectedFriend = FRIENDS.find(f => f.id === selectedFriendId)

  async function handleSend() {
    if (!selectedFriendId || !message.trim()) return
    setSending(true)
    // Note is saved locally; geolocation only requested when printing
    navigate('/home')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-16">
      <div className="px-6 pt-8 flex-1">
        <h1 className="text-2xl font-bold text-black mb-6">Compose</h1>

        {/* To picker */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">To</label>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {FRIENDS.map(f => (
              <button
                key={f.id}
                onClick={() => setSelectedFriendId(f.id)}
                className={`flex flex-col items-center gap-1.5 flex-shrink-0 transition-opacity ${
                  selectedFriendId && selectedFriendId !== f.id ? 'opacity-40' : 'opacity-100'
                }`}
              >
                <div
                  className={`rounded-full p-0.5 transition-all ${
                    selectedFriendId === f.id ? 'ring-2 ring-fill-primary ring-offset-2' : ''
                  }`}
                >
                  <Avatar avatarId={f.avatarId} size={48} />
                </div>
                <span className="text-xs text-gray-600 w-16 text-center leading-tight">
                  {f.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Receipt preview / form */}
        <div
          ref={receiptRef}
          className="bg-white border border-gray-200 rounded-sm shadow-sm p-5"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {/* Date + to/from */}
          <div className="text-xs text-gray-400 mb-1">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="text-sm font-semibold text-gray-800 mb-0.5">
            To: {selectedFriend ? selectedFriend.name.split(' ')[0] : '___'}
          </div>
          <div className="text-sm text-gray-600 mb-4 pb-4 border-b border-dashed border-gray-200">
            From: Matthew
          </div>

          {/* Prompt */}
          <p className="text-xs text-gray-500 italic mb-3 leading-relaxed">{prompt}</p>

          {/* Message input */}
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Write your message here..."
            rows={5}
            className="w-full text-sm text-gray-800 leading-relaxed resize-none outline-none placeholder-gray-300"
            style={{ fontFamily: 'Georgia, serif' }}
          />

          <div className="mt-3 pt-3 border-t border-dashed border-gray-200 text-sm text-gray-600 italic">
            Love, &nbsp;Matthew
          </div>
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!selectedFriendId || !message.trim() || sending}
          className="mt-6 flex w-full h-14 items-center justify-center rounded-md bg-fill-primary text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed active:opacity-80 transition-opacity"
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
