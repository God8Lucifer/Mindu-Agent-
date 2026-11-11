import type { Metadata } from 'next';
import { PhotoBooth } from '@/features/photo/PhotoBooth';

export const metadata: Metadata = {
  title: 'Photo collection · GMC',
  description: 'Take photos in each chamber and turn them into a shareable GMC collection.',
};

// Static page: PhotoBooth reads ?place= in the browser, so nothing here blocks prerendering.
export default function PhotoPage() {
  return <PhotoBooth />;
}
