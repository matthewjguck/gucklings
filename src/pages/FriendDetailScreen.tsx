import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Receipt from '@/components/Receipt'
import BottomNav from '@/components/BottomNav'
import { useAuth } from '@/contexts/AuthContext'
import { getFriends } from '@/lib/friends'
import { getReceiptsByFriend } from '@/lib/receipts'
import type { FriendProfile, Receipt as ReceiptType } from '@/types/app'

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18L9 12L15 6" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function FriendDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [friend, setFriend] = useState<FriendProfile | null>(null)
  const [receipts, setReceipts] = useState<ReceiptType[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id || !id) {
      setLoading(false)
      return
    }

    const loadData = async () => {
      const friends = await getFriends(user.id)
      const foundFriend = friends.find(f => f.profile.id === id)
      setFriend(foundFriend ?? null)

      if (foundFriend) {
        const recs = await getReceiptsByFriend(user.id, id)
        setReceipts(recs)
      }
      setLoading(false)
    }

    loadData()
  }, [user?.id, id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    )
  }

  if (!friend) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Friend not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-16">
      {/* Top bar */}
      <div className="flex items-center gap-2 px-4 pt-6 pb-4">
        <button onClick={() => navigate('/friends')} className="w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors">
          <BackIcon />
        </button>
      </div>

      {/* Profile */}
      <div className="flex items-center gap-4 px-6 pb-6">
        {friend.profile.avatar_url ? (
          <img src={friend.profile.avatar_url} alt="" className="w-18 h-18 rounded-full object-cover" />
        ) : (
          <div className="w-18 h-18 rounded-full bg-gray-300" />
        )}
        <div>
          <h2 className="text-xl font-bold text-black">{friend.profile.display_name || friend.profile.username}</h2>
          <p className="text-sm text-gray-500 mt-0.5">@{friend.profile.username}</p>
        </div>
      </div>

      {/* Memories */}
      <div className="px-6 flex-1">
        <h3 className="text-base font-semibold text-gray-800 mb-4">Memories</h3>
        {receipts.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No letters yet. Send the first one!</p>
        ) : (
          <div className="flex flex-col gap-4">
            {receipts.map(r => (
              <Receipt key={r.id} receipt={r} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
