import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import TextBlock from '@/components/canvas/TextBlock'
import ImageBlock from '@/components/canvas/ImageBlock'
import StickerBlock from '@/components/canvas/StickerBlock'
import BlockToolbar from '@/components/canvas/BlockToolbar'
import GiphyStickerPicker from '@/components/canvas/GiphyStickerPicker'
import FontStylePicker from '@/components/canvas/FontStylePicker'
import FontSizeSlider from '@/components/canvas/FontSizeSlider'
import FontWeightSlider from '@/components/canvas/FontWeightSlider'
import RedactionLevelSlider from '@/components/canvas/RedactionLevelSlider'
import ImageAdjustmentPanel from '@/components/canvas/ImageAdjustmentPanel'
import { DEFAULT_ADJUSTMENTS } from '@/lib/imageProcessing'
import { loadDraft, clearDraft } from '@/lib/onboardingDraft'
import { renderToPrintBuffer } from '@/lib/escpos'
import { useAuth } from '@/contexts/AuthContext'
import type { Block, TextStyle, Signature, CornerSticker } from '@/types/canvas'
import { newBlockId, STYLE_LABELS } from '@/types/canvas'
import recipientBarSvg from '@/assets/icons/recipient-bar.svg'

export default function ReceiptEditor() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const draft = loadDraft()
  const recipientFriendId = searchParams.get('to')
  const recipientEmail = searchParams.get('email')

  // State
  const [blocks, setBlocks] = useState<Block[]>(() => {
    const existing: Block[] = loadDraft().content?.blocks ?? []
    const hasImage = existing.some((b) => b.type === 'image')
    const hasText = existing.some((b) => b.type === 'text')
    const merged: Block[] = []
    if (!hasImage) merged.push({ id: newBlockId(), type: 'image', dataUrl: '' })
    if (!hasText) merged.push({ id: newBlockId(), type: 'text', content: '', style: 'inter' })
    return [...merged, ...existing]
  })
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [error, _setError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)
  const [signature, setSignature] = useState<Signature>(() => {
    const draftSignature = loadDraft().content?.signature
    if (draftSignature) return draftSignature
    let name = ''
    if (user?.user_metadata?.display_name) {
      name = (user.user_metadata.display_name as string).split(' ')[0]
    } else if (user?.user_metadata?.full_name) {
      name = (user.user_metadata.full_name as string).split(' ')[0]
    } else if (user?.email) {
      name = user.email.split('@')[0]
    }
    return { text: name ? `Love, ${name}` : 'Love, ', style: 'inter' }
  })
  const [signatureActive, setSignatureActive] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null)
  const signatureAreaRef = useRef<HTMLDivElement>(null)
  const recipientNameRef = useRef<HTMLDivElement>(null)


  // Handle deselecting signature with Escape key or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && signatureActive) {
        setSignatureActive(false)
      }
    }

    const handleClick = (e: MouseEvent) => {
      if (signatureActive && signatureAreaRef.current && !signatureAreaRef.current.contains(e.target as Node)) {
        setSignatureActive(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', handleClick)
    }
  }, [signatureActive])

  const [recipientDisplayName, setRecipientDisplayName] = useState(() => {
    if (draft.recipient?.name) return draft.recipient.name
    if (recipientFriendId) return recipientFriendId
    if (recipientEmail) return recipientEmail.split('@')[0]
    return ''
  })

  // Initialize contentEditable with recipient name
  useEffect(() => {
    if (recipientNameRef.current && !recipientNameRef.current.textContent) {
      recipientNameRef.current.textContent = recipientDisplayName
    }
  }, [])

  const addTextBlock = () => {
    const newBlock: Block = {
      id: newBlockId(),
      type: 'text',
      content: '',
      style: 'inter',
    }
    setBlocks([...blocks, newBlock])
    setActiveBlockId(newBlock.id)
  }

  const addImageBlock = () => {
    const newBlock: Block = {
      id: newBlockId(),
      type: 'image',
      dataUrl: '',
    }
    setBlocks([...blocks, newBlock])
    setActiveBlockId(newBlock.id)
  }

  const handleAddSticker = (sticker: CornerSticker) => {
    const active = blocks.find((b) => b.id === activeBlockId)
    if (active && active.type === 'sticker' && !active.previewUrl) {
      // Fill the existing empty sticker slot instead of appending a new one.
      setBlocks(blocks.map((b) => (b.id === active.id ? { ...b, previewUrl: sticker.previewUrl, fullUrl: sticker.fullUrl, ditheredDataUrl: sticker.ditheredDataUrl } : b)))
      return
    }
    const newBlock: Block = {
      id: newBlockId(),
      type: 'sticker',
      previewUrl: sticker.previewUrl,
      fullUrl: sticker.fullUrl,
      ditheredDataUrl: sticker.ditheredDataUrl,
    }
    setBlocks([...blocks, newBlock])
    setActiveBlockId(newBlock.id)
  }

  const updateBlock = (id: string, updates: any) => {
    setBlocks(blocks.map(block => (block.id === id ? { ...block, ...updates } : block)))
  }

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(block => block.id !== id))
    setActiveBlockId(null)
  }

  const handleDragStart = (blockId: string) => {
    setDraggedBlockId(blockId)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (targetBlockId: string) => {
    if (!draggedBlockId || draggedBlockId === targetBlockId) return

    const draggedIndex = blocks.findIndex(b => b.id === draggedBlockId)
    const targetIndex = blocks.findIndex(b => b.id === targetBlockId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const newBlocks = [...blocks]
    const [draggedBlock] = newBlocks.splice(draggedIndex, 1)
    newBlocks.splice(targetIndex, 0, draggedBlock)
    setBlocks(newBlocks)
    setDraggedBlockId(null)
  }

  const handleContinue = async () => {
    if (isSending) return
    if (blocks.length === 0 || !receiptRef.current) return

    setIsSending(true)
    _setError(null)
    try {
      // Clone and clean up receiptRef for bitmap capture
      const cleanReceipt = receiptRef.current.cloneNode(true) as HTMLElement
      cleanReceipt.style.position = 'absolute'
      cleanReceipt.style.left = '-9999px'
      cleanReceipt.style.width = '576px'
      document.body.appendChild(cleanReceipt)

      // Remove all buttons from the cloned receipt (delete buttons)
      cleanReceipt.querySelectorAll('button').forEach(el => {
        el.parentNode?.removeChild(el)
      })

      // Remove editor UI elements: dashed borders, placeholder text, etc.
      cleanReceipt.querySelectorAll('[style*="border-dashed"], .border-dashed').forEach(el => {
        const htmlEl = el as HTMLElement
        htmlEl.style.setProperty('border-top-style', 'none')
        htmlEl.style.setProperty('border-top-width', '0')
      })
      cleanReceipt.querySelectorAll('input, textarea').forEach(el => {
        const inputEl = el as HTMLInputElement | HTMLTextAreaElement
        const placeholder = inputEl.placeholder
        if (placeholder && !inputEl.value) {
          inputEl.value = ''
        }
        inputEl.style.border = 'none'
        inputEl.style.outline = 'none'
      })
      // Remove "From:" line
      cleanReceipt.querySelectorAll('div').forEach(el => {
        if (el.textContent?.includes('From:') && el.textContent?.includes('Matthew')) {
          (el as HTMLElement).style.display = 'none'
        }
      })

      // Hide empty text blocks - use multiple strategies to ensure they're hidden

      // Strategy 1: Hide by data-block-id
      const blockDivs = cleanReceipt.querySelectorAll('div[data-block-id]')
      console.log('[ReceiptEditor] Found block divs:', blockDivs.length, 'Empty blocks:', blocks.filter(b => b.type === 'text' && !b.content).length)
      blockDivs.forEach(div => {
        const blockId = (div as HTMLElement).getAttribute('data-block-id')
        const block = blocks.find(b => b.id === blockId)
        if (block && block.type === 'text' && !block.content) {
          (div as HTMLElement).style.display = 'none'
        }
      })

      // Strategy 2: Hide contentEditable divs that only contain placeholder text
      cleanReceipt.querySelectorAll('[contenteditable]').forEach(el => {
        const text = (el as HTMLElement).textContent?.trim()
        if (!text || text.includes('Type something')) {
          (el as HTMLElement).style.display = 'none'
        }
      })

      // Render receipt to ESC/POS buffer
      console.log('[ReceiptEditor] Starting bitmap capture...')
      const { buffer, imageBase64 } = await renderToPrintBuffer(cleanReceipt)
      document.body.removeChild(cleanReceipt)
      console.log('[ReceiptEditor] Bitmap captured, ESC/POS buffer length:', buffer.length)

      // Convert ESC/POS buffer to base64 for transmission
      const uint8Array = new Uint8Array(buffer)
      let binaryString = ''
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i])
      }
      const receiptImageBase64 = btoa(binaryString)

      // Get sender name from metadata with fallbacks
      let senderName = user?.user_metadata?.display_name as string | undefined
      if (!senderName && user?.user_metadata?.full_name) {
        senderName = (user.user_metadata.full_name as string).split(' ')[0]
      }
      if (!senderName) {
        senderName = user?.email?.split('@')[0] || 'Family'
      }

      // Navigate to printing confirmation to show receipt and wait for print confirmation
      clearDraft()
      navigate('/printing-confirmation', {
        state: {
          receiptImage: receiptImageBase64,
          senderName,
        },
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to generate receipt image'
      console.error('Failed to generate receipt image:', err)
      _setError(errorMsg)
    } finally {
      setIsSending(false)
    }
  }

  const handlePreview = async () => {
    if (blocks.length === 0 || !receiptRef.current) return

    try {
      const cleanReceipt = receiptRef.current.cloneNode(true) as HTMLElement
      cleanReceipt.style.position = 'absolute'
      cleanReceipt.style.left = '-9999px'
      cleanReceipt.style.width = '576px'
      document.body.appendChild(cleanReceipt)

      cleanReceipt.querySelectorAll('[style*="border-dashed"]').forEach(el => {
        (el as HTMLElement).style.display = 'none'
      })
      cleanReceipt.querySelectorAll('input, textarea').forEach(el => {
        const inputEl = el as HTMLInputElement | HTMLTextAreaElement
        inputEl.style.border = 'none'
        inputEl.style.outline = 'none'
      })
      cleanReceipt.querySelectorAll('div').forEach(el => {
        if (el.textContent?.includes('From:') && el.textContent?.includes('Matthew')) {
          (el as HTMLElement).style.display = 'none'
        }
      })

      const { imageBase64 } = await renderToPrintBuffer(cleanReceipt)
      document.body.removeChild(cleanReceipt)

      setPreviewImage(imageBase64 || null)
    } catch (err) {
      console.error('Preview failed:', err)
    }
  }

  const updateSignature = (updates: Partial<Signature> | ((current: Signature) => Partial<Signature>)) => {
    setSignature((current) => {
      const nextUpdates = typeof updates === 'function' ? updates(current) : updates
      return {
        ...current,
        ...nextUpdates,
        rotation: nextUpdates.rotation ?? current.rotation ?? 0,
        scale: nextUpdates.scale ?? current.scale ?? 1,
        offsetX: nextUpdates.offsetX ?? current.offsetX ?? 0,
        offsetY: nextUpdates.offsetY ?? current.offsetY ?? 0,
      }
    })
  }


  const activeBlock = blocks.find(b => b.id === activeBlockId)
  const hasEmptyBlocks = blocks.some(b =>
    (b.type === 'text' && !b.content) ||
    (b.type === 'image' && !b.dataUrl)
  )

  return (
    <div className="min-h-screen bg-white flex flex-col pb-16">
      <div className="px-6 pt-12 flex-1 overflow-y-auto flex flex-col">

        {/* Back button — matches the circular IconButton style used elsewhere */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => navigate('/home')}
            aria-label="Back to home"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path
                d="M15 6L9 12L15 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Block Status Notice */}
        <div className={`mb-6 p-3 border rounded text-xs ${
          hasEmptyBlocks
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          {hasEmptyBlocks
            ? 'Bug Notice: Please delete empty image or text blocks before sending. Fix coming soon <3'
            : 'All blocks have content. Ready to send! ✓'}
        </div>

        {/* Receipt paper */}
        <div
          ref={receiptRef}
          className="bg-white shadow-md mb-6 overflow-hidden"
          style={{ fontFamily: 'Georgia, serif', borderTop: '1px solid rgba(0,0,0,0.08)', borderLeft: '1px solid rgba(0,0,0,0.08)', borderRight: '1px solid rgba(0,0,0,0.08)' }}
        >
        <div className="p-5 space-y-3">
          {/* Header */}
          <div className="mb-4 mt-6 flex justify-center">
            <img src="/gucklings-logo.svg" alt="Gucklings" className="h-auto max-w-full" />
          </div>

          {/* Recipient Bar */}
          <div className="mb-3">
            <img src={recipientBarSvg} alt="" className="w-full h-auto" />
          </div>

          {/* Recipient Info */}
          <div className="px-3 text-black mb-3" style={{ fontFamily: "var(--font-printvetica)", fontSize: 'clamp(22px, 3.5vw, 22px)', lineHeight: '1.25em', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
            <div style={{ flex: '0 0 40%', display: 'inline-flex', gap: '8px', alignItems: 'center', minWidth: 0 }}>
              <span style={{ display: 'inline-block', verticalAlign: 'top' }}>To:</span>
              <div
                ref={recipientNameRef}
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setRecipientDisplayName(e.currentTarget.textContent || '')}
                className="bg-transparent outline-none flex-1 min-w-0"
                style={{ fontFamily: "var(--font-printvetica)", padding: 0, margin: 0, display: 'inline-block', verticalAlign: 'top', minWidth: '100px' }}
              />
            </div>
            <span style={{ flex: '0 0 40%', whiteSpace: 'nowrap', textAlign: 'right', display: 'inline' }}>
              {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>


          {/* Blocks Editor */}
          <div className="space-y-2 my-4">
            {blocks.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-6">Add text, images, or stickers...</p>
            ) : (
              blocks.map(block => (
                <div
                  key={block.id}
                  data-block-id={block.id}
                  draggable
                  onClick={() => {
                    setActiveBlockId(block.id)
                  }}
                  onDragStart={() => handleDragStart(block.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(block.id)}
                  className={`relative group cursor-move select-none ${draggedBlockId === block.id ? 'opacity-50' : ''}`}
                >
                  {block.type === 'text' && (
                    <TextBlock
                      content={block.content}
                      style={block.style}
                      fontSizeMultiplier={block.fontSizeMultiplier}
                      redactionLevel={block.redactionLevel}
                      fontWeight={block.fontWeight}
                      isItalic={block.isItalic}
                      isBold={block.isBold}
                      isActive={activeBlockId === block.id}
                      onContentChange={content => updateBlock(block.id, { content })}
                      onFocus={() => setActiveBlockId(block.id)}
                      onDelete={() => deleteBlock(block.id)}
                    />
                  )}
                  {block.type === 'image' && (
                    <ImageBlock
                      dataUrl={block.dataUrl}
                      adjustments={block.adjustments}
                      isActive={activeBlockId === block.id}
                      onImageChange={dataUrl => updateBlock(block.id, { dataUrl })}
                      onFocus={() => setActiveBlockId(block.id)}
                      onDelete={() => deleteBlock(block.id)}
                    />
                  )}
                  {block.type === 'sticker' && (
                    <StickerBlock
                      previewUrl={block.previewUrl}
                      fullUrl={block.fullUrl}
                      ditheredDataUrl={block.ditheredDataUrl}
                      isActive={activeBlockId === block.id}
                      onFocus={() => setActiveBlockId(block.id)}
                      onDelete={() => deleteBlock(block.id)}
                    />
                  )}
                  {activeBlockId === block.id && !(block.type === 'text' && !block.content) && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); deleteBlock(block.id) }}
                      className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-red-500 text-white text-lg flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                      aria-label="Delete block"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Bottom row: Signature */}
          <div className="mt-8 pt-4 border-t border-dashed border-gray-200">
            <div
              ref={signatureAreaRef}
              className="py-2"
            >
              <input
                type="text"
                value={signature.text}
                onChange={(e) => updateSignature({ text: e.target.value })}
                placeholder="Love, [your name]"
                className="w-full focus:outline-none border-0 bg-transparent px-0 italic"
                style={{
                  fontFamily: 'printvetica',
                  fontSize: '28px',
                  lineHeight: '1.9',
                  color: '#000000',
                  padding: '8px',
                }}
              />
            </div>
          </div>
        </div>
        </div>

        {/* Block Toolbar */}
        <BlockToolbar
          onAddText={addTextBlock}
          onAddImage={addImageBlock}
          onAddSticker={() => setShowStickerPicker(true)}
        />

        {/* Preview Button */}
        <button
          type="button"
          onClick={handlePreview}
          disabled={blocks.length === 0}
          className="mt-4 text-xs text-text-primary bg-white rounded-md flex w-full h-10 items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
        >
          Preview Inkling
        </button>

        {/* Font Style Picker - collapsed by default; click 'Customize text' to open */}
        {activeBlock?.type === 'text' && (
          <details className="mt-4 group">
            <summary className="text-xs font-medium text-gray-500 cursor-pointer select-none list-none flex items-center gap-1 hover:text-gray-700">
              <span className="inline-block transition-transform group-open:rotate-90">›</span>
              Customize text
            </summary>
            <div className="mt-3 space-y-5">
            <FontStylePicker
              current={activeBlock.style}
              onChange={style => updateBlock(activeBlock.id, { style: style as TextStyle })}
            />
            <FontSizeSlider
              value={activeBlock.fontSizeMultiplier ?? 1}
              onChange={fontSizeMultiplier => updateBlock(activeBlock.id, { fontSizeMultiplier })}
            />
            {activeBlock.style === 'redaction' && (
              <RedactionLevelSlider
                value={activeBlock.redactionLevel ?? 50}
                onChange={redactionLevel => updateBlock(activeBlock.id, { redactionLevel })}
              />
            )}
            {activeBlock.style === 'inter' && (
              <FontWeightSlider
                value={activeBlock.fontWeight ?? 400}
                onChange={fontWeight => updateBlock(activeBlock.id, { fontWeight })}
              />
            )}
            {activeBlock.style === 'tsuchinoko' && (
              <div className="flex gap-2">
                <button
                  onClick={() => updateBlock(activeBlock.id, { isBold: !activeBlock.isBold })}
                  className={`px-3 py-2 rounded text-sm font-bold transition-colors ${
                    activeBlock.isBold
                      ? 'bg-fill-primary text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  Bold
                </button>
              </div>
            )}
            </div>
          </details>
        )}

        {/* Signature Font Picker - shown when signature is active */}
        {signatureActive && (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              {Object.entries(STYLE_LABELS).map(([style, label]) => (
                <button
                  key={style}
                  onClick={() => updateSignature({ style: style as TextStyle })}
                  className={`px-3 py-2 rounded text-sm font-semibold transition-colors ${
                    signature.style === style
                      ? 'bg-fill-primary text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Image Adjustment Panel - collapsed by default */}
        {activeBlock?.type === 'image' && (
          <details className="mt-4 group">
            <summary className="text-xs font-medium text-gray-500 cursor-pointer select-none list-none flex items-center gap-1 hover:text-gray-700">
              <span className="inline-block transition-transform group-open:rotate-90">›</span>
              Customize image
            </summary>
            <ImageAdjustmentPanel
              dataUrl={activeBlock.dataUrl}
              adjustments={activeBlock.adjustments ?? DEFAULT_ADJUSTMENTS}
              onAdjustmentsChange={adjustments => updateBlock(activeBlock.id, { adjustments })}
            />
          </details>
        )}

        {/* Sticker Picker Modal */}
        {showStickerPicker && (
          <GiphyStickerPicker
            onSelect={handleAddSticker}
            onClose={() => setShowStickerPicker(false)}
          />
        )}

        {error && (
          <p className="mt-4 text-xs text-red-600">{error}</p>
        )}

        {/* Preview Image */}
        {previewImage && (
          <div className="mt-6 border-2 border-dashed border-gray-300 rounded-md p-4 bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-medium text-gray-600">Bitmap Preview</p>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Close
              </button>
            </div>
            <img src={previewImage} alt="Receipt preview" className="w-full h-auto border border-gray-200" />
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto pt-10 pb-4 space-y-2">
          <button
            type="button"
            onClick={handleContinue}
            disabled={blocks.length === 0 || isSending}
            className="text-callout text-text-inverse bg-fill-primary rounded-md flex w-full h-14 items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:opacity-80 transition-opacity"
          >
            {isSending ? 'Sending…' : 'Continue to Send'}
          </button>
        </div>

      </div>
    </div>
  )
}
