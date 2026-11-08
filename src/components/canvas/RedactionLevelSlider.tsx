interface RedactionLevelSliderProps {
  value: number
  onChange: (value: number) => void
}

const REDACTION_LEVELS = [10, 35, 50, 70] as const

export default function RedactionLevelSlider({ value, onChange }: RedactionLevelSliderProps) {
  return (
    <div className="mt-4 space-y-2 bg-gray-50 p-3 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-semibold text-gray-700">Redaction Level</h3>
        <span className="text-xs text-gray-600">{value}</span>
      </div>
      <div className="flex gap-2">
        {REDACTION_LEVELS.map((level) => (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
              value === level
                ? 'bg-fill-primary text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  )
}
