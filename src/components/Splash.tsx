import { useEffect, useState } from 'react'

const PHASES = ['Inklings', 'a new way to connect']

const TYPE_MS = 65
const HOLD_MS = 700
const FADE_MS = 400

export default function Splash({ onComplete }: { onComplete: () => void }) {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (phaseIdx >= PHASES.length) {
      onComplete()
      return
    }

    const text = PHASES[phaseIdx]
    setDisplayed('')
    setFading(false)

    let i = 0
    const type = setInterval(() => {
      i += 1
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(type)
    }, TYPE_MS)

    const preFadeMs = text.length * TYPE_MS + HOLD_MS
    const fadeTimer = setTimeout(() => setFading(true), preFadeMs)
    const advanceTimer = setTimeout(
      () => setPhaseIdx((p) => p + 1),
      preFadeMs + FADE_MS,
    )

    return () => {
      clearInterval(type)
      clearTimeout(fadeTimer)
      clearTimeout(advanceTimer)
    }
  }, [phaseIdx, onComplete])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-base">
      <h1
        className="text-regular-semibold text-text-primary transition-opacity"
        style={{
          transitionDuration: `${FADE_MS}ms`,
          opacity: fading ? 0 : 1,
        }}
      >
        {displayed}
        <span
          aria-hidden
          className="bg-text-primary ml-[2px] inline-block h-[0.95em] w-[2px] animate-pulse align-[-0.12em]"
        />
      </h1>
    </div>
  )
}
