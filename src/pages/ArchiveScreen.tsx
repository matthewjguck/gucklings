import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getFriends } from '@/lib/friends'
import { getReceiptsByFriend, getReceivedReceiptsByFriend, getReceiptsByCurrentUser, getReceivedReceiptsByCurrentUser } from '@/lib/receipts'
import { submitBase64PrintJob } from '@/lib/printJob'
import PageTransition from '@/components/PageTransition'
import type { FriendProfile, Receipt } from '@/types/app'
import ReceiptBodyRenderer from '@/components/ReceiptBodyRenderer'

type TabType = 'sent' | 'received'

export default function LettersScreen() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [friends, setFriends] = useState<FriendProfile[]>([])
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null)
  const [activeFriendEmail, setActiveFriendEmail] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('sent')
  const [sentReceipts, setSentReceipts] = useState<Receipt[]>([])
  const [receivedReceipts, setReceivedReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    const loadFriends = async () => {
      const friendsList = await getFriends(user.id)
      setFriends(friendsList)
      setActiveFriendId(null)
      setLoading(false)
    }

    loadFriends()
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) {
      setSentReceipts([])
      setReceivedReceipts([])
      return
    }

    const loadReceipts = async () => {
      if (activeFriendEmail) {
        const sent = await getReceiptsByFriend(user.email!, activeFriendEmail)
        const received = await getReceivedReceiptsByFriend(user.email!, activeFriendEmail)
        setSentReceipts(sent)
        setReceivedReceipts(received)
      } else {
        const sent = await getReceiptsByCurrentUser(user.email!)
        const received = await getReceivedReceiptsByCurrentUser(user.email!)
        setSentReceipts(sent)
        setReceivedReceipts(received)
      }
    }

    loadReceipts()
  }, [user?.id, activeFriendEmail])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-bg-base items-center justify-center">
        <p className="text-text-tertiary">Loading...</p>
      </div>
    )
  }

  return (
    <PageTransition className="flex min-h-screen flex-col bg-bg-base">
      <div className="sticky top-0 z-10">
        <header className="bg-bg-base relative flex items-start justify-between gap-4 px-6 pt-8 pb-4">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <h1 className="text-regular-semibold text-text-primary">Letters</h1>
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
              <button
                type="button"
                onClick={() => {
                  setActiveFriendId(null)
                  setActiveFriendEmail(null)
                }}
                className={
                  activeFriendId === null
                    ? 'text-callout text-text-inverse bg-fill-primary rounded-md whitespace-nowrap px-4 py-2'
                    : 'text-callout text-text-secondary whitespace-nowrap px-3 py-2'
                }
              >
                All
              </button>
              {friends.map((f) => {
                const label = (f.profile.display_name || f.profile.username || 'Friend').split(' ')[0]
                const isActive = activeFriendId === f.profile.id
                return (
                  <button
                    key={f.friendRowId}
                    type="button"
                    onClick={() => {
                      setActiveFriendId(f.profile.id)
                      const friendEmail = f.profile.username ? `${f.profile.username}@stanford.edu` : null
                      setActiveFriendEmail(friendEmail)
                    }}
                    className={
                      isActive
                        ? 'text-callout text-text-inverse bg-fill-primary rounded-md whitespace-nowrap px-4 py-2'
                        : 'text-callout text-text-secondary whitespace-nowrap px-3 py-2'
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3">
            <IconButton label="Home" onClick={() => navigate('/home')}>
              <HomeIcon />
            </IconButton>
            <IconButton label="New" onClick={() => navigate('/compose')}>
              <PlusIcon />
            </IconButton>
          </div>

        </header>
      </div>

      <div className="flex flex-col gap-4 px-6">
        <div className="flex gap-2 border-b border-fill-tertiary">
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'sent'
                ? 'text-text-primary border-b-2 border-fill-primary -mb-px'
                : 'text-text-secondary'
            }`}
          >
            Sent
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'received'
                ? 'text-text-primary border-b-2 border-fill-primary -mb-px'
                : 'text-text-secondary'
            }`}
          >
            Received
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 px-6 pb-8">
        <div className="text-xs text-text-tertiary bg-bg-secondary p-2 rounded">
          <div>Sent: {sentReceipts.length} | Received: {receivedReceipts.length}</div>
          {(activeTab === 'sent' ? sentReceipts : receivedReceipts).map((r) => (
            <div key={r.id} className="text-xs text-text-secondary mt-1">
              {r.to} - {r.date} - {typeof r.content === 'string' ? r.content.substring(0, 30) : '(visual receipt)'}...
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-8">
          {(activeTab === 'sent' ? sentReceipts : receivedReceipts).length === 0 ? (
            <p className="text-callout text-text-tertiary">No letters yet.</p>
          ) : (
            (activeTab === 'sent' ? sentReceipts : receivedReceipts).map((r) => (
              <ReceiptDisplay key={r.id} receipt={r} />
            ))
          )}
        </div>
      </div>
    </PageTransition>
  )
}

function ReceiptDisplay({ receipt }: { receipt: Receipt }) {
  const [printing, setPrinting] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)

  const handleReprint = async () => {
    if (!receipt.receiptImage) return
    setPrinting(true)
    setPrintError(null)
    try {
      // Reconstruct data URL if needed (database stores just the base64 part)
      const imageUrl = receipt.receiptImage.startsWith('data:')
        ? receipt.receiptImage
        : `data:image/png;base64,${receipt.receiptImage}`

      await submitBase64PrintJob({
        base64Image: imageUrl,
        recipientName: receipt.to,
        recipientEmail: receipt.friendId,
        skipGeofence: false,
      })
    } catch (err) {
      setPrintError(err instanceof Error ? err.message : 'Print failed')
    } finally {
      setPrinting(false)
    }
  }

  // If we have the receipt image, display it with reprint button
  if (receipt.receiptImage) {
    // Reconstruct data URL if needed (database stores just the base64 part)
    const imageUrl = receipt.receiptImage.startsWith('data:')
      ? receipt.receiptImage
      : `data:image/png;base64,${receipt.receiptImage}`

    return (
      <div className="border-fill-tertiary bg-white rounded-md border overflow-hidden">
        <div className="p-3 flex justify-between items-center border-b border-fill-tertiary bg-bg-secondary">
          <p className="text-mini text-text-tertiary">{receipt.date}</p>
          <button
            onClick={handleReprint}
            disabled={printing}
            className="text-xs text-fill-primary hover:underline disabled:opacity-50"
          >
            {printing ? 'Printing…' : 'Reprint'}
          </button>
        </div>
        {printError && <p className="text-xs text-fill-red px-3 pt-2">{printError}</p>}
        <img
          src={imageUrl}
          alt={`Receipt to ${receipt.to}`}
          className="w-full h-auto"
          style={{ filter: 'grayscale(100%)' }}
        />
      </div>
    )
  }

  let receiptState
  try {
    // Try new format first (receipt_state_json), fall back to legacy format (content as JSON)
    if (receipt.receiptStateJson) {
      receiptState = JSON.parse(receipt.receiptStateJson)
    } else {
      receiptState = JSON.parse(receipt.content)
    }
  } catch {
    receiptState = null
  }

  if (!receiptState) {
    const contentStr = typeof receipt.content === 'string' ? receipt.content : '(no text)'
    return (
      <div className="border-fill-tertiary bg-bg-secondary rounded-md border p-4 flex flex-col justify-between overflow-hidden">
        <p className="text-callout text-text-primary line-clamp-4">
          {contentStr || '(no text)'}
        </p>
        <p className="text-mini text-text-tertiary mt-3">
          {receipt.date}
        </p>
      </div>
    )
  }

  return (
    <div className="border-fill-tertiary bg-white rounded-md border overflow-hidden">
      <div style={{ fontFamily: 'Georgia, serif', padding: '16px', backgroundColor: '#ffffff', color: '#222121' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
          {receiptState.headerVariant === 'simple' ? (
            <img src="/header-logo.svg" alt="Inklings" style={{ height: '48px', width: 'auto' }} />
          ) : receiptState.headerVariant === 'squids-checkers' ? (
            <img src="/header-squids-checkers.svg" alt="Inklings squids checkers" style={{ height: '60px', width: 'auto' }} />
          ) : receiptState.headerVariant === 'squids-v1' ? (
            <img src="/header-squids-v1.svg" alt="Inklings squids v1" style={{ height: '60px', width: 'auto' }} />
          ) : null}
        </div>

        {/* Recipient Bar */}
        <img src="/recipient-bar.png" alt="Recipient Bar" style={{ width: '100%', height: 'auto', marginBottom: '12px', display: 'block' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontFamily: "'Printvetica', 'Inter Variable', sans-serif", fontSize: '20px', color: '#222121', lineHeight: 1.4 }}>
          <span>To: {receipt.to}</span>
          <span>{receipt.date}</span>
        </div>

        <ReceiptBodyRenderer
          blocks={receiptState.blocks ?? []}
          prompt={receiptState.currentPrompt}
          signature={receiptState.signature}
        />
      </div>
    </div>
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

function HomeIcon() {
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
        d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H15V14H9V21H4C3.45 21 3 20.55 3 20V10.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlusIcon() {
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
        d="M12 5V19M5 12H19"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
