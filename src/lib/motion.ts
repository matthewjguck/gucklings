import type { Variants, Transition } from 'framer-motion'

/* ── Shared easing curves ─────────────────────────────────── */

export const easeOut = [0.16, 1, 0.3, 1] as const
export const easeInOut = [0.4, 0, 0.2, 1] as const

/* ── Transition presets ───────────────────────────────────── */

export const springGentle: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 30,
}

export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 35,
}

export const durationFast: Transition = {
  duration: 0.2,
  ease: easeOut as unknown as [number, number, number, number],
}

export const durationNormal: Transition = {
  duration: 0.3,
  ease: easeOut as unknown as [number, number, number, number],
}

export const durationSlow: Transition = {
  duration: 0.5,
  ease: easeOut as unknown as [number, number, number, number],
}

/* ── Page transition variants ─────────────────────────────── */

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export const pageTransition: Transition = {
  duration: 0.25,
  ease: easeOut as unknown as [number, number, number, number],
}

/* ── Fade variants ────────────────────────────────────────── */

export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const fadeTransition: Transition = {
  duration: 0.2,
  ease: 'easeOut',
}

/* ── Slide-up (modals, bottom sheets) ─────────────────────── */

export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: '100%' },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: '100%' },
}

export const slideUpTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

/* ── Scale-fade (buttons, cards on tap) ───────────────────── */

export const scaleFadeVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

/* ── Stagger children ─────────────────────────────────────── */

export const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.06 },
  },
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}
