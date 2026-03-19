import { useId } from 'react'
import type { PeekSelection } from '../game/types.ts'

interface PeekPreviewArtProps {
  peek: PeekSelection
  className?: string
}

interface ActorProps {
  x: number
  y: number
  scale?: number
  crouch?: boolean
  ghost?: boolean
  assist?: boolean
}

function Actor({
  x,
  y,
  scale = 1,
  crouch = false,
  ghost = false,
  assist = false,
}: ActorProps) {
  const headRadius = 6 * scale
  const bodyWidth = 13 * scale
  const bodyHeight = (crouch ? 18 : 29) * scale
  const armWidth = 4 * scale
  const legHeight = (crouch ? 9 : 13) * scale
  const bodyX = x - bodyWidth / 2
  const bodyY = y - bodyHeight
  const tone = assist
    ? {
        body: ghost ? 'rgba(84, 108, 142, 0.44)' : 'rgba(90, 112, 148, 0.76)',
        head: ghost ? 'rgba(104, 132, 168, 0.52)' : 'rgba(112, 146, 184, 0.84)',
      }
    : {
        body: ghost ? 'rgba(55, 62, 72, 0.34)' : 'rgba(33, 36, 42, 0.92)',
        head: ghost ? 'rgba(72, 78, 88, 0.4)' : 'rgba(44, 48, 56, 0.96)',
      }

  return (
    <g>
      <circle cx={x} cy={bodyY - headRadius + 2} r={headRadius} fill={tone.head} />
      <rect
        x={bodyX}
        y={bodyY}
        width={bodyWidth}
        height={bodyHeight}
        rx={Math.max(4, bodyWidth * 0.24)}
        fill={tone.body}
      />
      <rect
        x={bodyX - armWidth * 0.65}
        y={bodyY + bodyHeight * 0.18}
        width={armWidth}
        height={bodyHeight * 0.52}
        rx={armWidth / 2}
        fill={tone.body}
      />
      <rect
        x={bodyX + bodyWidth - armWidth * 0.35}
        y={bodyY + bodyHeight * 0.18}
        width={armWidth}
        height={bodyHeight * 0.52}
        rx={armWidth / 2}
        fill={tone.body}
      />
      {!crouch && (
        <>
          <rect
            x={bodyX + bodyWidth * 0.18}
            y={y - legHeight}
            width={armWidth}
            height={legHeight}
            rx={armWidth / 2}
            fill={tone.body}
          />
          <rect
            x={bodyX + bodyWidth * 0.58}
            y={y - legHeight}
            width={armWidth}
            height={legHeight}
            rx={armWidth / 2}
            fill={tone.body}
          />
        </>
      )}
      {crouch && (
        <rect
          x={bodyX + bodyWidth * 0.12}
          y={y - legHeight * 0.8}
          width={bodyWidth * 0.76}
          height={armWidth}
          rx={armWidth / 2}
          fill={tone.body}
        />
      )}
    </g>
  )
}

function MotionStroke({
  d,
  accent = '#7cd7ff',
  opacity = 0.72,
}: {
  d: string
  accent?: string
  opacity?: number
}) {
  return (
    <path
      d={d}
      fill="none"
      stroke={accent}
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeDasharray="5 6"
      opacity={opacity}
    />
  )
}

const renderPeekArt = (peek: PeekSelection) => {
  switch (peek) {
    case 'cross':
      return (
        <>
          <Actor x={176} y={93} ghost />
          <Actor x={136} y={92} ghost />
          <Actor x={98} y={91} />
          <MotionStroke d="M182 86 C160 78 134 76 94 86" accent="#f5c66e" />
        </>
      )
    case 'mid-hold-peek':
      return (
        <>
          <Actor x={174} y={93} ghost />
          <Actor x={122} y={72} scale={0.96} />
          <Actor x={108} y={100} scale={0.82} crouch ghost />
          <MotionStroke d="M180 86 C160 74 140 68 122 68" accent="#f5c66e" />
          <line
            x1="116"
            y1="52"
            x2="128"
            y2="52"
            stroke="#8ef0cb"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <line
            x1="102"
            y1="107"
            x2="116"
            y2="107"
            stroke="#8ef0cb"
            strokeWidth="2.4"
            strokeLinecap="round"
            opacity="0.74"
          />
        </>
      )
    case 'jumping-cross':
      return (
        <>
          <Actor x={182} y={94} ghost />
          <Actor x={140} y={66} ghost />
          <Actor x={102} y={82} />
          <MotionStroke d="M184 94 C166 86 154 72 142 60 C130 50 116 60 98 79" />
        </>
      )
    case 'jiggle-peek':
      return (
        <>
          <Actor x={150} y={94} ghost />
          <Actor x={132} y={94} />
          <MotionStroke d="M152 88 C146 82 138 82 132 88" accent="#f5c66e" />
        </>
      )
    case 'double-jiggle-peek':
      return (
        <>
          <Actor x={154} y={95} ghost />
          <Actor x={132} y={95} />
          <Actor x={112} y={95} ghost />
          <MotionStroke d="M154 88 C146 82 138 82 132 88" accent="#f5c66e" />
          <MotionStroke d="M132 92 C122 88 118 88 110 92" accent="#8ef0cb" opacity={0.66} />
        </>
      )
    case 'wide-swing':
      return (
        <>
          <Actor x={182} y={94} ghost />
          <Actor x={142} y={92} ghost />
          <Actor x={84} y={90} scale={1.02} />
          <MotionStroke d="M184 88 C162 82 126 80 82 88" accent="#f5c66e" />
        </>
      )
    case 'delayed-wide-swing':
      return (
        <>
          <Actor x={188} y={95} ghost />
          <line
            x1="178"
            y1="74"
            x2="178"
            y2="96"
            stroke="#8ef0cb"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.74"
          />
          <Actor x={98} y={91} />
          <MotionStroke d="M182 90 C160 90 128 84 94 88" accent="#f5c66e" />
        </>
      )
    case 'shoulder-bait':
      return (
        <>
          <Actor x={146} y={95} ghost />
          <rect x="130" y="67" width="8" height="30" rx="4" fill="rgba(33, 36, 42, 0.92)" />
          <MotionStroke d="M148 88 C142 84 138 84 134 88" accent="#f5c66e" />
        </>
      )
    case 'stop-cross':
      return (
        <>
          <Actor x={178} y={94} ghost />
          <Actor x={128} y={92} />
          <Actor x={84} y={90} ghost />
          <MotionStroke d="M184 88 C164 80 144 80 126 84" accent="#f5c66e" />
          <line
            x1="124"
            y1="60"
            x2="124"
            y2="80"
            stroke="#8ef0cb"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <line
            x1="132"
            y1="60"
            x2="132"
            y2="80"
            stroke="#8ef0cb"
            strokeWidth="2.3"
            strokeLinecap="round"
          />
        </>
      )
    case 'crouch-peek':
      return (
        <>
          <Actor x={152} y={100} crouch ghost />
          <Actor x={126} y={102} scale={0.84} crouch />
          <MotionStroke d="M152 94 C144 88 136 88 126 95" accent="#f5c66e" />
        </>
      )
    case 'round-start':
      return (
        <>
          <Actor x={178} y={94} ghost />
          <Actor x={152} y={70} scale={0.88} ghost />
          <Actor x={126} y={92} scale={0.94} />
          <Actor x={98} y={90} scale={0.9} ghost />
          <MotionStroke d="M186 88 C170 84 154 84 136 86 C120 88 108 90 92 88" accent="#f5c66e" />
          <MotionStroke d="M164 92 C156 82 150 70 144 60 C136 52 128 62 120 78" accent="#8ef0cb" opacity={0.72} />
        </>
      )
    case 'wallbang-timing-peek':
      return (
        <>
          <Actor x={148} y={92} ghost />
          <MotionStroke d="M154 44 L148 86" accent="#7cb8ff" opacity={0.76} />
        </>
      )
    case 'mixed':
      return (
        <>
          <Actor x={94} y={94} scale={0.76} crouch />
          <Actor x={126} y={68} scale={0.74} ghost />
          <Actor x={160} y={92} scale={0.78} assist />
          <MotionStroke d="M164 84 C154 74 144 68 128 64" opacity={0.54} />
        </>
      )
    default:
      return null
  }
}

export function PeekPreviewArt({ peek, className }: PeekPreviewArtProps) {
  const uniqueId = useId().replace(/:/g, '')
  const backgroundId = `peek-preview-bg-${uniqueId}`
  const floorId = `peek-preview-floor-${uniqueId}`
  const doorId = `peek-preview-door-${uniqueId}`
  const clipId = `peek-preview-center-${uniqueId}`
  const showBehindDoorActor = peek === 'wallbang-timing-peek'

  return (
    <div className={`mode-preview ${className ?? ''}`.trim()} aria-hidden="true">
      <svg
        className="mode-preview-svg"
        viewBox="0 0 240 132"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={backgroundId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#081116" />
            <stop offset="55%" stopColor="#0b151c" />
            <stop offset="100%" stopColor="#080c11" />
          </linearGradient>
          <linearGradient id={floorId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2b2118" />
            <stop offset="100%" stopColor="#17100b" />
          </linearGradient>
          <linearGradient id={doorId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#906530" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#64441f" stopOpacity="0.84" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x="74" y="40" width="92" height="64" rx="6" />
          </clipPath>
        </defs>

        <rect x="0" y="0" width="240" height="132" rx="16" fill={`url(#${backgroundId})`} />
        <path
          d="M0 104 C52 92 94 88 120 88 C154 88 196 93 240 108 L240 132 L0 132 Z"
          fill={`url(#${floorId})`}
        />
        {showBehindDoorActor && (
          <g clipPath={`url(#${clipId})`}>{renderPeekArt(peek)}</g>
        )}
        <rect x="57" y="34" width="18" height="70" rx="4" fill="#4b3928" />
        <rect x="165" y="34" width="18" height="70" rx="4" fill="#4b3928" />
        <rect x="57" y="28" width="126" height="10" rx="4" fill="#584531" />
        <rect x="75" y="40" width="34" height="64" rx="5" fill={`url(#${doorId})`} opacity="0.9" />
        <rect x="131" y="40" width="34" height="64" rx="5" fill={`url(#${doorId})`} opacity="0.9" />
        <rect x="109" y="40" width="22" height="64" rx="4" fill="rgba(8, 14, 18, 0.82)" />

        <path
          d="M38 112 C74 92 164 90 206 110"
          stroke="rgba(255, 217, 161, 0.18)"
          strokeWidth="2"
          fill="none"
        />

        {!showBehindDoorActor && renderPeekArt(peek)}
      </svg>
    </div>
  )
}
