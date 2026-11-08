import { motion } from 'framer-motion'
import starSvg from '@/assets/icons/star.svg'
import cameraSvg from '@/assets/icons/camera.svg'
import envelopeSvg from '@/assets/icons/envelope.svg'
import postcardSvg from '@/assets/icons/postcardinclings.svg'
import receiptSvg from '@/assets/icons/reciptinklings.svg'

/**
 * Static scrapbook-style collage for the home screen.
 * Pieces bounce in from the top-left or top-right corner with a spring stagger.
 */

const bounce = {
  type: 'spring' as const,
  stiffness: 220,
  damping: 14,
  mass: 1,
}

// Off-screen start positions (top-left and top-right corners)
const fromLeft = { x: -420, y: -360 }
const fromRight = { x: 420, y: -360 }

export default function HomeCollage() {
  return (
    <div className="relative w-full max-w-md aspect-[5/6]">
      {/* Postcard — back layer, from top-left */}
      <motion.img
        src={postcardSvg}
        alt=""
        className="absolute top-[4%] left-[11%] w-[44%] z-10"
        initial={{ ...fromLeft, rotate: -9 }}
        animate={{ x: 0, y: 0, rotate: -9 }}
        transition={{ ...bounce, delay: 0 }}
      />

      {/* Photo strip — from top-right */}
      <motion.img
        src={receiptSvg}
        alt=""
        className="absolute -top-[2%] left-[41%] w-[58%] z-20"
        initial={{ ...fromRight, rotate: 1 }}
        animate={{ x: 0, y: 0, rotate: 1 }}
        transition={{ ...bounce, delay: 0.1 }}
      />

      {/* Envelope — focal, from top-left */}
      <motion.img
        src={envelopeSvg}
        alt=""
        className="absolute top-[36%] -left-[3%] w-[72%] z-30"
        initial={{ ...fromLeft, rotate: 3 }}
        animate={{ x: 0, y: 0, rotate: 3 }}
        transition={{ ...bounce, delay: 0.2 }}
      />

      {/* Camera — from top-right */}
      <motion.img
        src={cameraSvg}
        alt=""
        className="absolute top-[62%] left-[55%] w-[46%] z-40"
        initial={{ ...fromRight, rotate: -4 }}
        animate={{ x: 0, y: 0, rotate: -4 }}
        transition={{ ...bounce, delay: 0.3 }}
      />

      {/* Star — from top-right, last */}
      <motion.img
        src={starSvg}
        alt=""
        className="absolute top-[10%] -right-[1%] w-[26%] z-50"
        initial={{ ...fromRight, rotate: 10 }}
        animate={{ x: 0, y: 0, rotate: 10 }}
        transition={{ ...bounce, delay: 0.4 }}
      />
    </div>
  )
}
