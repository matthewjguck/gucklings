import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '@/components/BottomNav'
import { useAuth } from '@/contexts/AuthContext'
import { getFriends } from '@/lib/friends'
import PageTransition from '@/components/PageTransition'
import type { FriendProfile } from '@/types/app'

function MailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="#374151" strokeWidth="1.8" />
      <path d="M2 8L12 14L22 8" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function FriendsScreen() {
  const { user } = useAuth()
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    const loadFriends = async () => {
      const data = await getFriends(user.id)
      setFriends(data)
      setLoading(false)
    }

    loadFriends()
  }, [user?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col pb-16">
        <div className="px-6 pt-8">
          <p className="text-gray-500">Loading friends...</p>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <PageTransition className="min-h-screen bg-white flex flex-col pb-16">
      <div className="px-6 pt-8">
        {/* Header */}
        <div className="flex items-center gap-2 mb-8">
          <h1 className="text-2xl font-bold text-black mr-2">Friends</h1>
          <div className="flex -space-x-2">
            {friends.slice(0, 3).map(f => (
              <div key={f.friendRowId} className="rounded-full border-2 border-white overflow-hidden">
                {f.profile.avatar_url ? (
                  <img src={f.profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Friend list */}
        {friends.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No friends yet. <a href="/share/recipient" className="text-text-primary">Send your first Inkling!</a></p>
        ) : (
          <div className="flex flex-col gap-3">
            {friends.map(friend => (
              <button
                key={friend.friendRowId}
                onClick={() => navigate(`/friends/${friend.profile.id}`)}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-white shadow-sm active:opacity-70 transition-opacity text-left w-full"
              >
                {friend.profile.avatar_url ? (
                  <img src={friend.profile.avatar_url} alt="" className="w-13 h-13 rounded-full object-cover" />
                ) : (
                  <div className="w-13 h-13 rounded-full bg-gray-300" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-black text-sm truncate">{friend.profile.display_name || friend.profile.username}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">@{friend.profile.username}</p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    navigate(`/compose?to=${friend.profile.id}`)
                  }}
                  className="p-2 rounded-lg active:bg-gray-100"
                  aria-label={`Send message to ${friend.profile.display_name}`}
                >
                  <MailIcon />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </PageTransition>
  )
}
