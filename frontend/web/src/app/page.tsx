import { redirect } from 'next/navigation';

// Only the map has been built in Next.js so far; the rest of the visitor
// journey still lives in the original prototype (../../legacy/prototype/server.js).
export default function Home() {
  redirect('/map');
}
