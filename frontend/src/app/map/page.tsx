import type { Metadata } from 'next';
import MapClient from '@/features/map/MapClient';

export const metadata: Metadata = {
  title: 'Venue map · Mindu',
  description: 'Interactive 3D map of the GMC Experience Centre.',
};

export default function MapPage() {
  return <MapClient />;
}
