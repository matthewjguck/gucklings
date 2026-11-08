import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { getFriends } from '@/lib/friends'
import { getReceivedUnprintedReceipts } from '@/lib/receipts'
import printerImg from '@/assets/printer.png'
import wifiSymbol from '@/assets/wifi-symbol.svg'
import { submitPrintJob, checkNearestPrinter, fetchAllActivePrinters } from '@/lib/printJob'
import { markReceiptAsPrinted } from '@/lib/receipts'
import PageTransition from '@/components/PageTransition'
import PrinterPickerModal from '@/components/PrinterPickerModal'
import type { FriendProfile, Receipt } from '@/types/app'
import ReceiptBodyRenderer from '@/components/ReceiptBodyRenderer'

type PrintState = 'select' | 'confirm' | 'locating' | 'no-location' | 'no-printer' | 'printing' | 'done' | 'failed'

export default function PrintingScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { user } = useAuth()
  const [state, setState] = useState<PrintState>('select')
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null)
  const [recipientEmail, setRecipientEmail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [unprinted, setUnprinted] = useState<Receipt[]>([])
  const [receiptState, setReceiptState] = useState<any>((location.state as any)?.receiptState || null)
  const [selectedPrinter, setSelectedPrinter] = useState<{ id: string; name: string } | null>(null)
  const [printerOverrideOpen, setPrinterOverrideOpen] = useState(false)
  const [allPrinters, setAllPrinters] = useState<{ id: string; name: string }[]>([])
  const receiptRef = useRef<HTMLDivElement>(null)
  const isTestMode = !searchParams.get('to') && !searchParams.get('email')

  useEffect(() => {
    if ((location.state as any)?.receiptState) {
      setReceiptState((location.state as any).receiptState)
    }
  }, [location.state])

  useEffect(() => {
    if (state === 'confirm' && allPrinters.length === 0) {
      fetchAllActivePrinters().then(setAllPrinters)
    }
  }, [state])

  useEffect(() => {
    const loadRecipientInfo = async () => {
      try {
        const friendId = searchParams.get('to')
        const email = searchParams.get('email')

        if (email) {
          setRecipientEmail(email)
          setState('confirm')
        } else if (friendId && user?.id) {
          const friends = await getFriends(user.id)
          const friend = friends.find(f => f.friendRowId === friendId)
          if (friend) {
            setSelectedFriend(friend)
          }
          setState('confirm')
        } else if (user?.email) {
          // Load received unprinted receipts
          const receipts = await getReceivedUnprintedReceipts(user.email)
          setUnprinted(receipts)
        }
      } catch (err) {
        console.error('Failed to load recipient info:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadRecipientInfo()
  }, [searchParams, user?.id, user?.email])

  useEffect(() => {
    if (state === 'locating') {
      const checkPrinter = async () => {
        try {
          // In test mode, skip printer check and go straight to printing
          if (isTestMode) {
            setState('printing')
            const timer = setTimeout(() => {
              setState('done')
              setTimeout(() => navigate('/home'), 1000)
            }, 3000)
            return () => clearTimeout(timer)
          }

          // Short-circuit if user already picked manually
          if (selectedPrinter) {
            setState('printing')
            const timer = setTimeout(() => {
              setState('done')
              setTimeout(() => navigate('/home'), 1000)
            }, 3000)
            return () => clearTimeout(timer)
          }

          const printer = await checkNearestPrinter()

          if (printer === null) {
            setState('no-printer')
            return
          }

          setSelectedPrinter(printer)
          setState('printing')

          const timer = setTimeout(() => {
            setState('done')
            setTimeout(() => navigate('/home'), 1000)
          }, 3000)

          return () => clearTimeout(timer)
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to locate printer'

          if (message.includes('position') || !navigator.geolocation) {
            setState('no-location')
          } else {
            setState('no-printer')
          }
        }
      }

      checkPrinter()
    }
  }, [state, navigate, isTestMode, selectedPrinter])

  useEffect(() => {
    if (state === 'done' && user?.id && receiptState && receiptRef.current) {
      const submitPrint = async () => {
        const receiptId = searchParams.get('receiptId')
        try {
          const recipientName = selectedFriend
            ? selectedFriend.profile.display_name || selectedFriend.profile.username || 'Friend'
            : recipientEmail?.split('@')[0] || 'Unknown'

          const finalRecipientEmail = selectedFriend
            ? selectedFriend.profile.username
              ? `${selectedFriend.profile.username}@stanford.edu`
              : undefined
            : recipientEmail || undefined

          await submitPrintJob({
            receiptElement: receiptRef.current!,
            recipientName,
            recipientId: selectedFriend?.profile.id,
            recipientEmail: finalRecipientEmail,
            skipGeofence: isTestMode,
            printerId: selectedPrinter?.id,
            cornerSticker: receiptState.cornerSticker ? {
              imageUrl: receiptState.cornerSticker.ditheredDataUrl || receiptState.cornerSticker.fullUrl,
              offsetX: receiptState.cornerSticker.offsetX ?? 0,
              offsetY: receiptState.cornerSticker.offsetY ?? 0,
              rotation: receiptState.cornerSticker.rotation ?? 0,
              scale: receiptState.cornerSticker.scale ?? 1,
            } : undefined,
            receiptStateJson: JSON.stringify(receiptState),
          })

          if (receiptId) {
            await markReceiptAsPrinted(receiptId)
          }
        } catch (err) {
          console.error('Failed to submit print job:', err)
        }
      }
      submitPrint()
    }
  }, [state, user?.id, receiptState, selectedFriend, recipientEmail, isTestMode, searchParams, selectedPrinter])

  const handleBack = () => navigate('/home')

  const handleConfirmPrint = () => {
    setState('locating')
  }

  const recipientName = selectedFriend
    ? selectedFriend.profile.display_name || selectedFriend.profile.username || 'Friend'
    : recipientEmail?.split('@')[0] || 'Unknown'

  return (
    <PageTransition className="relative min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      {/* Back button — top left */}
      <button
        onClick={handleBack}
        className="absolute top-6 left-6 w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors"
        aria-label="Back"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Receipt Selection State */}
      {state === 'select' && !isLoading && (
        <div className="flex flex-col items-center w-full max-w-sm">
          <h2 className="text-xl font-bold text-black text-center mb-4">Print Received Messages</h2>
          {unprinted.length > 0 ? (
            <>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto w-full">
                {unprinted.map((receipt) => (
                  <button
                    key={receipt.id}
                    onClick={() => {
                      navigate(`/r/${receipt.id}`)
                    }}
                    className="w-full p-4 border border-gray-300 rounded-lg text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-black">From: {receipt.from}</p>
                        <p className="text-sm text-gray-600">{receipt.date}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={handleBack}
                className="w-full px-6 py-2 text-gray-700 text-center font-medium hover:text-black mt-4"
              >
                Cancel
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-4">
              <p className="text-gray-600 text-center mb-2">No messages waiting to print</p>
              <button
                onClick={handleBack}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors"
                aria-label="Home"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation State */}
      {state === 'confirm' && !isLoading && (
        <div className="flex flex-col items-center justify-center gap-8 w-full max-w-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-black">
              {recipientName}
            </p>
          </div>

          <button
            onClick={handleConfirmPrint}
            className="w-full px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 active:opacity-80 transition-opacity"
          >
            Confirm Printing
          </button>

          <button
            onClick={() => setPrinterOverrideOpen(true)}
            className="w-full px-6 py-2 text-sm text-gray-400 text-center font-medium hover:text-gray-600 underline"
          >
            Change printer
          </button>

          <button
            onClick={handleBack}
            className="w-full px-6 py-2 text-gray-700 text-center font-medium hover:text-black"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Locating or Printing State */}
      {(state === 'locating' || state === 'printing') && (
        <>
          <div className="mb-16">
            <img
              src={wifiSymbol}
              alt="WiFi"
              className="w-36 h-36 object-contain mx-auto"
              style={{
                animation: 'wifi-flash 1s ease-in-out infinite',
              }}
            />
            <style>{`
              @keyframes wifi-flash {
                0%, 100% {
                  opacity: 1;
                }
                50% {
                  opacity: 0.3;
                }
              }
            `}</style>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <img
              src={printerImg}
              alt="Printer"
              className="max-w-xs h-auto object-contain"
            />
          </div>

          <p className="text-gray-600 text-base font-medium">
            {state === 'locating' ? 'Finding your printer...' : 'Sending to printer...'}
          </p>
          {selectedPrinter && (
            <p className="text-sm text-gray-400 mt-1">
              Printing at: {selectedPrinter.name}
            </p>
          )}
        </>
      )}

      {/* No Printer in Range */}
      {state === 'no-printer' && (
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-xl font-semibold text-black mb-2">
              Hmm... you're not near one of our printers.
            </p>
            <p className="text-sm text-gray-600">
              Move closer to a printer location and try again.
            </p>
          </div>

          <img
            src={printerImg}
            alt="Printer"
            className="max-w-xs h-auto object-contain opacity-50"
          />

          <button
            onClick={() => setPrinterOverrideOpen(true)}
            className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 active:opacity-80 transition-opacity"
          >
            Choose printer manually
          </button>

          <button
            onClick={handleBack}
            className="px-6 py-2 text-gray-700 text-center font-medium hover:text-black"
          >
            Back to Home
          </button>
        </div>
      )}

      {/* Location Permission Denied */}
      {state === 'no-location' && (
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-xl font-semibold text-black mb-2">
              Location access needed
            </p>
            <p className="text-sm text-gray-600 max-w-xs">
              Please enable location access in your browser to find your nearest printer.
            </p>
          </div>

          <img
            src={printerImg}
            alt="Printer"
            className="max-w-xs h-auto object-contain opacity-50"
          />

          <button
            onClick={handleBack}
            className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 active:opacity-80 transition-opacity"
          >
            Back to Home
          </button>
        </div>
      )}

      {/* Done/Success - will auto-navigate */}
      {state === 'done' && (
        <div className="flex flex-col items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-xl font-semibold text-black">Print sent!</p>
          </div>
        </div>
      )}

      {/* Hidden receipt for rasterization */}
      {receiptState && (
        <div className="absolute -left-[9999px]" style={{ width: 0, height: 0, overflow: 'hidden' }}>
          <div
            ref={receiptRef}
            className="bg-white overflow-hidden"
            style={{ fontFamily: 'Georgia, serif', width: '576px', padding: '16px 20px', backgroundColor: '#ffffff', color: '#222121', position: 'relative' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', marginTop: '12px' }}>
              {receiptState.headerVariant === 'simple' ? (
                <img src="/header-logo.svg" alt="Inklings" style={{ height: '64px', width: 'auto' }} />
              ) : receiptState.headerVariant === 'squids-checkers' ? (
                <img src="/header-squids-checkers.svg" alt="Inklings squids checkers" style={{ height: '80px', width: 'auto' }} />
              ) : receiptState.headerVariant === 'squids-v1' ? (
                <img src="/header-squids-v1.svg" alt="Inklings squids v1" style={{ height: '80px', width: 'auto' }} />
              ) : null}
            </div>

            {/* Recipient Bar */}
            <img src="/recipient-bar.png" alt="Recipient Bar" style={{ width: '100%', height: 'auto', marginBottom: '12px', display: 'block' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', marginTop: '8px', fontFamily: "'Printvetica', 'Inter Variable', sans-serif", fontSize: '32px', color: '#222121', lineHeight: 1.5 }}>
              <span>To: {recipientName}</span>
              <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>

            <ReceiptBodyRenderer
              blocks={receiptState.blocks ?? []}
              prompt={receiptState.currentPrompt}
              signature={receiptState.signature}
            />
          </div>
        </div>
      )}

      {/* Printer Picker Modal */}
      {printerOverrideOpen && (
        <PrinterPickerModal
          printers={allPrinters}
          selectedId={selectedPrinter?.id ?? null}
          onSelect={(p) => {
            setSelectedPrinter(p)
            setPrinterOverrideOpen(false)
            // If in no-printer state, auto-proceed to printing after selection
            if (state === 'no-printer') {
              setState('printing')
              setTimeout(() => {
                setState('done')
                setTimeout(() => navigate('/home'), 1000)
              }, 3000)
            }
          }}
          onClose={() => setPrinterOverrideOpen(false)}
        />
      )}
    </PageTransition>
  )
}
