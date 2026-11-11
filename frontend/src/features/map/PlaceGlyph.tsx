import type { Place } from './layout-data';

/** A calm location marker for the visitor's current stop. */
export function LocationIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

/** Small shopping-bag icon used for the Souvenir Shop's badge. */
export function BagIcon({ size = '62%' }: { size?: number | string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ display: 'block' }}>
      <path d="M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z" fill="currentColor" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/**
 * What a place shows inside its round badge: an icon if it has one,
 * otherwise its badge text (chamber number or plan letter), otherwise `fallback`.
 */
export function PlaceGlyph({ place, fallback }: { place: Place; fallback: string }) {
  if (place.icon === 'bag') return <BagIcon />;
  return <>{place.badge ?? fallback}</>;
}
