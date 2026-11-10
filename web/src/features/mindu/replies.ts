/** How Mindu moves while speaking a reply (see MinduAvatar states). */
export type Mood = 'idle' | 'hi' | 'wow' | 'teaching';

export type MinduReply = {
  text: string;
  mood: Mood;
};

type Topic = { keywords: string[]; reply: MinduReply };

// Placeholder knowledge for the prototype. Replace with approved GMC content.
const topics: Topic[] = [
  {
    keywords: ['hello', 'hi', 'hey', 'kuzu', 'namaste'],
    reply: { mood: 'hi', text: 'Kuzuzangpo la! I’m Mindu, your guide to Gelephu Mindfulness City. Ask me anything about the city, its vision, or what you can explore here.' },
  },
  {
    keywords: ['gmc','gelephu', 'mindfulness city'],
    reply: { mood: 'teaching', text: 'Gelephu Mindfulness City is a new city in southern Bhutan, designed to grow a thriving economy while staying rooted in mindfulness, culture, and care for nature.' },
  },
  {
    keywords: ['vision', 'why', 'purpose', 'idea'],
    reply: { mood: 'teaching', text: 'The vision is a city where economic opportunity and wellbeing grow together. Progress is measured not only by wealth, but by the happiness of people and the health of the land.' },
  },
  {
    keywords: ['economy', 'sector', 'business', 'invest', 'job', 'work'],
    reply: { mood: 'teaching', text: 'GMC is building around several economic sectors, from green energy and agriculture to technology, wellness, and education. Each one is meant to create good work that fits the city’s values.' },
  },
  {
    keywords: ['plan', 'blueprint', 'design', 'build', 'architecture', 'map'],
    reply: { mood: 'teaching', text: 'The city is planned around rivers, forests, and wildlife corridors. Neighbourhoods are designed to sit with the landscape instead of replacing it.' },
  },
  {
    keywords: ['future', 'live', 'life', 'daily', 'home'],
    reply: { mood: 'wow', text: 'Imagine walking to work along a river, with forest just beyond your street. Daily life in GMC is meant to feel calm, connected, and close to nature.' },
  },
  {
    keywords: ['red panda', 'who are you', 'your name', 'mindu'],
    reply: { mood: 'wow', text: 'I’m Mindu, a red panda! Red pandas live in Bhutan’s forests, so I feel right at home here. My job is to help you discover the city.' },
  },
];

// Generic words like "gmc" appear in many questions, so they count less.
const GENERIC = new Set(['gmc', 'gelephu', 'hi']);

export function pickReply(question: string): MinduReply {
  const q = question.toLowerCase();
  let best: Topic | undefined;
  let bestScore = 0;
  for (const t of topics) {
    const score = t.keywords.reduce((s, k) => s + (q.includes(k) ? (GENERIC.has(k) ? 1 : 3) : 0), 0);
    if (score > bestScore) { best = t; bestScore = score; }
  }
  if (best) return best.reply;
  return {
    mood: 'idle',
    text: 'That’s a great question! I’m still a prototype, so I only know a few things for now. Try asking me about the vision, the economy, the city plan, or daily life in GMC.',
  };
}
