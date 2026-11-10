/**
 * Small flat illustrations for the eight sectors, drawn to echo the style of
 * the gmc.bt sector ring (the originals are ~1.4 MB each, too heavy for phones).
 */
export function SectorIcon({ id, color, shade, size, x, y }: {
  id: string;
  color: string;
  /** Secondary tone; defaults to a lighter mix of `color`. */
  shade?: string;
  /** When nested in another SVG: size and position in its user units. */
  size?: number;
  x?: number;
  y?: number;
}) {
  const s = shade ?? `color-mix(in srgb, ${color} 55%, white)`;
  return (
    <svg viewBox="0 0 48 48" width={size ?? '100%'} height={size ?? '100%'} x={x} y={y} aria-hidden="true">
      {glyph(id, color, s)}
    </svg>
  );
}

function glyph(id: string, c: string, s: string) {
  switch (id) {
    case 'spiritual': // stupa
      return (
        <g fill={c}>
          <rect x="22.5" y="4" width="3" height="7" rx="1" />
          <path d="M20 11h8l-1 4h-6z" />
          <path d="M11 30c0-9 6-15 13-15s13 6 13 15z" />
          <rect x="9" y="30" width="30" height="4" />
          <rect x="6" y="36" width="36" height="3" fill={s} />
          <rect x="20" y="21" width="8" height="9" rx="4" fill={s} />
        </g>
      );
    case 'health': // building with cross
      return (
        <g fill={c}>
          <path d="M8 18 24 8l16 10z" fill={s} />
          <rect x="11" y="18" width="26" height="20" />
          <rect x="6" y="38" width="36" height="3" fill={s} />
          <path d="M22 21h4v4h4v4h-4v4h-4v-4h-4v-4h4z" fill="#fff" />
        </g>
      );
    case 'education': // stepped plinth with flower
      return (
        <g fill={c}>
          <circle cx="24" cy="13" r="3" fill={s} />
          {[0, 60, 120, 180, 240, 300].map(a => (
            <circle key={a} cx={24 + 5.5 * Math.cos((a * Math.PI) / 180)} cy={13 + 5.5 * Math.sin((a * Math.PI) / 180)} r="3" />
          ))}
          <path d="M16 24h16l2 4H14z" fill={s} />
          <path d="M12 28h24l2 5H10z" />
          <path d="M8 33h32l2 6H6z" fill={s} />
        </g>
      );
    case 'agritech': // drone over crops
      return (
        <g fill={c}>
          <rect x="15" y="9" width="18" height="3" rx="1.5" />
          <rect x="20" y="12" width="8" height="5" rx="2" fill={s} />
          <rect x="12" y="7" width="6" height="2" rx="1" />
          <rect x="30" y="7" width="6" height="2" rx="1" />
          <path d="M18 21q6-3 12 0" stroke={s} strokeWidth="1.6" fill="none" />
          {[11, 17, 23, 29, 35].map(x => (
            <path key={x} d={`M${x} 38v-9m0 3-2-2m2 4 2-2`} stroke={c} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          ))}
          <rect x="7" y="39" width="34" height="2.5" fill={s} />
        </g>
      );
    case 'green-energy': // greenhouse with turbine
      return (
        <g fill={c}>
          <path d="M6 40V26l14-8 14 8v14z" fill={s} />
          <path d="M6 26 20 18 34 26" stroke={c} strokeWidth="2" fill="none" />
          <path d="M13 40V30m7 10V27m7 13V30" stroke={c} strokeWidth="1.4" />
          <rect x="37" y="18" width="2" height="22" />
          <path d="M38 18 38 7l2 9zM38 18l9 6-9-3zM38 18l-9 6 8-6z" />
          <rect x="4" y="40" width="40" height="2.5" />
        </g>
      );
    case 'finance': // building with coin
      return (
        <g fill={c}>
          <circle cx="24" cy="10" r="6" fill={s} />
          <text x="24" y="13.2" textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#fff" fontFamily="sans-serif">₿</text>
          <rect x="17" y="18" width="14" height="4" />
          <rect x="10" y="23" width="28" height="15" fill={s} />
          <rect x="14" y="26" width="20" height="3" />
          <rect x="14" y="31" width="20" height="3" />
          <rect x="6" y="38" width="36" height="3" />
        </g>
      );
    case 'aviation': // plane over cargo
      return (
        <g fill={c}>
          <path d="M8 15l26-4 5 1-3 2-25 5z" />
          <path d="M20 13l-6-6h3l9 5zM22 17l-3 5h3l6-6z" fill={s} />
          <rect x="8" y="28" width="32" height="9" fill={s} />
          <path d="M14 28v9m6-9v9m6-9v9m6-9v9" stroke={c} strokeWidth="1.2" />
          <rect x="6" y="37" width="36" height="3" />
        </g>
      );
    case 'tourism': // trees and mountain
      return (
        <g fill={c}>
          <path d="M18 40 30 12l14 28z" fill={s} />
          <path d="M30 12l5 11-5-3-4 4z" fill="#fff" opacity=".6" />
          <rect x="11" y="24" width="3" height="16" />
          <circle cx="12.5" cy="20" r="6" />
          <circle cx="8" cy="25" r="4" />
          <rect x="4" y="40" width="40" height="2.5" />
        </g>
      );
    default:
      return <circle cx="24" cy="24" r="12" fill={c} />;
  }
}
