/** Public facts from the GMC Experience Centre hackathon brief. */
export const knowledge = {
  centre: 'The GMC Experience Centre is located at Choego Building. It uses immersive digital experiences, 360-degree storytelling and interactive displays to introduce the vision and future of Gelephu Mindfulness City.',
  chamber1: 'Chamber 1, The Vision, is an immersive experience introducing the vision for Gelephu Mindfulness City.',
  chamber2: 'Chamber 2, Urban Blueprint, explores the city masterplan through 3D model mapping.',
  chamber3: 'Chamber 3, The Economy of Tomorrow, introduces eight economic sectors and emerging opportunities. The hackathon brief does not list or define all eight sectors.',
  chamber4: 'Chamber 4, My City, My Future, invites visitors to imagine life in Gelephu Mindfulness City.',
  goal: 'The centre aims to make the GMC vision more accessible, engaging and meaningful to visitors.',
} as const;

export type ChamberId = 'chamber1' | 'chamber2' | 'chamber3' | 'chamber4';

export const chambers: { id: ChamberId; short: string; title: string }[] = [
  { id: 'chamber1', short: '01', title: 'The Vision' },
  { id: 'chamber2', short: '02', title: 'Urban Blueprint' },
  { id: 'chamber3', short: '03', title: 'Economy of Tomorrow' },
  { id: 'chamber4', short: '04', title: 'My City, My Future' },
];

export function isChamberId(value: string): value is ChamberId {
  return chambers.some(chamber => chamber.id === value);
}

export function demoAnswer(question: string, chamber: ChamberId) {
  const q = question.toLowerCase();
  if (/where|location|choego|centre|center/.test(q)) return knowledge.centre;
  if (/sector|econom|business|invest|opportunit/.test(q)) return knowledge.chamber3;
  if (/map|masterplan|blueprint|design/.test(q)) return knowledge.chamber2;
  if (/vision|mindful|purpose/.test(q)) return `${knowledge.chamber1} ${knowledge.goal}`;
  if (/future|life|live|resident/.test(q)) return knowledge.chamber4;
  return `${knowledge[chamber]} I only have the challenge brief so far, so I cannot confirm more detail. A human guide can help with your specific question.`;
}
