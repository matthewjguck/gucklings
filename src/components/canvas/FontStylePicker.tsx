import type { TextStyle } from '@/types/canvas'
import { FONT_STYLES, STYLE_LABELS } from '@/types/canvas'

const STYLES: TextStyle[] = ['inter', 'normal', 'handwriting', 'liquida', 'redaction', 'tsuchinoko', 'dottonoji']

interface FontStylePickerProps {
  current: TextStyle
  onChange: (style: TextStyle) => void
}

function FontButton({ style, current, onChange }: { style: TextStyle; current: TextStyle; onChange: (s: TextStyle) => void }) {
  const config = FONT_STYLES[style]
  return (
    <button
      onClick={() => onChange(style)}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-colors ${
        current === style
          ? 'bg-black text-white border-black'
          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
      }`}
      style={{
        fontFamily: config.fontFamily,
        fontSize: Math.min(config.fontSize, 13),
      }}
    >
      {STYLE_LABELS[style]}
    </button>
  )
}

export default function FontStylePicker({ current, onChange }: FontStylePickerProps) {
  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pr-10 -mx-1 px-1">
        {STYLES.map(s => (
          <FontButton key={s} style={s} current={current} onChange={onChange} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white to-transparent" />
    </div>
  )
}
