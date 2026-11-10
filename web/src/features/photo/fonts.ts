import { Caveat } from 'next/font/google';

// A handwritten face for the playful frames (Polaroid captions, postcards…).
const caveat = Caveat({ subsets: ['latin'], weight: ['700'], display: 'swap' });

export const hand = () => `${caveat.style.fontFamily}, cursive`;
