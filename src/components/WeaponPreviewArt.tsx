import type { WeaponMode } from '../game/types'

interface WeaponPreviewArtProps {
  weapon: WeaponMode
}

const renderWeapon = (weapon: WeaponMode) => {
  switch (weapon) {
    case 'ssg08':
      return (
        <g transform="translate(24 32) rotate(-4 80 20)">
          <rect x="6" y="26" width="52" height="8" rx="4" fill="#2f343b" />
          <rect x="52" y="16" width="108" height="12" rx="6" fill="#58626e" />
          <rect x="132" y="10" width="54" height="8" rx="4" fill="#7f8a97" />
          <rect x="84" y="8" width="40" height="7" rx="3.5" fill="#1f252c" />
          <path d="M48 28 L66 28 L74 52 L56 58 Z" fill="#433026" />
          <path d="M28 32 L44 32 L48 54 L36 58 Z" fill="#5d4a38" />
        </g>
      )
    case 'scar20':
      return (
        <g transform="translate(20 38) rotate(-3 84 20)">
          <rect x="8" y="22" width="64" height="10" rx="5" fill="#2f353c" />
          <rect x="64" y="12" width="116" height="14" rx="7" fill="#495360" />
          <rect x="146" y="8" width="48" height="9" rx="4.5" fill="#7e8791" />
          <rect x="100" y="2" width="46" height="8" rx="4" fill="#20262c" />
          <rect x="82" y="28" width="18" height="30" rx="6" fill="#353d46" />
          <path d="M48 30 L70 30 L80 58 L58 62 Z" fill="#5e4c3b" />
        </g>
      )
    case 'awp':
    default:
      return (
        <g transform="translate(18 34) rotate(-4 88 18)">
          <rect x="8" y="24" width="58" height="9" rx="4.5" fill="#2b3037" />
          <rect x="58" y="12" width="126" height="13" rx="6.5" fill="#525c66" />
          <rect x="148" y="8" width="56" height="8" rx="4" fill="#848f9b" />
          <rect x="90" y="2" width="50" height="8" rx="4" fill="#1f252c" />
          <path d="M46 28 L68 28 L82 58 L58 66 Z" fill="#5b4737" />
          <path d="M26 32 L42 32 L48 52 L36 58 Z" fill="#433126" />
        </g>
      )
  }
}

export function WeaponPreviewArt({ weapon }: WeaponPreviewArtProps) {
  return (
    <div className="weapon-preview" aria-hidden="true">
      <svg className="weapon-preview-svg" viewBox="0 0 240 110" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`weapon-bg-${weapon}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#0a141a" />
            <stop offset="100%" stopColor="#091017" />
          </linearGradient>
          <linearGradient id={`weapon-floor-${weapon}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#221810" />
            <stop offset="100%" stopColor="#15100c" />
          </linearGradient>
        </defs>
        <rect
          x="0"
          y="0"
          width="240"
          height="110"
          rx="16"
          fill={`url(#weapon-bg-${weapon})`}
        />
        <path
          d="M0 78 C40 72 82 70 120 70 C166 70 204 74 240 84 L240 110 L0 110 Z"
          fill={`url(#weapon-floor-${weapon})`}
        />
        <path
          d="M14 80 C62 68 154 66 224 82"
          fill="none"
          stroke="rgba(255, 214, 162, 0.16)"
          strokeWidth="2"
        />
        {renderWeapon(weapon)}
      </svg>
    </div>
  )
}
