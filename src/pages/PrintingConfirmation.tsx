import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import PageTransition from '@/components/PageTransition'

export default function PrintingConfirmation() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const state = location.state as { receiptImage?: string; senderName?: string } | null

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Redirect if no receipt image
  useEffect(() => {
    if (!state?.receiptImage) {
      navigate('/compose')
    }
  }, [state, navigate])

  const handleSendToPrinter = async () => {
    if (isSubmitting || !state?.receiptImage) return

    setIsSubmitting(true)
    setError(null)
    setIsPrinting(true)

    try {
      // Submit print job to print server
      const response = await fetch('/api/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptImage: state.receiptImage,
          senderName: state.senderName || user?.user_metadata?.display_name || 'Family',
        }),
      })

      if (!response.ok) {
        throw new Error(`Print server error: ${response.statusText}`)
      }

      const data = await response.json()

      // Poll for print confirmation
      let printConfirmed = false
      let pollCount = 0
      const maxPolls = 30 // Poll for up to 30 seconds

      while (!printConfirmed && pollCount < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, 1000))

        const statusResponse = await fetch(`/api/print/${data.jobId}`)
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          if (statusData.status === 'printed') {
            printConfirmed = true
          }
        }
        pollCount++
      }

      if (!printConfirmed) {
        throw new Error('Print confirmation timeout - printer may not be responding')
      }

      setSuccess(true)
      setIsPrinting(false)

      // Navigate to home after 2 seconds
      setTimeout(() => {
        navigate('/home')
      }, 2000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send print job'
      console.error('[PrintingConfirmation] Error:', err)
      setError(errorMsg)
      setIsPrinting(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!state?.receiptImage) {
    return null
  }

  return (
    <PageTransition className="flex h-screen flex-col items-center justify-center bg-bg-base px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-regular-semibold text-text-primary mb-2">Printing Confirmation</h1>
        <p className="text-subheadline text-text-secondary mb-6">
          Review your message and send to printer
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            ✓ Message printed successfully! Redirecting...
          </div>
        )}

        {/* Receipt Preview */}
        <div className="mb-6 bg-white border border-gray-200 rounded p-4 max-h-80 overflow-y-auto">
          <img
            src={`data:image/png;base64,${state.receiptImage}`}
            alt="Receipt preview"
            className="w-full"
          />
        </div>

        {/* Button */}
        <button
          type="button"
          onClick={handleSendToPrinter}
          disabled={isSubmitting || success}
          className="w-full h-14 bg-black text-white rounded-md font-semibold disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
        >
          {success ? (
            <>✓ Printed</>
          ) : isPrinting ? (
            <>
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Waiting for printer...
            </>
          ) : (
            'Send to Printer'
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate('/compose')}
          disabled={isSubmitting}
          className="w-full mt-3 h-12 bg-gray-200 text-text-primary rounded-md font-semibold disabled:opacity-50 transition-opacity"
        >
          Edit Message
        </button>
      </div>
    </PageTransition>
  )
}
