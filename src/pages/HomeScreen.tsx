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
  '/family-7.jpg',
  '/family-8.jpg',
  '/family-9.jpg',
  '/family-10.jpg',
  '/family-11.jpg',
  '/family-12.jpg',
  '/family-13.jpg',
  '/family-14.jpg',
  '/family-15.jpg',
]

interface PolaroidPhoto {
  id: string
  src: string
  rotation: number
  left: string
  top: string
  zIndex: number
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [photos, setPhotos] = useState<PolaroidPhoto[]>([])
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    // Get display name from profiles table or user metadata
    const fetchDisplayName = async () => {
      if (!user?.id) return

      // First try user metadata (from localStorage)
      if (user.user_metadata?.display_name) {
        setDisplayName(user.user_metadata.display_name)
        return
      }

      // Then try Supabase query
      if (supabase) {
        try {
          const { data } = await supabase!
            .from('profiles')
            .select('display_name')
            .eq('id', user.id)
            .single()

          if (data?.display_name) {
            setDisplayName(data.display_name as string)
            return
          }
        } catch (err) {
          // Fallback to email if query fails
        }
      }

      // Final fallback to email
      if (user?.email) {
        setDisplayName(user.email.split('@')[0])
      }
    }

    fetchDisplayName()
  }, [user?.id, user?.email])

  useEffect(() => {
    // Randomly select 2 photos and display centered at top and bottom
    const shuffled = FAMILY_PHOTOS
      .sort(() => Math.random() - 0.5)
      .slice(0, 2) // Take only first 2 random photos
      .map((src, idx) => ({
        id: `photo-${idx}`,
        src,
        rotation: Math.random() * 15 - 7.5,
        left: 'calc(50% - 140px)', // Centered horizontally
        top: idx === 0
          ? 'calc(50% - 312px)' // Top photo (raised 30%)
          : 'calc(50% - 40px)', // Bottom photo (higher to avoid covering button)
        zIndex: idx,
      }))
    setPhotos(shuffled as any)
  }, [])

  const handleSendClick = () => {
    clearDraft()
    navigate('/compose')
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
      <div className="flex-1 relative w-full mb-6 overflow-visible">
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
              zIndex: photo.zIndex,
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
