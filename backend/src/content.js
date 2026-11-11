// Source: supplied GMC Experience Centre hackathon brief, pages 6–14.
// These descriptions are intentionally limited to facts present in the brief.
export const chambers = [
  { id: 'reception', name: 'Welcome to GMC', heading: 'A city being imagined differently', facts: [
    'Gelephu Mindfulness City (GMC) has an Experience Centre in the Choego Building.',
    'The Experience Centre introduces visitors to the city’s vision and future through digital experiences, 360-degree storytelling and interactive displays.',
    'Visitors can explore the city’s masterplan and eight economic sectors.'
  ]},
  { id: '1', name: 'Chamber 1 · The Vision', heading: 'Imagine the vision', facts: [
    'Chamber 1 is an immersive experience room themed around the vision of Gelephu Mindfulness City.',
    'The Experience Centre uses immersive visual storytelling to introduce the city’s vision.'
  ]},
  { id: '2', name: 'Chamber 2 · Urban Blueprint', heading: 'See the city take shape', facts: [
    'Chamber 2 focuses on 3D model mapping and GMC’s urban blueprint.',
    'Visitors can explore the masterplan through an interactive 3D projection mapping display.'
  ]},
  { id: '3', name: 'Chamber 3 · Economy of Tomorrow', heading: 'Discover future opportunities', facts: [
    'Chamber 3 introduces GMC’s eight economic sectors and emerging opportunities.',
    'The Experience Centre showcases the economic vision of GMC.'
  ]},
  { id: '4', name: 'Chamber 4 · My City, My Future', heading: 'Picture life in GMC', facts: [
    'Chamber 4 is themed around life in Gelephu Mindfulness City.',
    'This chamber encourages visitors to imagine themselves as part of the city’s future.'
  ]}
];
export const welcome = 'Kuzuzangpo la! Welcome to the Gelephu Mindfulness City Experience Centre. I’m your GMC AI guide. Here you can discover GMC’s vision, see its urban blueprint, explore eight economic sectors, and imagine life in the city. Ask me a question or choose a chamber to begin!';
export function getChamber(id) { return chambers.find(c => c.id === String(id)) || chambers[0]; }
// Offline responses are deliberately specific to a narrow set of known facts.
// Questions outside those facts must not receive a generic welcome disguised as an answer.
export function demoAnswer(question, chamberId) {
  const q = question.toLowerCase().trim();
  const c = getChamber(chamberId);
  if (/revolution|transform|impact|benefit|change bhutan|important for bhutan|future of bhutan|successful|success/.test(q)) {
    return 'GMC could represent an important opportunity for Bhutan because its vision connects city development, economic opportunities and mindful living. The Experience Centre shows the vision and planned economic sectors. However, whether it becomes revolutionary depends on implementation and outcomes; the hackathon brief does not provide evidence to predict those results.';
  }
  if (/risk|challenge|drawback|concern|disadvantage/.test(q)) {
    return 'The Experience Centre brief describes GMC’s vision but does not assess project risks or delivery challenges. It would be misleading for me to state specific risks as confirmed facts without an official source.';
  }
  if (/^(hi|hello|hey|kuzuzangpo)[!. ]*$/.test(q)) {
    return 'Kuzuzangpo la! I’m your GMC guide. I can explain GMC’s vision, the Experience Centre, its urban blueprint and its four chambers. What would you like to know?';
  }
  if (/chamber\s*(4|four)|my city.*future/.test(q)) return 'Chamber 4, My City, My Future, invites visitors to imagine life in Gelephu Mindfulness City and picture themselves as part of its future.';
  if (/chamber\s*(3|three)/.test(q)) return 'Chamber 3, Economy of Tomorrow, introduces GMC’s eight economic sectors and potential opportunities. The provided brief does not list all eight sector names.';
  if (/chamber\s*(2|two)/.test(q)) return 'Chamber 2, Urban Blueprint, presents the GMC masterplan through interactive 3D projection mapping.';
  if (/chamber\s*(1|one)/.test(q)) return 'Chamber 1, The Vision, is an immersive experience room that introduces Gelephu Mindfulness City using visual storytelling.';
  if (/where|location|building|located/.test(q)) return 'The GMC Experience Centre is located in Choego Building. It introduces visitors to the vision and future of Gelephu Mindfulness City.';
  if (/how many.*(chamber|room)|chambers|tour route/.test(q)) return 'The Experience Centre has four main chambers: The Vision, Urban Blueprint, Economy of Tomorrow, and My City, My Future.';
  if (/sector|business|econom|invest|opportunit/.test(q)) return 'Chamber 3 introduces GMC’s eight economic sectors and emerging opportunities. The hackathon brief does not name every sector or provide verified investment terms.';
  if (/3d|model|map|blueprint|planning|masterplan/.test(q)) return 'Chamber 2 showcases the urban blueprint through an interactive 3D projection mapping model. It helps visitors explore GMC’s masterplan.';
  if (/vision|purpose|aim|goal|why.*gmc/.test(q)) return 'GMC’s Experience Centre presents the city’s vision and planned future through digital experiences, immersive visual storytelling and interactive displays. The aim is to make that vision meaningful to visitors.';
  if (/student|child|school/.test(q)) return 'Students can explore the GMC vision through the immersive Chamber 1 experience, discover the city masterplan in Chamber 2, and learn about economic sectors in Chamber 3.';
  if (/who.*visit|visitor|tourist|delegation/.test(q)) return 'The Experience Centre is designed for tourists, potential investors, business representatives, students, local residents, and VIPs or delegations.';
  if (/what is (gmc|gelephu)|tell me about (gmc|gelephu)|explain (gmc|gelephu)/.test(q)) return 'Gelephu Mindfulness City is a city initiative in Bhutan. Its Experience Centre in Choego Building presents GMC’s vision and future through interactive displays, 360-degree storytelling, the masterplan, and eight economic sectors.';
  return 'That is a question about GMC, but I do not have enough verified information in the provided Experience Centre brief to answer it accurately. Try asking about a specific chamber or the masterplan, or consult the GMC team for official details.';
}
