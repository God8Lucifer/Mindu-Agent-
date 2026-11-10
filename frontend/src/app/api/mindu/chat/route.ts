import { demoAnswer, isChamberId, knowledge } from '@/features/mindu/knowledge';

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }); }

  if (!body || typeof body !== 'object') return Response.json({ error: 'Invalid request.' }, { status: 400 });
  const data = body as Record<string, unknown>;
  const question = typeof data.question === 'string' ? data.question.trim().slice(0, 500) : '';
  const chamber = typeof data.chamber === 'string' && isChamberId(data.chamber) ? data.chamber : 'chamber1';
  const interests = Array.isArray(data.interests)
    ? data.interests.filter((item): item is string => typeof item === 'string').slice(0, 3).map(item => item.slice(0, 50))
    : [];
  if (!question) return Response.json({ error: 'Ask Mindu a question first.' }, { status: 400 });

  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ answer: demoAnswer(question, chamber), mode: 'demo', source: 'GMC hackathon brief' });
  }

  const facts = Object.entries(knowledge).map(([id, text]) => `${id}: ${text}`).join('\n');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-6-luna',
      max_output_tokens: 280,
      instructions: `You are Mindu, a warm and concise guide to the GMC Experience Centre. Use only the approved facts below. A visitor is currently in ${chamber} and is interested in ${interests.join(', ') || 'exploring GMC'}. Answer their question in 1-3 short spoken sentences. Never invent investment, employment, construction, timeline, or policy details. If the approved facts do not answer the question, say you cannot confirm and suggest asking a human guide. Do not claim to know the visitor personally. Approved facts:\n${facts}`,
      input: question,
    }),
  });
  if (!response.ok) {
    return Response.json({ error: 'Mindu could not answer right now. Please try again.' }, { status: 502 });
  }
  const result = await response.json() as { output?: { content?: { type?: string; text?: string }[] }[] };
  const answer = result.output?.flatMap(item => item.content || []).filter(item => item.type === 'output_text').map(item => item.text || '').join(' ').trim();
  if (!answer) return Response.json({ error: 'Mindu did not return an answer.' }, { status: 502 });
  return Response.json({ answer, mode: 'ai', source: 'GMC hackathon brief' });
}
