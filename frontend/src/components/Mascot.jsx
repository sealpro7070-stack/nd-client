// Nila — the NilamDesk book-bot mascot.
// Built entirely from SVG primitives. Three moods: idle, waving, cheering.

import { memo } from 'react'

export const Mascot = memo(function Mascot({ size = 160, mood = 'idle', floating = false }) {
  const w = size
  const h = Math.round(size * 1.15)
  const armsUp = mood === 'cheering'
  const oneUp  = mood === 'waving'

  return (
    <div style={{
      width: w, height: h, position: 'relative', flexShrink: 0,
      animation: floating ? 'mascotFloat 4s ease-in-out infinite' : undefined,
    }}>
      <svg viewBox="0 0 200 230" width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
        {/* drop shadow */}
        <ellipse cx="100" cy="218" rx="62" ry="6" fill="#0F172A" opacity="0.12" />

        {/* antenna */}
        <line x1="100" y1="32" x2="100" y2="14" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="10" r="8" fill="#FFD23F" stroke="#0F172A" strokeWidth="3" />

        {/* left arm (behind head) */}
        <g transform={armsUp ? 'rotate(-40 32 110)' : 'rotate(0 32 110)'}>
          <rect x="20" y="100" width="22" height="40" rx="11" fill="#2F5DDB" stroke="#0F172A" strokeWidth="3" />
          <circle cx="31" cy="140" r="13" fill="#F4F1EA" stroke="#0F172A" strokeWidth="3" />
        </g>
        {/* right arm — raised when waving */}
        <g style={{ transformOrigin: '168px 110px' }}
           transform={armsUp ? 'rotate(40 168 110)' : oneUp ? 'rotate(-55 168 110)' : 'rotate(0 168 110)'}>
          <rect x="158" y="100" width="22" height="40" rx="11" fill="#2F5DDB" stroke="#0F172A" strokeWidth="3" />
          <circle cx="169" cy="140" r="13" fill="#F4F1EA" stroke="#0F172A" strokeWidth="3" />
        </g>

        {/* head */}
        <rect x="30" y="36" width="140" height="118" rx="32" fill="#2F5DDB" stroke="#0F172A" strokeWidth="3" />
        {/* highlight strip */}
        <rect x="40" y="44" width="120" height="8" rx="4" fill="#fff" opacity="0.18" />

        {/* face panel */}
        <rect x="46" y="60" width="108" height="74" rx="20" fill="#F4F1EA" stroke="#0F172A" strokeWidth="3" />

        {/* eyes */}
        <circle cx="78"  cy="94" r="9" fill="#0F172A" />
        <circle cx="122" cy="94" r="9" fill="#0F172A" />
        {/* eye shine */}
        <circle cx="81"  cy="91" r="2.5" fill="#fff" />
        <circle cx="125" cy="91" r="2.5" fill="#fff" />

        {/* smile */}
        <path d="M82 113 Q100 124 118 113"
          stroke="#0F172A" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* blush */}
        <circle cx="60"  cy="110" r="6" fill="#FF8FA3" opacity="0.55" />
        <circle cx="140" cy="110" r="6" fill="#FF8FA3" opacity="0.55" />

        {/* book body */}
        <rect x="36" y="156" width="128" height="50" rx="8" fill="#0F172A" />
        {/* yellow tape */}
        <rect x="36" y="156" width="128" height="11" fill="#FFD23F" />
        <rect x="36" y="156" width="128" height="11" fill="none" stroke="#0F172A" strokeWidth="3" />
        <rect x="36" y="156" width="128" height="50" rx="8" fill="none" stroke="#0F172A" strokeWidth="3" />
        {/* pages */}
        <line x1="56" y1="182" x2="144" y2="182" stroke="#F4F1EA" strokeWidth="2" opacity="0.4" />
        <line x1="56" y1="192" x2="120" y2="192" stroke="#F4F1EA" strokeWidth="2" opacity="0.4" />
      </svg>
    </div>
  )
})

// Compact logo-mark: just the head, square format
export function MascotMark({ size = 36 }) {
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} style={{ display: 'block', flexShrink: 0 }}>
      <rect x="3" y="3" width="54" height="54" rx="14" fill="#2F5DDB" stroke="#0F172A" strokeWidth="2.5" />
      <rect x="11" y="14" width="38" height="28" rx="8" fill="#F4F1EA" stroke="#0F172A" strokeWidth="2.5" />
      <circle cx="22" cy="27" r="3.5" fill="#0F172A" />
      <circle cx="38" cy="27" r="3.5" fill="#0F172A" />
      <path d="M23 34 Q30 38 37 34" stroke="#0F172A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="30" cy="3" r="3" fill="#FFD23F" stroke="#0F172A" strokeWidth="2" />
    </svg>
  )
}
