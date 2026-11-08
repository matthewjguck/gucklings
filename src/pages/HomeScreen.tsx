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
    // Generate randomized polaroid positions in a centered layered collage
    // Highest z-index photos appear on top visually, so position them at screen top
    const shuffled = FAMILY_PHOTOS
      .sort(() => Math.random() - 0.5)
      .map((src, idx) => {
        let offsetY: number
        let offsetX: number
        const totalPhotos = FAMILY_PHOTOS.length
        const zIndex = totalPhotos - 1 - idx // Reverse: last photo gets highest z-index

        // Top 2 visible photos (highest z-indices) - positioned at screen top and bottom
        if (zIndex === totalPhotos - 1) {
          // Highest z-index photo → top of screen
          offsetY = -200 + (Math.random() - 0.5) * 30 // Top area: -215 to -185
          offsetX = (Math.random() - 0.5) * 200 // ±100px horizontal spread
        } else if (zIndex === totalPhotos - 2) {
          // Second highest z-index → bottom of screen
          offsetY = 200 + (Math.random() - 0.5) * 30 // Bottom area: +185 to +215
          offsetX = (Math.random() - 0.5) * 200 // ±100px horizontal spread
        } else {
          // Other photos layer behind, spread freely
          offsetY = (Math.random() - 0.5) * 400 // Full vertical range
          offsetX = (Math.random() - 0.5) * 250 // ±125px horizontal spread
        }

        return {
          id: `photo-${idx}`,
          src,
          rotation: Math.random() * 15 - 7.5,
          left: `calc(50% - 140px + ${offsetX}px)`,
          top: `calc(50% - 160px + ${offsetY}px)`,
          zIndex,
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
