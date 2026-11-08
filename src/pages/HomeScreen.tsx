import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { clearDraft } from '@/lib/onboardingDraft'
import { supabase } from '@/lib/supabase'
import PageTransition from '@/components/PageTransition'

const FAMILY_PHOTOS = [
  '/family-1.jpg',
  '/family-2.jpg',
  '/family-3.jpg',
  '/family-4.jpg',
  '/family-5.jpg',
  '/family-6.jpg',
]

interface PolaroidPhoto {
  id: string
  src: string
  rotation: number
  left: string
  top: string
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [photos, setPhotos] = useState<PolaroidPhoto[]>([])
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    // Get display name from profiles table
    const fetchDisplayName = async () => {
      if (!user?.id) return
      try {
        const { data } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single()

        if (data?.display_name) {
          setDisplayName(data.display_name)
        } else if (user?.email) {
          setDisplayName(user.email.split('@')[0])
        }
      } catch (err) {
        // Fallback to email if query fails
        if (user?.email) {
          setDisplayName(user.email.split('@')[0])
        }
      }
    }

    fetchDisplayName()
  }, [user?.id, user?.email])

  useEffect(() => {
    // Generate randomized polaroid positions spread across the container
    const shuffled = FAMILY_PHOTOS
      .sort(() => Math.random() - 0.5)
      .map((src, idx) => {
        // Distribute photos in 2 rows of 3
        const row = idx < 3 ? 0 : 1
        const col = idx % 3

        // Base positions for 2x3 grid
        const baseX = col * 33.33 + 5 // 3 columns
        const baseY = row * 50 + 5 // 2 rows

        // Add some randomness to make it look natural
        const randomX = (Math.random() - 0.5) * 20
        const randomY = (Math.random() - 0.5) * 15

        return {
          id: `photo-${idx}`,
          src,
          rotation: Math.random() * 12 - 6,
          left: `calc(${baseX}% + ${randomX}px)`,
          top: `calc(${baseY}% + ${randomY}px)`,
        }
      })
    setPhotos(shuffled as any)
  }, [])

  const handleSendClick = () => {
    clearDraft()
    navigate('/onboard/recipient')
  }

  return (
    <PageTransition className="flex h-screen flex-col bg-bg-base px-6 pt-8 pb-8 overflow-hidden">
      {/* Welcome header - centered */}
      <header className="mb-6 text-center">
        <h1 className="text-4xl font-bold text-text-primary">
          Welcome, {displayName}
        </h1>
      </header>

      {/* Polaroid gallery */}
      <div className="flex-1 relative w-full mb-6 overflow-hidden">
        {photos.map((photo: any) => (
          <div
            key={photo.id}
            className="absolute bg-white shadow-xl"
            style={{
              width: '280px',
              height: '320px',
              left: photo.left,
              top: photo.top,
              transform: `rotate(${photo.rotation}deg)`,
              padding: '12px',
              boxShadow: '0 15px 40px rgba(0,0,0,0.3)',
              WebkitTransform: `rotate(${photo.rotation}deg)`,
            }}
          >
            <div className="w-full h-64 bg-gray-200 overflow-hidden">
              <img
                src={photo.src}
                alt="Family"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="h-8 bg-white" />
          </div>
        ))}
      </div>

      {/* Send button */}
      <div>
        <button
          type="button"
          onClick={handleSendClick}
          style={{ fontFamily: 'var(--font-printvetica)' }}
          className="relative flex h-14 w-full items-center justify-center rounded-md text-base font-semibold active:opacity-80 transition-opacity bg-black text-white border border-black"
        >
          <span>Send Home</span>
        </button>
      </div>
    </PageTransition>
  )
}
