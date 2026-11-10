// Conservative scope gate. An LLM response is also instructed to refuse unrelated topics.
const gmc = /\bGMC\b|gelephu(?:\s+mindfulness\s+city)?|mindfulness\s+city|choego\s+building|experience\s+centre|experience\s+center/i;
const topics = /\b(chamber|urban blueprint|masterplan|3d mapping|projection mapping|eight economic sectors|economic sectors|the vision|my city my future)\b/i;
const referents = /\b(this|here|it|that|current|next)\s+(chamber|room|centre|center|exhibit|display|map|model)\b/i;
const unrelated = /\b(python|javascript|coding|weather|recipe|football|cricket|bitcoin|stocks|stock market|homework|write an essay|joke|astrology|politics|election|medical|diagnos|capital of|prime minister|president|password|hack)\b/i;
export function isGmcQuestion(message, chamber = 'reception') {
  if (typeof message !== 'string' || !message.trim()) return false;
  const q = message.trim();
  if (unrelated.test(q)) return false;
  if (gmc.test(q) || topics.test(q)) return true;
  // Deictic questions about a selected chamber. No free-form unrelated follow-ups.
  return chamber !== 'reception' && (referents.test(q) || /^(what (is|can i see|does)|tell me about|explain|show me|why is) (this|here|it|the room)\??$/i.test(q));
}
export const refusal = "I'm Mindu, your Gelephu Mindfulness City guide. I can only answer questions about GMC, its Experience Centre and the four chambers. Try asking me about GMC's vision, urban blueprint or economic sectors.";
