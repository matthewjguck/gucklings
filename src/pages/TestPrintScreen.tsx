import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { renderToPrintBuffer } from '@/lib/escpos'
import type { DitherMethod } from '@/lib/escpos'
import { submitPrintJob } from '@/lib/printJob'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdmin } from '@/lib/admin'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Status = 'idle' | 'rendering' | 'sending' | 'done' | 'error'
type Printer = Database['public']['Tables']['printers']['Row']

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(out).set(bytes)
  return out
}

export default function TestPrintScreen() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const isAdmin = useIsAdmin()
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [lastSize, setLastSize] = useState<number | null>(null)
  const [ditherMethod, setDitherMethod] = useState<DitherMethod>('floyd-steinberg')
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [printers, setPrinters] = useState<Printer[]>([])
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(null)
  const [useGeofence, setUseGeofence] = useState(false)

  useEffect(() => {
    if (loading) {
      return
    }

    if (!isAdmin) {
      navigate('/home')
      return
    }

    if (!supabase) return

    const fetchPrinters = async () => {
      if (!supabase) return
      const { data } = await supabase
        .from('printers')
        .select('*')
        .eq('is_active', true)
      if (data) {
        setPrinters(data)
        if (data.length > 0) {
          setSelectedPrinterId(data[0].id)
        }
      }
    }

    fetchPrinters()
  }, [isAdmin, navigate, loading])

  async function handleImageSelected(file: File | null) {
    if (!file) {
      setImageDataUrl(null)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        setImageDataUrl(result)
      }
    }
    reader.readAsDataURL(file)
  }

  async function handlePrint() {
    if (!imageContainerRef.current) return

    setStatus('rendering')
    setError('')

    try {
      await renderToPrintBuffer(imageContainerRef.current, { ditherMethod })
      setStatus('sending')

      if (!user?.id) {
        throw new Error('Not logged in. Please log in to print.')
      }

      await submitPrintJob({
        receiptElement: imageContainerRef.current,
        recipientName: 'Test',
        recipientEmail: 'test@stanford.edu',
        messageText: 'Test image print',
        receiptStateJson: JSON.stringify({
          blocks: [],
          prompt: 'Test print',
          headerVariant: 'simple',
          currentPrompt: 'Test print',
        }),
        printerId: selectedPrinterId ?? undefined,
        skipGeofence: !useGeofence,
      })

      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }

  async function handleDownload() {
    if (!imageContainerRef.current) return

    setStatus('rendering')
    setError('')

    try {
      const { buffer } = await renderToPrintBuffer(imageContainerRef.current, { ditherMethod })
      setLastSize(buffer.length)

      const blob = new Blob([toArrayBuffer(buffer)], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'image.bin'
      a.click()
      URL.revokeObjectURL(url)

      setStatus('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStatus('error')
    }
  }




  const statusLabel: Record<Status, string> = {
    idle: '',
    rendering: 'Rendering bitmap...',
    sending: 'Sending to printer...',
    done: `Sent${lastSize ? ` (${(lastSize / 1024).toFixed(1)} KB)` : ''}`,
    error: `Error: ${error}`,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-2xl mx-auto">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Image Print Test</h1>
        <p className="text-sm text-gray-500 mb-6">
          Print long images to thermal printer — POS80 @ 576 dots wide
        </p>

        {!user?.id && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded text-orange-700 text-sm">
            ⚠️ Not logged in. <a href="/login" className="underline">Log in</a> to print.
          </div>
        )}

        {/* Dithering method */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 block mb-1">Dithering method</label>
          <select
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
            value={ditherMethod}
            onChange={(e) => setDitherMethod(e.target.value as DitherMethod)}
          >
            <option value="floyd-steinberg">Floyd-Steinberg (default)</option>
            <option value="atkinson">Atkinson</option>
            <option value="ordered">Ordered (Bayer 4x4)</option>
            <option value="threshold">Threshold (hard black/white)</option>
          </select>
        </div>

        {/* Printer selector */}
        {printers.length > 0 && (
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 block mb-1">Printer</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
              value={selectedPrinterId || ''}
              onChange={(e) => setSelectedPrinterId(e.target.value)}
            >
              {printers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Geofence test checkbox */}
        <div className="mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useGeofence}
              onChange={(e) => setUseGeofence(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">Test geofence routing</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            {useGeofence
              ? 'Will use your location to find nearest printer'
              : 'Will use first active printer (default)'}
          </p>
        </div>

        {/* Image upload */}
        <div className="mb-4 bg-white border border-gray-200 rounded p-4">
          <label className="text-sm font-medium text-gray-700 block mb-2">Upload image</label>
          <input
            type="file"
            accept="image/*"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            onChange={(e) => handleImageSelected(e.target.files?.[0] ?? null)}
          />
          {imageDataUrl && (
            <div className="mt-3 space-y-2">
              <button
                type="button"
                className="px-3 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                onClick={() => setImageDataUrl(null)}
              >
                Remove image
              </button>
            </div>
          )}
        </div>

        {/* Image preview: the actual component that will be rasterized */}
        {imageDataUrl && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-2">Preview (will be sent to printer):</p>
            <div
              ref={imageContainerRef}
              style={{ width: '80mm', maxWidth: '100%', background: 'white' }}
            >
              <img
                src={imageDataUrl}
                alt="Image to print"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        {imageDataUrl && (
          <div className="flex gap-3 mb-4">
            <button
              onClick={handlePrint}
              disabled={status === 'rendering' || status === 'sending'}
              className="px-4 py-2 bg-orange-500 text-white rounded font-medium text-sm hover:bg-orange-600 disabled:opacity-50 flex-1"
            >
              {status === 'sending' ? 'Sending...' : 'Print'}
            </button>
            <button
              onClick={handleDownload}
              disabled={status === 'rendering' || status === 'sending'}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-medium text-sm hover:bg-gray-300 disabled:opacity-50"
            >
              Download .bin
            </button>
          </div>
        )}

        {/* Status */}
        {status !== 'idle' && (
          <p className={`text-sm ${status === 'error' ? 'text-red-600' : status === 'done' ? 'text-green-600' : 'text-gray-500'}`}>
            {statusLabel[status]}
          </p>
        )}

        {/* Instructions */}
        <div className="mt-8 bg-white border border-gray-200 rounded p-4 text-sm text-gray-600 space-y-3">
          <h2 className="font-semibold text-gray-800">How to use</h2>
          <p>1. Make sure you're logged in</p>
          <p>2. Upload an image (supports long/tall images)</p>
          <p>3. Choose dithering method (Floyd-Steinberg recommended)</p>
          <p>4. Click <strong>Print</strong> to send to your Raspberry Pi</p>
          <p>5. Your Pi will pick up the job and print within 3 seconds</p>
          <hr className="border-gray-200" />
          <p className="text-xs text-gray-400">
            Images are automatically scaled to 576 pixels wide (thermal printer width). Download .bin to save the raw ESC/POS binary.
          </p>
        </div>
      </div>
    </div>
  )
}
