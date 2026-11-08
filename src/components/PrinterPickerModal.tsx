import { motion } from 'framer-motion'

interface PrinterPickerModalProps {
  printers: { id: string; name: string }[]
  selectedId: string | null
  onSelect: (printer: { id: string; name: string }) => void
  onClose: () => void
}

export default function PrinterPickerModal({
  printers,
  selectedId,
  onSelect,
  onClose,
}: PrinterPickerModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm p-6 shadow-xl border border-fill-tertiary bg-white"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Choose a printer</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1 w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {printers.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-4">No printers available</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {printers.map(printer => (
              <button
                key={printer.id}
                onClick={() => onSelect(printer)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <span className="text-sm font-medium text-gray-900">{printer.name}</span>
                {selectedId === printer.id && (
                  <svg
                    className="w-5 h-5 text-gray-900"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
