import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeSystem, waitFor } from './helpers.js';

const systems = [];
const sys = (opts) => {
  const s = makeSystem(opts);
  systems.push(s);
  return s;
};
after(() => systems.forEach((s) => s.engine.close()));

const calls = (store, kind) => store.state.calls.filter((c) => c.kind === kind);

test('B06 fall → Mia is called within 3 s, status "Checking on Mia"', async () => {
  const { engine, store } = sys();
  const t0 = Date.now();
  const incident = await engine.handleSignal({ type: 'fall', simulate: { mia: { answers: false } } });
  const mia = calls(store, 'escalation_mia')[0];
  assert.ok(mia, 'a call to Mia exists');
  assert.ok(Date.now() - t0 < 3000);
  assert.equal(mia.to, 'mia');
  assert.equal(mia.simulated, true);
  assert.equal(incident.stage, 'calling_mia');
  assert.equal(store.state.status.level, 'checking');
  assert.ok(store.state.events.some((e) => e.title === 'Fall detected by the watch'));
});

test('B07 no pickup within the timeout → Tom is called with "Can you go now?" and the address; Tom says yes → help on the way', async () => {
  const { engine, store, config } = sys();
  const t0 = Date.now();
  await engine.handleSignal({ type: 'fall', simulate: { mia: { answers: false }, tom: { script: 'tom-yes' } } });
  const tom = await waitFor(() => calls(store, 'escalation_tom')[0], { label: 'call to Tom' });
  const elapsed = Date.now() - t0;
  assert.ok(elapsed >= config.escalation.noAnswerMs, `Tom must not be called before the ${config.escalation.noAnswerMs} ms rule (was ${elapsed} ms)`);
  assert.match(tom.firstMessage, /Can you go now\?/);
  assert.match(tom.firstMessage, /Voorbeeldstraat 12, Maastricht/);
  assert.equal(calls(store, 'escalation_mia')[0].status, 'no-answer');
  assert.equal(store.state.status.level, 'escalating');
  assert.ok(store.state.notifications.some((n) => n.to === 'Tom' && /Can you go now/.test(n.message)), 'Tom also gets an SMS');

  await waitFor(() => store.state.status.level === 'help_on_the_way', { label: 'help on the way' });
  const inc = store.state.incidents[0];
  assert.equal(inc.stage, 'help_on_the_way');
  assert.equal(inc.helper, 'Tom');
  assert.equal(calls(store, 'escalation_tom')[0].analysis.outcome, 'yes');
  assert.ok(store.state.events.some((e) => /Help on the way — Tom/.test(e.title)));

  engine.closeIncident(inc.id);
  assert.equal(store.state.status.level, 'ok');
  assert.ok(inc.resolvedAt);
});

test('B08 Mia answers and is fine → false alarm, no call to Tom, family told', async () => {
  const { engine, store } = sys();
  await engine.handleSignal({ type: 'sos', simulate: { mia: { script: 'mia-ok' } } });
  await waitFor(() => store.state.incidents[0].resolvedAt, { label: 'incident resolved' });
  assert.equal(store.state.incidents[0].outcome, 'mia_ok');
  assert.equal(calls(store, 'escalation_tom').length, 0);
  assert.equal(store.state.status.level, 'ok');
  assert.ok(store.state.notifications.some((n) => /says she is fine/.test(n.message)));
});

test('B08b Mia answers and needs help → Tom is called immediately, before the timeout', async () => {
  const { engine, store, config } = sys({ env: { ESCALATION_NO_ANSWER_MS: '2000' } });
  const t0 = Date.now();
  await engine.handleSignal({ type: 'fall', simulate: { mia: { script: 'mia-help' }, tom: { script: 'tom-yes' } } });
  await waitFor(() => calls(store, 'escalation_tom')[0], { label: 'call to Tom' });
  assert.ok(Date.now() - t0 < config.escalation.noAnswerMs, 'help request must skip the no-answer wait');
  assert.match(calls(store, 'escalation_tom')[0].reason, /asked for help/);
});

test('B09 Tom says no → neighbour; neighbour no answer → alarm centre handoff (labelled simulated)', async () => {
  const { engine, store } = sys();
  await engine.handleSignal({ type: 'fall', simulate: { mia: { answers: false }, tom: { script: 'tom-no' }, neighbour: { answers: false } } });
  await waitFor(() => calls(store, 'escalation_neighbour')[0], { label: 'call to neighbour' });
  assert.equal(store.state.incidents[0].stage, 'calling_neighbour');
  await waitFor(() => store.state.status.level === 'alarm_centre', { label: 'alarm centre' });
  const inc = store.state.incidents[0];
  assert.equal(inc.stage, 'alarm_centre');
  const handoff = store.state.notifications.find((n) => n.channel === 'alarm-centre');
  assert.ok(handoff && handoff.simulated, 'handoff is recorded and honestly marked simulated');
  assert.match(handoff.message, /Voorbeeldstraat 12/);
  assert.match(handoff.message, /tried: Mia, Tom, Mr Hendriks/);
  assert.ok(store.state.events.some((e) => /alarm centre \(simulated in this demo\)/.test(e.title)));
});

test('B10 Tom answers in the app while his phone rings → same rule, call closed, help on the way', async () => {
  const { engine, store } = sys({ env: { MOCK_RING_MS: '5000', MOCK_TALK_MS: '5000' } });
  await engine.handleSignal({ type: 'fall', simulate: { mia: { answers: false }, tom: { script: 'tom-yes' } } });
  const inc = store.state.incidents[0];
  await waitFor(() => calls(store, 'escalation_tom')[0], { label: 'call to Tom' });
  await engine.respondToIncident(inc.id, { who: 'tom', answer: 'yes' });
  assert.equal(store.state.status.level, 'help_on_the_way');
  assert.equal(calls(store, 'escalation_tom')[0].status, 'ended');
  assert.equal(calls(store, 'escalation_tom')[0].endedReason, 'answered-in-app');
  await assert.rejects(() => engine.respondToIncident('nope', { answer: 'yes' }), /not found/);
});

test('B11 a second fall during an active incident does not start a second escalation', async () => {
  const { engine, store } = sys();
  await engine.handleSignal({ type: 'fall', simulate: { mia: { answers: false } } });
  await engine.handleSignal({ type: 'fall', simulate: { mia: { answers: false } } });
  assert.equal(store.state.incidents.length, 1);
  assert.equal(calls(store, 'escalation_mia').length, 1);
});

test('B12 a failed dial (no number configured on a live provider) is treated as no answer and escalates', async () => {
  const failing = { name: 'vapi', setHandler() {}, verify: () => true, async placeCall() { throw new Error('No phone number for Mia'); }, close() {} };
  const { engine, store } = sys({ env: { VOICE_PROVIDER: 'vapi' }, voices: { vapi: failing } });
  await engine.handleSignal({ type: 'fall' });
  const mia = calls(store, 'escalation_mia')[0];
  assert.equal(mia.status, 'failed');
  assert.equal(mia.simulated, false);
  // The chain runs to the end without waiting: every dial failed, so the alarm centre gets it.
  assert.equal(calls(store, 'escalation_tom')[0].status, 'failed');
  assert.equal(calls(store, 'escalation_neighbour')[0].status, 'failed');
  assert.equal(store.state.incidents[0].stage, 'alarm_centre');
  assert.equal(store.state.status.level, 'alarm_centre');
  assert.equal(store.state.events.filter((e) => e.type === 'error').length, 3, 'each failed dial is visible in the timeline');
});
