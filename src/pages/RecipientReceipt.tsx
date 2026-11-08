import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { submitBase64PrintJob, fetchAllActivePrinters, checkNearestPrinter } from '@/lib/printJob'
import PageTransition from '@/components/PageTransition'
import PrinterPickerModal from '@/components/PrinterPickerModal'
import type { Block } from '@/types/canvas'

type DeliveredReceipt = {
  id: string
  sender_name: string
  recipient_email: string
  content: { blocks: Block[]; prompt?: string }
  print_job_id: string | null
  printed_at: string | null
  created_at: string
  receipt_image: string | null
}

export default function RecipientReceipt() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [receipt, setReceipt] = useState<DeliveredReceipt | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [printing, setPrinting] = useState(false)
  const [printError, setPrintError] = useState<string | null>(null)
  const [printed, setPrinted] = useState(false)
  const [selectedPrinter, setSelectedPrinter] = useState<{ id: string; name: string } | null>(null)
  const [showPrinterModal, setShowPrinterModal] = useState(false)
  const [allPrinters, setAllPrinters] = useState<{ id: string; name: string }[]>([])
  const shouldAutoPrint = searchParams.get('print') === 'true'

  useEffect(() => {
    if (authLoading) return
    if (!id) return

    // If user is not logged in, don't try to load the receipt
    // They'll be prompted to sign up/login in the render
    if (!user?.email) {
      return
    }

    if (!supabase) {
      setLoadError('Supabase not configured')
      return
    }

    supabase
      .from('delivered_receipts')
      .select('*')
      .eq('id', id)
      .eq('recipient_email', user.email)
      .maybeSingle()
      .then(({ data, error }: any) => {
        if (error) {
          setLoadError(error.message)
          return
        }
        if (!data) {
          setLoadError('Receipt not found')
          return
        }
        try {
          const parsed: DeliveredReceipt = {
            ...data,
            content: typeof data.content === 'string' ? JSON.parse(data.content) : data.content,
          }
          setReceipt(parsed)
          if (data.printed_at) setPrinted(true)
        } catch (err) {
          setLoadError('Failed to parse receipt data: ' + (err instanceof Error ? err.message : String(err)))
        }
      })
  }, [id, user?.email, authLoading])

  const handlePrint = async () => {
    if (!receipt || !selectedPrinter) {
      setShowPrinterModal(true)
      return
    }

    setPrintError(null)
    setPrinting(true)
    try {
      if (!receipt.receipt_image) {
        console.error('[RecipientReceipt] Receipt has no bitmap image stored:', receipt.id)
        throw new Error('Receipt bitmap not available. This receipt may be too old. Please request a new one.')
      }

      console.log('[RecipientReceipt] Using stored bitmap for receipt:', receipt.id)
      // Add back the data URL prefix if it's missing (raw base64 from database)
      const base64Image = receipt.receipt_image.startsWith('data:')
        ? receipt.receipt_image
        : `data:image/png;base64,${receipt.receipt_image}`

      const jobId = await submitBase64PrintJob({
        base64Image,
        recipientName: receipt.recipient_email.split('@')[0],
        recipientEmail: receipt.recipient_email,
        printerId: selectedPrinter.id,
      })

      console.log('[RecipientReceipt] Print job submitted:', jobId)
      if (supabase && !jobId.startsWith('local-')) {
        await (supabase.from('delivered_receipts' as never) as any)
          .update({ print_job_id: jobId, printed_at: new Date().toISOString() })
          .eq('id', receipt.id)
      }
      setPrinted(true)
    } catch (err) {
      console.error('[RecipientReceipt] Print error:', err)
      setPrintError(err instanceof Error ? err.message : 'Print failed')
    } finally {
      setPrinting(false)
    }
  }


  // Auto-print when page loads with print=true parameter
  // Pre-fetch printers and auto-select nearest
  useEffect(() => {
    const loadPrinters = async () => {
      const printers = await fetchAllActivePrinters()
      setAllPrinters(printers)

      // Auto-select nearest printer
      const nearest = await checkNearestPrinter()
      if (nearest) {
        setSelectedPrinter(nearest)
      }
    }
    loadPrinters()
  }, [])

  useEffect(() => {
    if (receipt && shouldAutoPrint && !printing && !printed && selectedPrinter) {
      handlePrint()
    }
  }, [receipt, shouldAutoPrint, printing, printed, selectedPrinter])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <p className="text-callout text-text-secondary">Loading…</p>
      </div>
    )
  }

  // Unauthenticated view: prompt to create account or log in
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-6">
        <div className="w-full max-w-sm text-center">
          <p className="text-callout text-text-secondary uppercase tracking-[0.2em]">you've got mail</p>
          <h1 className="text-regular-semibold text-text-primary mt-3">
            You've received an Inkling
          </h1>
          <p className="text-subheadline text-text-secondary mt-3">
            Create an account or log in to view and print your message.
          </p>
          <Link
            to={`/signup?next=${encodeURIComponent(`/r/${id}`)}`}
            className="text-headline text-text-inverse bg-fill-primary rounded-md mt-8 flex w-full h-14 items-center justify-center"
          >
            Create account
          </Link>
          <Link
            to={`/login?next=${encodeURIComponent(`/r/${id}`)}`}
            className="text-callout text-text-primary mt-4 w-full text-center"
          >
            Log in
          </Link>
        </div>
      </div>
    )
  }

  if (loadError || !receipt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-6">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-regular-semibold text-text-primary">Receipt not found</h1>
          <p className="text-subheadline text-text-secondary mt-2">
            {loadError ?? 'This link may have expired.'}
          </p>
          <Link to="/" className="text-callout text-text-primary mt-6 inline-block underline">
            Go home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <PageTransition className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-sm text-center"
      >
        <p className="text-callout text-text-secondary uppercase tracking-[0.2em]">you've got mail</p>
        <h1 className="text-regular-semibold text-text-primary mt-3 leading-tight">
          Print your Inkling from {receipt.sender_name}
        </h1>
        <p className="text-subheadline text-text-secondary mt-3">
          Head to onCall to receive your message.
        </p>

        {selectedPrinter ? (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-mini text-text-secondary">Printing at:</p>
            <p className="text-callout text-text-primary font-semibold">{selectedPrinter.name}</p>
            <button
              type="button"
              onClick={() => setShowPrinterModal(true)}
              className="text-mini text-text-secondary underline mt-2 hover:text-text-primary"
            >
              Change printer
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPrinterModal(true)}
            className="text-headline text-text-secondary bg-gray-100 rounded-md mt-8 flex w-full h-12 items-center justify-center hover:bg-gray-200"
          >
            Select printer location
          </button>
        )}

        {printError && <p className="text-mini text-fill-red mt-4">{printError}</p>}

        <button
          type="button"
          onClick={handlePrint}
          disabled={printing || printed}
          className="text-headline text-text-inverse bg-fill-primary rounded-md mt-8 flex w-full h-14 items-center justify-center disabled:opacity-50"
        >
          {printed ? 'Printed' : printing ? 'Printing…' : 'Print on the Inklings printer'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/home')}
          className="text-callout text-text-secondary mt-4 w-full text-center"
        >
          Done
        </button>
      </motion.div>

      {/* Printer Picker Modal */}
      {showPrinterModal && (
        <PrinterPickerModal
          printers={allPrinters}
          selectedId={selectedPrinter?.id ?? null}
          onSelect={(p) => {
            setSelectedPrinter(p)
            setShowPrinterModal(false)
          }}
          onClose={() => setShowPrinterModal(false)}
        />
      )}
    </PageTransition>
  )
}