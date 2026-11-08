interface FontSizeSliderProps {
  value: number
  onChange: (value: number) => void
}

export default function FontSizeSlider({ value, onChange }: FontSizeSliderProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-gray-600 w-12 shrink-0">Size</span>
      <input
        type="range"
        min="0.5"
        max="3"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-black"
      />
      <span className="text-xs text-gray-500 w-12 shrink-0 text-right tabular-nums">
        {Math.round(value * 100)}%
      </span>
    </div>
  )
}
