import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { clearDraft } from '@/lib/onboardingDraft'
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
  x: number
  y: number
}

export default function HomeScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [photos, setPhotos] = useState<PolaroidPhoto[]>([])
  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    // Get display name from user metadata
    if (user?.user_metadata?.display_name) {
      setDisplayName(user.user_metadata.display_name)
    } else if (user?.email) {
      setDisplayName(user.email.split('@')[0])
    }
  }, [user])

  useEffect(() => {
    // Generate randomized polaroid positions
    const shuffled = FAMILY_PHOTOS
      .sort(() => Math.random() - 0.5)
      .map((src, idx) => ({
        id: `photo-${idx}`,
        src,
        rotation: Math.random() * 8 - 4, // -4 to 4 degrees
        x: Math.random() * 40 - 20, // -20 to 20% offset
        y: Math.random() * 30 - 15, // -15 to 15% offset
      }))
    setPhotos(shuffled)
  }, [])

  const handleSendClick = () => {
    clearDraft()
    navigate('/onboard/recipient')
  }

  return (
    <PageTransition className="flex h-screen flex-col bg-bg-base px-6 pt-8 pb-8 overflow-hidden">
      {/* Welcome header */}
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-text-primary">
          Welcome, {displayName}
        </h1>
      </header>

      {/* Polaroid gallery */}
      <div className="flex-1 relative w-full mb-6 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="absolute bg-white shadow-lg"
              style={{
                width: '140px',
                height: '160px',
                transform: `translate(${photo.x}%, ${photo.y}%) rotate(${photo.rotation}deg)`,
                padding: '8px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
              }}
            >
              <div className="w-full h-32 bg-gray-200 overflow-hidden">
                <img
                  src={photo.src}
                  alt="Family"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="h-6 bg-white" />
            </div>
          ))}
        </div>
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
