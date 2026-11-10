import type { Metadata } from 'next';
import { MinduExperience } from '@/features/mindu/MinduExperience';

export const metadata: Metadata = {
  title: 'Meet Mindu · GMC Experience Centre',
  description: 'Meet Mindu, your animated GMC Experience Centre guide.',
};

export default function MinduPage() {
  return <MinduExperience />;
}
