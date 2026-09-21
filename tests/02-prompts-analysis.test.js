import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultPersona } from '../src/persona.js';
import { buildCheckinPrompt, buildEscalationMiaPrompt, buildEscalationFamilyPrompt } from '../src/prompts.js';
import { heuristicAnalysis, normaliseTranscript, createAnalyzer } from '../src/analysis.js';
import { SCRIPTS } from '../src/voice/scripts.js';
import { loadConfig } from '../src/config.js';

const persona = defaultPersona();
const vitals = { steps: 200, heartRate: 78, sleepHours: 4.2, simTime: '11:00' };

test('B03 check-in prompt carries memory, last summaries and today\'s watch data', () => {
  const { system, firstMessage } = buildCheckinPrompt({
    persona,
    vitals,
    summaries: [{ at: '2026-01-01T09:00:00Z', summary: 'Mia was cheerful and went to the bakery.', mood: 'cheerful' }],
  });
  assert.match(system, /Lotte had an exam yesterday/);
  assert.match(system, /dizzy on Monday and Wednesday/);
  assert.match(system, /went to the bakery/);
  assert.match(system, /200 steps/);
  assert.match(system, /4\.2 hours of sleep/);
  assert.match(system, /restless, short night/);
  assert.match(system, /Never give medical advice/);
  assert.match(system, /Never tell her to take, skip, change or remember any medicine/, 'live call 16:30 advised taking a tablet');
  assert.match(system, /Dr Smeets/);
  assert.match(firstMessage, /Hello Mia, it's Belletje/);
});

test('B03b escalation prompts are short, ask yes/no and read out the address', () => {
  const incident = { type: 'fall', at: '2026-01-01T10:12:00Z' };
  const mia = buildEscalationMiaPrompt({ persona, incident });
  assert.match(mia.firstMessage, /detected a fall\. Are you okay\?/);
  assert.match(mia.system, /calling Tom right now/);
  const tom = buildEscalationFamilyPrompt({ persona, contact: { role: 'tom', name: 'Tom' }, incident, reason: 'She did not pick up within 30 seconds' });
  assert.match(tom.firstMessage, /Can you go now\?/);
  assert.match(tom.firstMessage, /Voorbeeldstraat 12, Maastricht/);
  assert.match(tom.firstMessage, /isn't answering her phone/);
  assert.match(tom.system, /clear yes or no/);
  assert.ok(tom.firstMessage.length < 400, 'first message must be sayable in ~15 s');
});

test('B04 heuristic analysis: "dizzy again" becomes the 3× flag with a GP suggestion', () => {
  const call = { kind: 'checkin', toName: 'Mia', vitals };
  const a = heuristicAnalysis({ call, persona, messages: SCRIPTS['checkin-dizzy'] });
  assert.equal(a.source, 'heuristic');
  assert.equal(a.flags.length, 1);
  assert.match(a.flags[0].text, /Dizzy 3× this week — suggest calling the GP/);
  assert.equal(a.urgency, 'medium');
  assert.equal(a.outcome, 'ok');
  assert.ok(a.newFacts.some((f) => /Lotte's exam went well/.test(f)));
  assert.ok(a.newFacts.some((f) => /dizzy again/i.test(f)));
  assert.match(a.mood, /tired/);
});

test('B04b heuristic outcomes for escalation calls', () => {
  const t = (kind, script) => heuristicAnalysis({ call: { kind, toName: 'x' }, persona, messages: SCRIPTS[script] }).outcome;
  assert.equal(t('escalation_tom', 'tom-yes'), 'yes');
  assert.equal(t('escalation_tom', 'tom-no'), 'no');
  assert.equal(t('escalation_mia', 'mia-ok'), 'ok');
  assert.equal(t('escalation_mia', 'mia-help'), 'needs_help');
  assert.equal(t('escalation_neighbour', 'neighbour-yes'), 'yes');
  assert.equal(heuristicAnalysis({ call: { kind: 'escalation_mia', toName: 'x' }, persona, messages: SCRIPTS['mia-help'] }).urgency, 'high');
});

test('B04c transcript normalisation handles Vapi messages and flat text', () => {
  const fromMessages = normaliseTranscript({ messages: [{ role: 'bot', message: 'Hi' }, { role: 'user', message: 'Hello' }, { role: 'system', message: 'ignored' }] });
  assert.deepEqual(fromMessages, [{ role: 'assistant', text: 'Hi' }, { role: 'user', text: 'Hello' }]);
  const fromText = normaliseTranscript({ transcript: 'AI: Are you okay?\nUser: Yes I am fine' });
  assert.deepEqual(fromText, [{ role: 'assistant', text: 'Are you okay?' }, { role: 'user', text: 'Yes I am fine' }]);
  assert.deepEqual(normaliseTranscript({}), []);
});

test('B05 LLM analyser: uses the model when it answers, falls back when it fails or times out', async () => {
  const good = createAnalyzer(loadConfig({ OPENAI_API_KEY: 'k', LLM_TIMEOUT_MS: '2000' }), {
    log: { warn() {} },
    fetchImpl: async (url, init) => {
      assert.match(url, /chat\/completions$/);
      const body = JSON.parse(init.body);
      assert.equal(body.response_format.type, 'json_object');
      assert.match(body.messages[1].content, /Transcript:/);
      const content = JSON.stringify({ summary: 'Mia is fine and cheerful.', mood: 'Cheerful', urgency: 'low', outcome: 'ok', flags: ['Mentioned dizziness once'], new_facts: ['Loves her garden'], family_message: 'She forgot her tablet but has taken it now.' });
      return new Response(JSON.stringify({ choices: [{ message: { content: '```json\n' + content + '\n```' } }] }), { status: 200 });
    },
  });
  const call = { kind: 'checkin', toName: 'Mia' };
  const a = await good.analyze({ call, persona, messages: SCRIPTS['checkin-fine'], vitals });
  assert.equal(a.source, 'llm');
  assert.equal(a.summary, 'Mia is fine and cheerful.');
  assert.deepEqual(a.flags, [{ text: 'Mentioned dizziness once', severity: 'low' }]);
  assert.deepEqual(a.newFacts, ['Loves her garden']);
  assert.equal(a.familyMessage, 'She forgot her tablet but has had it now.', 'banned medical words are swapped in code (PLAN §10)');

  const bad = createAnalyzer(loadConfig({ OPENAI_API_KEY: 'k' }), { log: { warn() {} }, fetchImpl: async () => new Response('nope', { status: 500 }) });
  const b = await bad.analyze({ call, persona, messages: SCRIPTS['checkin-dizzy'], vitals });
  assert.equal(b.source, 'heuristic');
  assert.match(b.llmError, /HTTP 500/);

  const slow = createAnalyzer(loadConfig({ OPENAI_API_KEY: 'k', LLM_TIMEOUT_MS: '50' }), {
    log: { warn() {} },
    fetchImpl: (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')))),
  });
  const t0 = Date.now();
  const c = await slow.analyze({ call, persona, messages: SCRIPTS['checkin-dizzy'], vitals });
  assert.equal(c.source, 'heuristic');
  assert.ok(Date.now() - t0 < 1000, 'timeout must be enforced');
});

test('B05b code, not the model, has the last word on the outcome enum (rule 1)', async () => {
  const lying = (outcome) =>
    createAnalyzer(loadConfig({ OPENAI_API_KEY: 'k' }), {
      log: { warn() {} },
      fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: 'S', outcome, urgency: 'high', flags: ['Dizzy again'], new_facts: ['Fall on Saturday'] }) } }] }), { status: 200 }),
    });
  const tom = await lying('unclear').analyze({ call: { kind: 'escalation_tom', toName: 'Tom' }, persona, messages: SCRIPTS['tom-yes'], vitals });
  assert.equal(tom.outcome, 'yes', 'a clear yes stays yes');
  assert.deepEqual(tom.newFacts, [], 'escalation calls never write into Mia\'s memory');
  const mia = await lying('needs_help').analyze({ call: { kind: 'checkin', toName: 'Mia' }, persona, messages: SCRIPTS['checkin-dizzy'], vitals });
  assert.equal(mia.outcome, 'ok', '"dizzy again" is a flag, not an emergency');
  assert.equal(mia.summary, 'S');
});
