import { useRef, useEffect, useCallback } from 'react'
import type { TextStyle } from '@/types/canvas'
import { FONT_STYLES } from '@/types/canvas'

interface TextBlockProps {
  content: string
  style: TextStyle
  fontSizeMultiplier?: number
  redactionLevel?: number
  fontWeight?: number
  isItalic?: boolean
  isBold?: boolean
  isActive: boolean
  onContentChange: (content: string) => void
  onFocus: () => void
  onDelete: () => void
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />')
}

export default function TextBlock({
  content,
  style,
  fontSizeMultiplier = 1,
  redactionLevel = 50,
  fontWeight,
  isItalic = false,
  isBold = false,
  isActive,
  onContentChange,
  onFocus,
  onDelete,
}: TextBlockProps) {
  const ref = useRef<HTMLDivElement>(null)
  let fontConfig = FONT_STYLES[style]
  const adjustedFontSize = fontConfig.fontSize * fontSizeMultiplier

  // Override fontFamily for redaction based on level
  if (style === 'redaction') {
    fontConfig = {
      ...fontConfig,
      fontFamily: `redaction-${redactionLevel}, sans-serif`,
    }
  }

  // Override fontWeight if provided
  if (fontWeight !== undefined) {
    fontConfig = {
      ...fontConfig,
      fontWeight,
    }
  }

  // Override fontWeight for bold (used by tsuchinoko)
  if (isBold) {
    fontConfig = {
      ...fontConfig,
      fontWeight: 700,
    }
  }

  const syncContent = useCallback(() => {
    if (!ref.current) return
    const text = ref.current.innerText
    if (text !== content) {
      onContentChange(text)
    }
  }, [content, onContentChange])

  useEffect(() => {
    if (!ref.current) return
    const rendered = renderMarkdown(content)
    if (ref.current.innerHTML !== rendered) {
      const sel = window.getSelection()
      const hadFocus = document.activeElement === ref.current
      const offset = sel && hadFocus ? sel.focusOffset : null
      ref.current.innerHTML = rendered
      if (hadFocus && offset !== null) {
        try {
          const range = document.createRange()
          const node = ref.current.lastChild ?? ref.current
          range.setStart(node, Math.min(offset, (node.textContent?.length ?? 0)))
          range.collapse(true)
          sel?.removeAllRanges()
          sel?.addRange(range)
        } catch {
          // ignore range errors
        }
      }
    }
  }, [content])

  return (
    <div className={`group relative ${isActive ? 'ring-1 ring-fill-tertiary ring-offset-1 rounded' : ''}`}>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={syncContent}
        onFocus={onFocus}
        onBlur={syncContent}
        data-placeholder="Type something..."
        data-font-weight={fontConfig.fontWeight}
        className="w-full outline-none min-h-[1.5em] empty:before:content-[attr(data-placeholder)] empty:before:text-gray-300 empty:before:[font-family:inherit]"
        style={{
          fontFamily: fontConfig.fontFamily,
          fontSize: adjustedFontSize,
          fontWeight: fontConfig.fontWeight as any,
          fontStyle: isItalic ? 'italic' : 'normal',
          lineHeight: fontConfig.lineHeight,
          textTransform: fontConfig.textTransform ?? 'none',
          color: '#000',
        }}
      />
      {isActive && (
        <button
          onClick={onDelete}
          className="absolute -right-3 -top-3 w-6 h-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
          aria-label="Delete block"
        >
          &times;
        </button>
      )}
    </div>
  )
}
