import type { PersonaId } from './avatar';

/**
 * Flat, front-facing figures for the Chamber 4 hologram, in Bhutanese dress
 * where it fits: a student in gho, a builder in hard hat and vest, a monk in
 * maroon robes, a resident in kira and toego, and a professional in a suit.
 * Drawn on a 100 × 220 canvas, feet at the bottom.
 */
export function AvatarFigure({ id }: { id: PersonaId }) {
  return (
    <svg viewBox="0 0 100 220" width="100%" height="100%" aria-hidden="true">
      {figures[id]}
    </svg>
  );
}

const skin = '#c98f68';
const skinShade = '#a8724f';
const hair = '#1f1a17';

const head = (hairPath?: React.ReactNode) => (
  <g>
    <rect x="44" y="40" width="12" height="10" fill={skinShade} />
    <ellipse cx="50" cy="28" rx="13" ry="15" fill={skin} />
    {hairPath}
    <circle cx="45" cy="29" r="1.4" fill="#2a1f1a" />
    <circle cx="55" cy="29" r="1.4" fill="#2a1f1a" />
    <path d="M46 36q4 3 8 0" stroke="#7a4a33" strokeWidth="1.4" fill="none" strokeLinecap="round" />
  </g>
);

const figures: Record<PersonaId, React.ReactNode> = {
  // Student: gho with white lagey cuffs, knee socks, shoulder bag, books.
  student: (
    <g>
      <rect x="40" y="168" width="7" height="40" fill="#2b2b2b" />
      <rect x="53" y="168" width="7" height="40" fill="#2b2b2b" />
      <rect x="38" y="204" width="11" height="7" rx="2" fill="#111" />
      <rect x="51" y="204" width="11" height="7" rx="2" fill="#111" />
      <path d="M30 56h40l6 115H24z" fill="#4b5f8a" />
      <path d="M30 56h40l6 115H24z" fill="url(#check)" opacity=".55" />
      <path d="M44 56l6 18 6-18z" fill="#f4f1ea" />
      <rect x="18" y="58" width="12" height="62" rx="5" fill="#4b5f8a" />
      <rect x="70" y="58" width="12" height="62" rx="5" fill="#4b5f8a" />
      <rect x="17" y="112" width="14" height="10" rx="2" fill="#f4f1ea" />
      <rect x="69" y="112" width="14" height="10" rx="2" fill="#f4f1ea" />
      <rect x="66" y="118" width="18" height="24" rx="2" fill="#c0563f" />
      <rect x="68" y="120" width="14" height="20" fill="#e9d9b8" />
      <path d="M33 58l40 60" stroke="#6b4a2a" strokeWidth="3" />
      <rect x="24" y="112" width="16" height="20" rx="3" fill="#6b4a2a" />
      {head(<path d="M37 26q1-16 13-16t13 16q-4-8-13-8t-13 8z" fill={hair} />)}
      <defs>
        <pattern id="check" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill="none" />
          <path d="M0 4h8M4 0v8" stroke="#2b3a5c" strokeWidth="1.5" />
        </pattern>
      </defs>
    </g>
  ),
  // Builder: hard hat, hi-vis vest, work trousers, boots.
  builder: (
    <g>
      <rect x="38" y="140" width="11" height="66" fill="#3e4a5a" />
      <rect x="51" y="140" width="11" height="66" fill="#3e4a5a" />
      <rect x="35" y="202" width="15" height="9" rx="2" fill="#5a3a22" />
      <rect x="50" y="202" width="15" height="9" rx="2" fill="#5a3a22" />
      <rect x="30" y="56" width="40" height="88" rx="6" fill="#6f7f8f" />
      <path d="M32 58h14l-2 84H34zM54 58h14l-2 84H56z" fill="rgb(240,131,89)" />
      <rect x="32" y="100" width="36" height="5" fill="#f2f0d8" />
      <rect x="32" y="120" width="36" height="5" fill="#f2f0d8" />
      <rect x="18" y="58" width="12" height="66" rx="5" fill="#6f7f8f" />
      <rect x="70" y="58" width="12" height="66" rx="5" fill="#6f7f8f" />
      <circle cx="24" cy="128" r="6" fill={skin} />
      <circle cx="76" cy="128" r="6" fill={skin} />
      <rect x="76" y="120" width="4" height="34" fill="#7a5a3a" />
      <rect x="72" y="150" width="12" height="8" fill="#9aa3ad" />
      {head(<path d="M35 22q2-14 15-14t15 14h4v5H31v-5z" fill="rgb(242,212,78)" />)}
    </g>
  ),
  // Monk: maroon zen draped over one shoulder, saffron under-shirt, shaven head.
  monk: (
    <g>
      <rect x="40" y="196" width="9" height="12" fill={skin} />
      <rect x="51" y="196" width="9" height="12" fill={skin} />
      <rect x="37" y="206" width="13" height="5" rx="2" fill="#5a3a22" />
      <rect x="50" y="206" width="13" height="5" rx="2" fill="#5a3a22" />
      <path d="M30 56h40l8 142H22z" fill="rgb(122,51,60)" />
      <path d="M38 56h18v40H38z" fill="rgb(242,212,78)" />
      <path d="M30 56l30 0 18 70-10 6-14-58-24-4z" fill="#8e3b45" />
      <rect x="18" y="58" width="12" height="60" rx="5" fill={skin} />
      <path d="M70 58h12v62H70z" fill="#8e3b45" />
      <circle cx="24" cy="120" r="6" fill={skin} />
      <circle cx="76" cy="122" r="6" fill={skin} />
      <circle cx="50" cy="112" r="3" fill="#3a2a1a" />
      <path d="M44 108q6 10 12 0" stroke="#3a2a1a" strokeWidth="1.5" fill="none" />
      {head(<ellipse cx="50" cy="20" rx="12" ry="5" fill={skinShade} opacity=".35" />)}
    </g>
  ),
  // Resident: kira to the ankle with woven bands, wonju blouse cuffs, toego jacket, long hair.
  resident: (
    <g>
      <rect x="40" y="200" width="20" height="10" rx="3" fill="#3a2a22" />
      <path d="M33 92h34l5 112H28z" fill="rgb(236,103,87)" />
      {[110, 130, 150, 170, 190].map(y => (
        <rect key={y} x="30" y={y} width="40" height="5" fill="rgb(242,212,78)" opacity=".85" />
      ))}
      <path d="M28 54h44l2 44H26z" fill="rgb(67,74,113)" />
      <path d="M44 54l6 22 6-22z" fill="#f4f1ea" />
      <rect x="16" y="56" width="12" height="58" rx="5" fill="rgb(67,74,113)" />
      <rect x="72" y="56" width="12" height="58" rx="5" fill="rgb(67,74,113)" />
      <rect x="15" y="104" width="14" height="10" rx="2" fill="#e9b3a8" />
      <rect x="71" y="104" width="14" height="10" rx="2" fill="#e9b3a8" />
      <circle cx="22" cy="120" r="6" fill={skin} />
      <circle cx="78" cy="120" r="6" fill={skin} />
      {head(<path d="M36 30q-2-22 14-22t14 22l2 26h-6l-2-24q-8-8-16 0l-2 24h-6z" fill={hair} />)}
    </g>
  ),
  // Professional: suit, tie, briefcase.
  professional: (
    <g>
      <rect x="39" y="140" width="10" height="66" fill="#2c3352" />
      <rect x="51" y="140" width="10" height="66" fill="#2c3352" />
      <rect x="36" y="203" width="14" height="8" rx="2" fill="#111" />
      <rect x="50" y="203" width="14" height="8" rx="2" fill="#111" />
      <rect x="30" y="56" width="40" height="88" rx="6" fill="rgb(67,74,113)" />
      <path d="M42 56l8 22 8-22z" fill="#f4f1ea" />
      <path d="M48 62h4l2 30-4 6-4-6z" fill="rgb(236,103,87)" />
      <path d="M30 58l14 0 6 40-6 46H34zM70 58l-14 0-6 40 6 46h10z" fill="#3a4266" opacity=".7" />
      <rect x="18" y="58" width="12" height="66" rx="5" fill="rgb(67,74,113)" />
      <rect x="70" y="58" width="12" height="66" rx="5" fill="rgb(67,74,113)" />
      <circle cx="24" cy="128" r="6" fill={skin} />
      <circle cx="76" cy="128" r="6" fill={skin} />
      <rect x="66" y="132" width="22" height="16" rx="2" fill="#5a3a22" />
      <rect x="73" y="128" width="8" height="5" rx="1" fill="none" stroke="#5a3a22" strokeWidth="2" />
      {head(<path d="M37 24q0-14 13-14t13 14q-3-6-13-6t-13 6z" fill={hair} />)}
    </g>
  ),
};
