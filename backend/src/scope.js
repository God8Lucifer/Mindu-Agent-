// Only reject clearly unrelated requests here. Ambiguous questions go to the
// grounded model rather than requiring visitors to repeat the word "GMC".
const gmc = /\bgmc\b|gelephu|mindfulness\s+city|bhutan|experience\s+cent(?:re|er)|\b(chamber|exhibit|masterplan|urban blueprint)\b/i;
const unrelated = /\b(python|javascript|football|cricket|soccer|basketball|horoscope|astrology|stock market|password|recipe|recipes|weather|quantum mechanics|calculus|song lyrics)\b|\b(weather|capital|president|prime minister) (in|of)\b|\b(write|tell).{0,20}\b(joke|poem|essay)\b|\b(cook|bake|solve).{0,30}\b(pasta|cake|pizza|equation)\b/i;
export const refusal = 'I’m here to help you explore Gelephu Mindfulness City. Would you like to hear about the city’s vision or find an exhibit?';
export const unavailable = 'I can’t confirm that information about GMC from the sources available to me. Please check with a GMC guide or the official GMC website.';
export function isFollowUp(message) {
  return /^(why|how so|tell me more|more|go on|explain|explain more|what else|and then|what about that|why is that|can you elaborate|can you tell me more)[?!.\s]*$/i.test(message.trim());
}
export function contextualQuestion(message, history = []) {
  const followUp = isFollowUp(message);
  const referring = /\b(there|here|that|those|their|its)\b/i.test(message);
  if (!followUp && !referring) return message;
  // Do not attach a follow-up to an older GMC turn after an off-topic refusal.
  const last = history.at(-1);
  if (last?.role === 'assistant' && last.content === refusal) return followUp ? '' : message;
  const previous = [...history].reverse().find(turn => turn.role === 'user' && !isFollowUp(turn.content));
  if (!previous) return followUp ? '' : message;
  return followUp ? previous.content : `${previous.content} ${message}`;
}
export function isClearlyUnrelated(message, history = []) {
  const question = contextualQuestion(message, history);
  return !!question && unrelated.test(question) && !gmc.test(question);
}
