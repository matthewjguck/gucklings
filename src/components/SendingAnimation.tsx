/**
 * Stylized "sending" illustration used as the post-send loading state.
 * Envelopes plus small shapes fly horizontally left → right across the canvas,
 * staggered on a continuous loop. Decorative scatter dingbats sit behind.
 */

const BLACK = '#0a0a0a'
const WHITE = '#fafafa'
const PINK = '#E8395A'

// Envelopes — fly left to right with gentle wave variation
const ENVELOPE_FLIGHTS = [
  { begin: '0s', path: 'M -60 200 C 100 140, 300 260, 460 200' },
  { begin: '1.6s', path: 'M -60 260 C 140 300, 280 220, 460 260' },
  { begin: '3.2s', path: 'M -60 320 C 120 280, 320 360, 460 320' },
] as const

// Small shapes that also fly across
const SHAPE_FLIGHTS = [
  {
    begin: '0.8s',
    dur: '4s',
    path: 'M -60 170 C 140 230, 280 130, 460 200',
    render: (
      <path
        d="M 0 -9 L 2.6 -2.8 L 9 -2.8 L 3.8 1.3 L 5.8 7.5 L 0 3.8 L -5.8 7.5 L -3.8 1.3 L -9 -2.8 L -2.6 -2.8 Z"
        fill={WHITE}
        stroke={PINK}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    ),
  },
  {
    begin: '2.4s',
    dur: '4s',
    path: 'M -60 350 C 140 320, 280 380, 460 340',
    render: (
      <path
        d="M 0 6.5 C -6.5 1.3, -8 -4.5, -4 -5 C -1.6 -5.3, -0.4 -4, 0 -2.6 C 0.4 -4, 1.6 -5.3, 4 -5 C 8 -4.5, 6.5 1.3, 0 6.5 Z"
        fill={WHITE}
        stroke={BLACK}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    ),
  },
] as const

// Static decorative dingbats
type Dingbat = { x: number; y: number; delay: string; render: React.ReactNode }
const SCATTER: Dingbat[] = [
  {
    x: 240,
    y: 130,
    delay: '0s',
    render: (
      <path
        d="M 0 -7 L 0 7 M -7 0 L 7 0 M -5 -5 L 5 5 M 5 -5 L -5 5"
        stroke={BLACK}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    ),
  },
  {
    x: 60,
    y: 250,
    delay: '0.6s',
    render: (
      <path
        d="M 0 -8 L 2.3 -2.3 L 8 -2.3 L 3.5 1 L 5.2 6.7 L 0 3.3 L -5.2 6.7 L -3.5 1 L -8 -2.3 L -2.3 -2.3 Z"
        fill={WHITE}
        stroke={BLACK}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    ),
  },
  {
    x: 350,
    y: 200,
    delay: '1.2s',
    render: (
      <path
        d="M 0 -7 L 2 -2 L 7 -2 L 3 1 L 4.5 5.5 L 0 2.8 L -4.5 5.5 L -3 1 L -7 -2 L -2 -2 Z"
        fill={WHITE}
        stroke={PINK}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    ),
  },
  {
    x: 170,
    y: 350,
    delay: '0.3s',
    render: (
      <path
        d="M 0 5 C -5 1, -6 -4, -2.5 -4 C -1 -4, 0 -2.7, 0 -1.5 C 0 -2.7, 1 -4, 2.5 -4 C 6 -4, 5 1, 0 5 Z"
        fill={WHITE}
        stroke={PINK}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    ),
  },
  {
    x: 40,
    y: 350,
    delay: '1.5s',
    render: (
      <circle cx="0" cy="0" r="4" fill={WHITE} stroke={PINK} strokeWidth="1.2" />
    ),
  },
  {
    x: 360,
    y: 380,
    delay: '0.9s',
    render: (
      <path
        d="M 0 -6 L 0 6 M -6 0 L 6 0"
        stroke={BLACK}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    ),
  },
  {
    x: 200,
    y: 230,
    delay: '2s',
    render: (
      <circle cx="0" cy="0" r="3.5" fill={WHITE} stroke={BLACK} strokeWidth="1.1" />
    ),
  },
]

// Scalloped decorative border around the envelope (centered at 0,0)
const SCALLOP_PATH = (() => {
  const w = 70
  const h = 50
  const pad = 4
  const topN = 10
  const sideN = 7
  const hw = w / 2 + pad
  const hh = h / 2 + pad
  const topStep = (2 * hw) / topN
  const sideStep = (2 * hh) / sideN
  const parts = [`M ${-hw} ${-hh}`]
  for (let i = 0; i < topN; i++) parts.push(`a ${topStep / 2} ${topStep / 2} 0 0 0 ${topStep} 0`)
  for (let i = 0; i < sideN; i++) parts.push(`a ${sideStep / 2} ${sideStep / 2} 0 0 0 0 ${sideStep}`)
  for (let i = 0; i < topN; i++) parts.push(`a ${topStep / 2} ${topStep / 2} 0 0 0 ${-topStep} 0`)
  for (let i = 0; i < sideN; i++) parts.push(`a ${sideStep / 2} ${sideStep / 2} 0 0 0 0 ${-sideStep}`)
  parts.push('Z')
  return parts.join(' ')
})()

export default function SendingAnimation() {
  return (
    <svg
      viewBox="0 0 400 500"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      aria-hidden
    >
      <defs>
        <style>
          {`
            @keyframes haWobble {
              0%, 100% { transform: translate(0, 0) rotate(0); }
              50% { transform: translate(1.5px, -2px) rotate(6deg); }
            }
            .ha-scatter {
              transform-origin: center;
              transform-box: fill-box;
              animation: haWobble 4s ease-in-out infinite;
            }
          `}
        </style>
      </defs>

      {/* Scatter dingbats (static, gentle wobble) */}
      {SCATTER.map((d, i) => (
        <g
          key={`s-${i}`}
          className="ha-scatter"
          transform={`translate(${d.x} ${d.y})`}
          style={{ animationDelay: d.delay }}
        >
          {d.render}
        </g>
      ))}

      {/* Flying envelopes — hidden until begin so they don't park at (0,0) on load */}
      {ENVELOPE_FLIGHTS.map((flight, i) => (
        <g key={`e-${i}`} visibility="hidden">
          <set attributeName="visibility" to="visible" begin={flight.begin} />
          {/* Scalloped decorative border */}
          <path d={SCALLOP_PATH} fill="none" stroke={PINK} strokeWidth="1.1" />
          <rect
            x="-35"
            y="-25"
            width="70"
            height="50"
            rx="2"
            fill={WHITE}
            stroke={BLACK}
            strokeWidth="1.3"
          />
          <path
            d="M -35 -23 L 0 7 L 35 -23"
            fill="none"
            stroke={BLACK}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <animateMotion
            dur="4s"
            begin={flight.begin}
            repeatCount="indefinite"
            rotate="auto"
            path={flight.path}
            calcMode="spline"
            keyTimes="0;1"
            keyPoints="0;1"
            keySplines="0.42 0 0.58 1"
          />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.15;0.85;1"
            calcMode="spline"
            keySplines="0.4 0 0.2 1; 0 0 1 1; 0.8 0 0.6 1"
            begin={flight.begin}
            dur="4s"
            repeatCount="indefinite"
          />
        </g>
      ))}

      {/* Flying small shapes */}
      {SHAPE_FLIGHTS.map((flight, i) => (
        <g key={`f-${i}`} visibility="hidden">
          <set attributeName="visibility" to="visible" begin={flight.begin} />
          {flight.render}
          <animateMotion
            dur={flight.dur}
            begin={flight.begin}
            repeatCount="indefinite"
            path={flight.path}
            calcMode="spline"
            keyTimes="0;1"
            keyPoints="0;1"
            keySplines="0.42 0 0.58 1"
          />
          <animate
            attributeName="opacity"
            values="0;1;1;0"
            keyTimes="0;0.15;0.85;1"
            calcMode="spline"
            keySplines="0.4 0 0.2 1; 0 0 1 1; 0.8 0 0.6 1"
            begin={flight.begin}
            dur={flight.dur}
            repeatCount="indefinite"
          />
        </g>
      ))}
    </svg>
  )
}
