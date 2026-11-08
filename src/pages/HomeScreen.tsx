import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getUnprintedReceiptCount } from '@/lib/receipts'
import { clearDraft } from '@/lib/onboardingDraft'
import PageTransition from '@/components/PageTransition'
import HomeCollage from '@/components/HomeCollage'

export default function HomeScreen() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [unprintedCount, setUnprintedCount] = useState(0)

  useEffect(() => {
    if (!user?.email) return
    const loadUnprintedCount = async () => {
      const count = await getUnprintedReceiptCount(user.email!)
      setUnprintedCount(count)
    }
    loadUnprintedCount()
  }, [user?.email])

  const handleSendClick = () => {
    clearDraft()
    navigate('/onboard/recipient')
  }

  const handlePrintClick = () => {
    navigate('/prints')
  }

  return (
    <PageTransition className="flex h-screen flex-col bg-bg-base px-6 pt-8 pb-8 overflow-hidden">
      <header className="flex items-end justify-between">
        <h1 className="text-regular-semibold text-text-primary">Home</h1>
        <div className="flex flex-col gap-2">
          <IconButton label="Profile" onClick={() => navigate('/profile')}>
            <ProfileIcon />
          </IconButton>
          <IconButton label="Letters" onClick={() => navigate('/letters')}>
            <ArchiveIcon />
          </IconButton>
        </div>
      </header>

      {/* Collage viewport */}
      <div className="flex-1 my-6 flex items-center justify-center min-h-0">
        <HomeCollage />
      </div>

      {/* Stacked action buttons */}
      <div className="flex flex-col gap-3">
        <ActionButton label="Send" onClick={handleSendClick} variant="filled" />
        <ActionButton
          label="Print"
          onClick={handlePrintClick}
          badgeCount={unprintedCount}
          variant="outlined"
        />
      </div>
    </PageTransition>
  )
}

function ActionButton({
  label,
  onClick,
  badgeCount = 0,
  variant = 'filled',
}: {
  label: string
  onClick: () => void
  badgeCount?: number
  variant?: 'filled' | 'outlined'
}) {
  const styles =
    variant === 'filled'
      ? 'bg-black text-white border border-black'
      : 'bg-white text-black border border-black'
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ fontFamily: 'var(--font-printvetica)' }}
      className={`relative flex h-14 w-full items-center justify-center rounded-md text-base font-semibold active:opacity-80 transition-opacity ${styles}`}
    >
      <span>{label}</span>
      {badgeCount > 0 && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white rounded-full min-w-6 h-6 px-2 flex items-center justify-center text-xs font-semibold">
          {badgeCount}
        </span>
      )}
    </button>
  )
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors"
    >
      {children}
    </button>
  )
}

function ProfileIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4 20C4 17 7.58 14 12 14C16.42 14 20 17 20 20"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ArchiveIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4 6h16v2H4V6zm1 3h14v9c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V9zm3 2v5h2v-5H8zm4 0v5h2v-5h-2z"
        fill="currentColor"
      />
    </svg>
  )
}
