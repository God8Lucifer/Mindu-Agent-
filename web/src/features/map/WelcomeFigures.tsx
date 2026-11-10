import styles from './welcome.module.css';

/**
 * Two hosts greeting visitors at Reception: a man in gho with a white kabney
 * and a woman in kira and toego with a rachu, each holding a khadar (white
 * ceremonial scarf) across both hands. The upper bodies are separate groups
 * so CSS can animate the bow from the hips; the khadars sway and can float
 * away once the visitor receives them.
 *
 * Canvas: 220 × 240, feet at the bottom. Please have the dress details
 * reviewed by GMC before public use.
 */
export function WelcomeFigures({ received }: { received: boolean }) {
  // Three stacked layers share one 220 × 240 canvas: the lower bodies stay put,
  // while each upper body is its own layer so CSS can tip it toward the
  // visitor in 3D from the hips — a real bow rather than a squash.
  return (
    <div className={`${styles.figures} ${received ? styles.figuresDone : ''}`}>
      <svg viewBox="0 0 220 240" className={styles.layer} aria-hidden="true">
        <defs>
        <pattern id="ghoCheck" width="7" height="7" patternUnits="userSpaceOnUse">
          <path d="M0 3.5h7M3.5 0v7" stroke="#24304f" strokeWidth="1.4" />
        </pattern>
        <linearGradient id="khadarSheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ece6d6" />
        </linearGradient>
      </defs>
        {/* Man in gho — lower body */}
        {/* lower body: knee socks and shoes below the gho */}
        <rect x="45" y="186" width="8" height="42" fill="#1f1f22" />
        <rect x="57" y="186" width="8" height="42" fill="#1f1f22" />
        <rect x="42" y="226" width="12" height="7" rx="2" fill="#111" />
        <rect x="56" y="226" width="12" height="7" rx="2" fill="#111" />
        <path d="M35 132h40l5 58H30z" fill="#4b5f8a" />
        <path d="M35 132h40l5 58H30z" fill="url(#ghoCheck)" opacity=".5" />

        {/* Woman in kira — lower body */}
        <rect x="150" y="226" width="22" height="7" rx="3" fill="#3a2a22" />
        <path d="M144 132h34l4 98h-42z" fill="rgb(236,103,87)" />
        {[148, 166, 184, 202, 218].map(y => (
          <rect key={y} x="141" y={y} width="40" height="5" fill="rgb(242,212,78)" opacity=".85" />
        ))}

      </svg>
      <svg viewBox="0 0 220 240" className={`${styles.layer} ${styles.upperMan}`} aria-hidden="true">
          <path d="M35 76h40l1 58H34z" fill="#4b5f8a" />
          <path d="M35 76h40l1 58H34z" fill="url(#ghoCheck)" opacity=".5" />
          <path d="M49 76l6 16 6-16z" fill="#f4f1ea" />
          {/* kabney: white scarf over the left shoulder across to the right hip */}
          <path d="M36 76l10 0 34 52-8 6z" fill="#fbfaf6" stroke="#ddd6c6" strokeWidth=".8" />
          {/* arms bent forward, lagey cuffs */}
          <path d="M34 80q-10 22-2 44l14-2q-6-18 2-38z" fill="#4b5f8a" />
          <path d="M76 80q10 22 2 44l-14-2q6-18-2-38z" fill="#4b5f8a" />
          <rect x="31" y="118" width="15" height="8" rx="2" fill="#f4f1ea" />
          <rect x="64" y="118" width="15" height="8" rx="2" fill="#f4f1ea" />
          <circle cx="40" cy="130" r="5.5" fill="#c98f68" />
          <circle cx="70" cy="130" r="5.5" fill="#c98f68" />
          <Khadar x1={40} x2={70} y={128} received={received} />
          <Head cx={55} cy={52} hair={<path d="M42 50q1-16 13-16t13 16q-4-8-13-8t-13 8z" fill="#1f1a17" />} />
      </svg>
      <svg viewBox="0 0 220 240" className={`${styles.layer} ${styles.upperWoman}`} aria-hidden="true">
          <path d="M144 112h34l1 22h-36z" fill="rgb(236,103,87)" />
          {/* toego jacket with folded wonju cuffs */}
          <path d="M139 76h44l2 40h-48z" fill="rgb(67,74,113)" />
          <path d="M155 76l6 18 6-18z" fill="#f4f1ea" />
          {/* rachu: narrow patterned cloth over the left shoulder */}
          <path d="M141 76h9l-2 60h-7z" fill="rgb(122,51,60)" />
          <path d="M142 90h7M142 104h7M142 118h7" stroke="rgb(242,212,78)" strokeWidth="2" />
          <path d="M139 80q-10 22-2 44l14-2q-6-18 2-38z" fill="rgb(67,74,113)" />
          <path d="M183 80q10 22 2 44l-14-2q6-18-2-38z" fill="rgb(67,74,113)" />
          <rect x="136" y="118" width="15" height="8" rx="2" fill="#e9b3a8" />
          <rect x="171" y="118" width="15" height="8" rx="2" fill="#e9b3a8" />
          <circle cx="145" cy="130" r="5.5" fill="#c98f68" />
          <circle cx="177" cy="130" r="5.5" fill="#c98f68" />
          <Khadar x1={145} x2={177} y={128} received={received} />
          <Head cx={161} cy={52} hair={<path d="M147 54q-2-22 14-22t14 22l2 24h-6l-2-22q-8-8-16 0l-2 22h-6z" fill="#1f1a17" />} />
      </svg>
    </div>
  );
}

function Head({ cx, cy, hair }: { cx: number; cy: number; hair: React.ReactNode }) {
  return (
    <g>
      <rect x={cx - 6} y={cy + 12} width="12" height="10" fill="#a8724f" />
      <ellipse cx={cx} cy={cy} rx="13" ry="15" fill="#c98f68" />
      {hair}
      <path d={`M${cx - 7} ${cy + 1}q2 -2 4 0M${cx + 3} ${cy + 1}q2 -2 4 0`} stroke="#2a1f1a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d={`M${cx - 4} ${cy + 8}q4 3 8 0`} stroke="#7a4a33" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </g>
  );
}

/** A khadar held across both hands, its two ends hanging down with a fringe. */
function Khadar({ x1, x2, y, received }: { x1: number; x2: number; y: number; received: boolean }) {
  const mid = (x1 + x2) / 2;
  return (
    <g className={`${styles.khadar} ${received ? styles.khadarGone : ''}`} style={{ transformOrigin: `${mid}px ${y}px` }}>
      <path
        d={`M${x1 - 4} ${y - 3}Q${mid} ${y + 10} ${x2 + 4} ${y - 3}L${x2 + 6} ${y + 46}Q${x2} ${y + 50} ${x2 - 6} ${y + 46}L${x2 - 4} ${y + 10}Q${mid} ${y + 18} ${x1 + 4} ${y + 10}L${x1 + 6} ${y + 46}Q${x1} ${y + 50} ${x1 - 6} ${y + 46}Z`}
        fill="url(#khadarSheen)"
        stroke="#d9d1bf"
        strokeWidth=".8"
      />
      {[x1, x2].map(x => (
        <path key={x} d={`M${x - 5} ${y + 47}v5M${x - 2} ${y + 48}v5M${x + 1} ${y + 48}v5M${x + 4} ${y + 47}v5`} stroke="#e6dfcf" strokeWidth="1" />
      ))}
    </g>
  );
}
