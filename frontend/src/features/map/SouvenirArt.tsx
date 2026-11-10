import type { SouvenirId } from './souvenir';

/** The hologram shopping bag, with the GMC mark on its side. */
export function ShoppingBag() {
  return (
    <svg viewBox="0 0 120 130" width="100%" height="100%" aria-hidden="true">
      <path d="M44 34V26a16 16 0 0 1 32 0v8" fill="none" stroke="rgb(122,51,60)" strokeWidth="5" strokeLinecap="round" />
      <path d="M18 34h84l-6 88a6 6 0 0 1-6 6H30a6 6 0 0 1-6-6z" fill="rgb(236,103,87)" />
      <path d="M18 34h84l-1 12H19z" fill="rgb(240,131,89)" />
      <rect x="40" y="62" width="40" height="40" rx="3" fill="#fff" />
      <image href="/gmc-mark.webp" x="44" y="66" width="32" height="32" />
      <path d="M102 34l-6 88a6 6 0 0 1-6 6h-6l6-94z" fill="rgb(122,51,60)" opacity=".25" />
    </svg>
  );
}

/** Small flat illustrations of each souvenir. */
export function SouvenirArt({ id }: { id: SouvenirId }) {
  return (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
      {art[id]}
    </svg>
  );
}

const art: Record<SouvenirId, React.ReactNode> = {
  // A folded length of woven cloth with coloured bands.
  textile: (
    <g>
      <path d="M8 16h48v34H8z" fill="rgb(67,74,113)" />
      {[20, 28, 36, 44].map((y, i) => (
        <rect key={y} x="8" y={y} width="48" height="4" fill={['rgb(242,212,78)', 'rgb(236,103,87)', '#fff', 'rgb(240,131,89)'][i]} />
      ))}
      {[14, 24, 34, 44].map(x => <path key={x} d={`M${x} 16l4 4-4 4`} stroke="#fff" strokeWidth="1.2" fill="none" opacity=".6" />)}
      <path d="M8 50h48l-3 6H11z" fill="rgb(45,50,82)" />
    </g>
  ),
  // A folded gho with white cuffs.
  clothing: (
    <g>
      <path d="M14 14l10-4h16l10 4 6 14-8 3-2-6v30H18V25l-2 6-8-3z" fill="#4b5f8a" />
      <path d="M26 10l6 10 6-10z" fill="#f4f1ea" />
      <rect x="6" y="26" width="10" height="5" rx="1" fill="#f4f1ea" transform="rotate(-20 11 28)" />
      <rect x="48" y="26" width="10" height="5" rx="1" fill="#f4f1ea" transform="rotate(20 53 28)" />
      <path d="M18 40h28M18 46h28" stroke="#2b3a5c" strokeWidth="1.5" />
    </g>
  ),
  // Teapot and cup.
  tea: (
    <g>
      <ellipse cx="26" cy="38" rx="16" ry="13" fill="#f4f1ea" stroke="#c9b9a0" strokeWidth="1.2" />
      <path d="M40 34q10-4 12 4" stroke="#c9b9a0" strokeWidth="3" fill="none" />
      <path d="M10 32q-6 2-4 8" stroke="#c9b9a0" strokeWidth="3" fill="none" />
      <rect x="22" y="22" width="8" height="4" rx="2" fill="rgb(236,103,87)" />
      <path d="M14 36h24" stroke="rgb(67,74,113)" strokeWidth="2" />
      <path d="M44 44h14l-2 9H46z" fill="#f4f1ea" stroke="#c9b9a0" strokeWidth="1.2" />
      <ellipse cx="51" cy="54" rx="9" ry="2" fill="#c9b9a0" />
    </g>
  ),
  // A small elephant figure.
  elephant: (
    <g>
      <ellipse cx="34" cy="34" rx="18" ry="13" fill="#9aa0ae" />
      <circle cx="16" cy="28" r="10" fill="#9aa0ae" />
      <path d="M8 30q-4 10 2 18" stroke="#9aa0ae" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M14 22q-8 2-6 12 6 0 8-6z" fill="#7d8494" />
      <rect x="20" y="42" width="6" height="12" rx="2" fill="#7d8494" />
      <rect x="40" y="42" width="6" height="12" rx="2" fill="#7d8494" />
      <circle cx="13" cy="26" r="1.5" fill="#2a2a2a" />
      <path d="M22 22h24v8H22z" fill="rgb(236,103,87)" />
      <path d="M22 26h24" stroke="rgb(242,212,78)" strokeWidth="2" />
    </g>
  ),
  // A postcard with a stamp.
  postcard: (
    <g>
      <rect x="6" y="14" width="52" height="36" rx="3" fill="#fffaf0" stroke="#c9b9a0" strokeWidth="1.2" />
      <rect x="44" y="18" width="10" height="12" fill="rgb(236,103,87)" />
      <path d="M10 22h24M10 28h28M10 34h20" stroke="rgb(67,74,113)" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 40q6-8 12 0t10-2" stroke="rgb(240,131,89)" strokeWidth="2" fill="none" />
    </g>
  ),
};
