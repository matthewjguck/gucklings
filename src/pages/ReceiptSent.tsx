import { useLocation, useNavigate } from 'react-router-dom'
import PageTransition from '@/components/PageTransition'

interface ReceiptSentState {
  printPath?: string
  printState?: unknown
  recipientLabel?: string
}

export default function ReceiptSent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { printPath, printState, recipientLabel } = (location.state as ReceiptSentState | null) ?? {}

  const handlePrint = () => {
    if (printPath && printState) {
      navigate(printPath, { state: printState })
    } else {
      navigate('/home')
    }
  }

  const handleDone = () => {
    navigate('/home', { replace: true })
  }

  return (
    <PageTransition className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-callout text-text-secondary uppercase tracking-[0.2em]">sent</p>
        <h1 className="text-regular-semibold text-text-primary mt-3">
          Your Inkling was sent!
        </h1>
        <p className="text-subheadline text-text-secondary mt-3">
          {recipientLabel
            ? `We've emailed ${recipientLabel} a link to read it.`
            : "We've emailed your friend a link to read it."}
        </p>

        {printPath && (
          <button
            type="button"
            onClick={handlePrint}
            className="text-headline text-text-inverse bg-fill-primary rounded-md mt-10 flex w-full h-14 items-center justify-center"
          >
            Print a copy
          </button>
        )}

        <button
          type="button"
          onClick={handleDone}
          className={`text-headline text-text-secondary block w-full py-4 ${printPath ? 'mt-2' : 'mt-10'}`}
        >
          Done
        </button>
      </div>
    </PageTransition>
  )
}
