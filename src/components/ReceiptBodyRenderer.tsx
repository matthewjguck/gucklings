import type { Block, TextStyle, Signature } from '@/types/canvas'
import { FONT_STYLES } from '@/types/canvas'

export interface ReceiptBodyProps {
  blocks: Block[]
  prompt?: string
  signature?: Signature | null
  senderName?: string
  scale?: number
}

/**
 * Shared receipt body renderer used by all surfaces (print, recipient, archive)
 * to ensure consistent font families, sizes, and styling.
 *
 * Does NOT render the header (logo, recipient bar, To/Date line) —
 * each surface owns that part.
 */
export default function ReceiptBodyRenderer({
  blocks,
  signature,
  senderName,
  scale = 1,
}: ReceiptBodyProps) {
  return (
    <>
      {/* Blocks */}
      <div style={{ marginBottom: `${16 * scale}px` }}>
        {blocks.map((block: Block, i: number) => (
          <div key={block.id ?? i} style={{ marginBottom: `${8 * scale}px` }}>
            {block.type === 'text' && (
              <RenderedTextBlock block={block} scale={scale} />
            )}
            {block.type === 'image' && (
              <img
                src={block.dataUrl}
                alt="block"
                style={{ maxWidth: '100%', marginBottom: `${8 * scale}px` }}
              />
            )}
            {block.type === 'sticker' && (
              <img
                src={block.ditheredDataUrl ?? block.previewUrl}
                alt="sticker"
                style={{
                  width: '100%',
                  height: 'auto',
                  marginBottom: `${8 * scale}px`,
                  objectFit: 'contain',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Signature */}
      {signature && signature.text ? (
        <div
          style={{
            fontFamily: "'Inter Variable', sans-serif",
            fontSize: `${14 * (signature.scale ?? 1) * scale}px`,
            color: '#4b5563',
            fontStyle: 'italic',
            marginLeft: `${(signature.offsetX ?? 0) * scale}px`,
            marginTop: `${(signature.offsetY ?? 0) * scale}px`,
            lineHeight: 1.4,
          }}
        >
          {signature.text}
        </div>
      ) : senderName ? (
        <div
          style={{
            borderTop: '2px solid #000',
            padding: `${16 * scale}px`,
            fontSize: `${14 * scale}px`,
            fontFamily: "'Inter Variable', sans-serif",
            fontStyle: 'italic',
            color: '#4b5563',
          }}
        >
          Love,
          <br />
          {senderName}
        </div>
      ) : null}
    </>
  )
}

function RenderedTextBlock({
  block,
  scale,
}: {
  block: Extract<Block, { type: 'text' }>
  scale: number
}) {
  const baseConfig = FONT_STYLES[block.style as TextStyle]

  let fontFamily = baseConfig.fontFamily
  if (block.style === 'redaction' && block.redactionLevel !== undefined) {
    fontFamily = `redaction-${block.redactionLevel}, sans-serif`
  }

  const fontSize =
    baseConfig.fontSize * (block.fontSizeMultiplier ?? 1) * scale

  let fontWeight = block.fontWeight ?? baseConfig.fontWeight
  if (block.isBold) {
    fontWeight = 700
  }

  return (
    <div
      style={{
        fontFamily,
        fontSize: `${fontSize}px`,
        fontWeight,
        fontStyle: block.isItalic ? 'italic' : 'normal',
        textDecoration: block.isBold ? 'underline' : 'none',
        lineHeight: baseConfig.lineHeight,
        textTransform: baseConfig.textTransform ?? 'none',
        color: '#1f2937',
      }}
    >
      {block.content}
    </div>
  )
}
