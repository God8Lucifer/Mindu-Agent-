'use client';

import dynamic from 'next/dynamic';

// WebGL only exists in the browser, so the map skips server rendering.
const VenueMap = dynamic(() => import('./VenueMap'), {
  ssr: false,
  loading: () => (
    <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: '#f5f1e8', color: '#66725d' }}>
      Loading the Experience Centre…
    </div>
  ),
});

export default function MapClient() {
  return <VenueMap />;
}
