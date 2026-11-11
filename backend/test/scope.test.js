import test from 'node:test';
import assert from 'node:assert/strict';
import { respond, OUT_OF_SCOPE, INSTRUCTIONS } from '../src/ai.js';
import { isClearlyUnrelated, contextualQuestion, unavailable } from '../src/scope.js';

const history = [{ role: 'user', content: 'What are GMC economic sectors?' }, { role: 'assistant', content: 'GMC has eight priority sectors.' }];
test('clearly unrelated questions receive the same concise invitation with or without a key', async () => {
  const saved = process.env.OPENAI_API_KEY;
  try {
    for (const key of ['', 'test-key']) {
      process.env.OPENAI_API_KEY = key;
      for (const question of ['Tell me a joke.', 'What is the weather?', 'Explain quantum mechanics.', 'What is the capital of France?', 'Give me a pasta recipe', 'Who won the football match?']) {
        const response = await respond({ question, history, fetchImpl: () => { throw new Error('Off-topic request reached AI'); } });
        assert.equal(response.answer, OUT_OF_SCOPE);
        assert.equal(response.status, 'out-of-scope');
        assert.deepEqual(response.sources, []);
      }
    }
  } finally { if (saved === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = saved; }
});
test('short follow-ups use the preceding substantive user question', async () => {
  const saved = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = '';
  try {
    for (const question of ['Why?', 'Tell me more.', 'Can you elaborate?']) {
      assert.equal(contextualQuestion(question, history), history[0].content);
      assert.equal(isClearlyUnrelated(question, history), false);
      const response = await respond({ question, history });
      assert.match(response.answer, /Tourism/);
      assert.notEqual(response.answer, OUT_OF_SCOPE);
    }
    assert.match((await respond({ question: 'Why?', history: [] })).answer, /know more/);
  } finally { if (saved === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = saved; }
});
test('unknown GMC information is not labelled off-topic', async () => {
  const saved = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = '';
  try { assert.equal((await respond({ question: 'What is GMC’s exact population in 2040?' })).answer, unavailable); }
  finally { if (saved === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = saved; }
  assert.equal(isClearlyUnrelated('What financial policies does GMC have for bitcoin?'), false);
  assert.equal(isClearlyUnrelated('What is the weather there?', history), false);
});
test('live follow-up preserves history, chamber, audience, grounded context, and source links', async () => {
  const saved = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY = 'test-key';
  try {
    const result = await respond({ question: 'Why?', history, chamberId: 'chamber2', audience: 'student', fetchImpl: async (_, init) => {
      const body = JSON.parse(init.body);
      assert.deepEqual(body.input, [...history, { role: 'user', content: 'Why?' }]);
      assert.match(body.instructions, /chamber=chamber2; audience=student/);
      assert.match(body.instructions, /I can’t confirm that information/);
      assert.match(body.instructions, /Gelephu Mindfulness City/);
      return { ok: true, json: async () => ({ output: [{ content: [{ type: 'output_text', text: 'The GMC vision connects mindfulness and sustainable growth.', annotations: [{ url: 'https://gmc.bt/', title: 'GMC' }] }] }] }) };
    } });
    assert.deepEqual(result.sources, [{ url: 'https://gmc.bt/', title: 'GMC' }]);
    assert.match(INSTRUCTIONS, /short follow-ups/);
  } finally { if (saved === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = saved; }
});
