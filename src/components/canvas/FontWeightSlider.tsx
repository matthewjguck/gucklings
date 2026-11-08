interface FontWeightSliderProps {
  value: number
  onChange: (value: number) => void
}

const weightLabels: Record<number, string> = {
  100: 'Thin',
  200: 'Extra Light',
  300: 'Light',
  400: 'Normal',
  500: 'Medium',
  600: 'Semi Bold',
  700: 'Bold',
  800: 'Extra Bold',
  900: 'Black',
}

export default function FontWeightSlider({ value, onChange }: FontWeightSliderProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-gray-600 w-12 shrink-0">Weight</span>
      <input
        type="range"
        min="100"
        max="900"
        step="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="flex-1 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-black"
      />
      <span className="text-xs text-gray-500 w-24 shrink-0 text-right tabular-nums">
        {weightLabels[value] || value}
      </span>
    </div>
  )
}
