import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeSystem, listen, waitFor } from './helpers.js';
import { createVapiVoice, buildCallPayload, parseWebhook } from '../src/voice/vapi.js';
import { loadConfig } from '../src/config.js';
import { SCRIPTS } from '../src/voice/scripts.js';

const cleanups = [];
after(async () => {
  for (const c of cleanups) await c();
});
async function boot(opts) {
  const s = makeSystem(opts);
  const srv = await listen(s.app);
  cleanups.push(async () => {
    s.engine.close();
    await srv.close();
  });
  return { ...s, ...srv };
}

test('B13 simulator signals → state; proactive rule (short night + <500 steps after 10:00) starts a check-in by itself', async () => {
  const { json, store } = await boot();
  let r = await json('/api/signals', { method: 'POST', body: { type: 'vitals', steps: 4000, heartRate: 72, sleepHours: 7.5, simTime: '11:00' } });
  assert.equal(r.status, 202);
  assert.equal(r.body.proactive, null);
  assert.equal(store.state.calls.length, 0, 'a good morning does not trigger a call');

  r = await json('/api/signals', { method: 'POST', body: { type: 'vitals', steps: 200, sleepHours: 4.2, simTime: '09:00' } });
  assert.equal(r.body.proactive, null, 'before 10:00 low steps are normal');

  r = await json('/api/signals', { method: 'POST', body: { type: 'vitals', steps: 200, sleepHours: 4.2, simTime: '11:00', simulate: { script: 'checkin-dizzy' } } });
  assert.match(r.body.proactive, /restless night/);
  assert.match(r.body.proactive, /only 200 steps by 11:00/);
  const checkin = store.state.calls.find((c) => c.kind === 'checkin');
  assert.ok(checkin, 'check-in started automatically');
  assert.match(checkin.systemPrompt, /200 steps/);

  const state = (await json('/api/state')).body;
  assert.equal(state.vitals.steps, 200);
  assert.equal(state.status.level, 'checking');
  assert.ok(state.events.some((e) => e.type === 'proactive'));
  assert.ok(!('systemPrompt' in state.calls[0]), 'prompts are not shipped to the app');

  r = await json('/api/signals', { method: 'POST', body: { type: 'bogus' } });
  assert.equal(r.status, 400);
});

test('B14 check-in end to end: summary, flag, memory and status land in /api/state within budget', async () => {
  const { json, store } = await boot();
  const t0 = Date.now();
  const r = await json('/api/calls', { method: 'POST', body: { kind: 'checkin', simulate: { script: 'checkin-dizzy' } } });
  assert.equal(r.status, 202);
  const dup = await json('/api/calls', { method: 'POST', body: { kind: 'checkin', simulate: {} } });
  assert.equal(dup.status, 409, 'no second concurrent check-in');

  const state = await waitFor(async () => {
    const s = (await json('/api/state')).body;
    return s.calls[0]?.analysis ? s : null;
  }, { label: 'call analysed' });
  assert.ok(Date.now() - t0 < 3000);
  const call = state.calls[0];
  assert.equal(call.simulated, true);
  assert.equal(call.messages.length, SCRIPTS['checkin-dizzy'].length);
  assert.match(call.analysis.summary, /dizzy/);
  assert.ok(state.flags.some((f) => /Dizzy 3× this week/.test(f.text)));
  assert.equal(state.status.level, 'attention');
  assert.ok(state.persona.memory.some((m) => /Lotte's exam went well/.test(m)));
  assert.ok(state.events.some((e) => e.type === 'memory'));

  const flag = state.flags[0];
  const res = await json(`/api/flags/${flag.id}/resolve`, { method: 'POST' });
  assert.equal(res.status, 200);
  assert.equal(store.state.status.level, 'ok');

  const detail = await json(`/api/calls/${call.id}`);
  assert.equal(detail.status, 200);
  assert.match(detail.body.systemPrompt, /Belletje/);
});

test('B15 Vapi payload: transient assistant with prompt, customer number, webhook URL and secret', () => {
  const config = loadConfig({ VOICE_PROVIDER: 'vapi', VAPI_API_KEY: 'k', VAPI_PHONE_NUMBER_ID: 'pn_1', VAPI_WEBHOOK_SECRET: 's3cret', PUBLIC_URL: 'https://demo.example.com/', CALL_LANGUAGE: 'nl' });
  const call = { id: 'c1', kind: 'checkin', to: 'mia', toName: 'Mia', phone: '+31600000001', systemPrompt: 'SYSTEM', firstMessage: 'Hallo Mia', incidentId: null };
  const p = buildCallPayload(call, config);
  assert.equal(p.phoneNumberId, 'pn_1');
  assert.equal(p.customer.number, '+31600000001');
  assert.equal(p.assistant.model.messages[0].content, 'SYSTEM');
  assert.equal(p.assistant.firstMessage, 'Hallo Mia');
  assert.equal(p.assistant.transcriber.language, 'nl');
  assert.equal(p.assistant.server.url, 'https://demo.example.com/api/webhooks/vapi');
  assert.equal(p.assistant.server.secret, 's3cret');
  assert.ok(p.assistant.serverMessages.includes('end-of-call-report'));
  assert.equal(p.metadata.belletjeCallId, 'c1');
});

test('B15b Vapi provider posts to /call and returns the provider id; refuses to dial without a number', async () => {
  let posted;
  const config = loadConfig({ VOICE_PROVIDER: 'vapi', VAPI_API_KEY: 'k', VAPI_PHONE_NUMBER_ID: 'pn_1' });
  const vapi = createVapiVoice(config, {
    fetchImpl: async (url, init) => {
      posted = { url, init };
      return new Response(JSON.stringify({ id: 'vapi_123', status: 'queued' }), { status: 201 });
    },
  });
  const res = await vapi.placeCall({ id: 'c1', kind: 'escalation_tom', to: 'tom', toName: 'Tom', phone: '+31600000002', systemPrompt: 'S', firstMessage: 'F' });
  assert.equal(res.providerCallId, 'vapi_123');
  assert.equal(posted.url, 'https://api.vapi.ai/call');
  assert.equal(posted.init.headers.authorization, 'Bearer k');
  await assert.rejects(() => vapi.placeCall({ id: 'c2', kind: 'checkin', to: 'mia', toName: 'Mia', phone: '' }), /MIA_PHONE/);
});

test('B16 webhook: status → answered, end-of-call-report → transcript analysed; bad secret rejected; unknown call ignored', async () => {
  const config = loadConfig({ VOICE_PROVIDER: 'vapi', VAPI_API_KEY: 'k', VAPI_PHONE_NUMBER_ID: 'pn', VAPI_WEBHOOK_SECRET: 'shh', MIA_PHONE: '+31600000001' });
  const vapi = createVapiVoice(config, { fetchImpl: async () => new Response(JSON.stringify({ id: 'vapi_live_1' }), { status: 201 }) });
  const { json, store } = await boot({ env: { VOICE_PROVIDER: 'vapi', VAPI_API_KEY: 'k', VAPI_PHONE_NUMBER_ID: 'pn', VAPI_WEBHOOK_SECRET: 'shh', MIA_PHONE: '+31600000001' }, voices: { vapi } });

  const started = await json('/api/calls', { method: 'POST', body: { kind: 'checkin' } });
  assert.equal(started.body.simulated, false);
  assert.equal(started.body.provider, 'vapi');

  let r = await json('/api/webhooks/vapi', { method: 'POST', body: { message: { type: 'status-update', status: 'in-progress', call: { id: 'vapi_live_1' } } } });
  assert.equal(r.status, 401, 'missing secret must be rejected');
  const H = { 'x-vapi-secret': 'shh' };
  r = await json('/api/webhooks/vapi', { method: 'POST', headers: H, body: { message: { type: 'status-update', status: 'in-progress', call: { id: 'vapi_live_1' } } } });
  assert.equal(r.status, 200);
  await waitFor(() => store.state.calls[0].answeredAt, { label: 'answered' });

  r = await json('/api/webhooks/vapi', { method: 'POST', headers: H, body: { message: { type: 'transcript', transcriptType: 'final', role: 'user', transcript: 'Hello dear', call: { id: 'vapi_live_1' } } } });
  await waitFor(() => store.state.calls[0].messages.length === 1, { label: 'live transcript line' });

  r = await json('/api/webhooks/vapi', { method: 'POST', headers: H, body: { message: { type: 'end-of-call-report', endedReason: 'assistant-ended-call', durationSeconds: 61, transcript: 'AI: How are you?\nUser: I felt dizzy again this morning, but Lotte passed her exam.', call: { id: 'vapi_live_1' } } } });
  assert.equal(r.status, 200);
  const done = await waitFor(() => store.state.calls[0].analysis && store.state.calls[0], { label: 'analysis' });
  assert.equal(done.status, 'ended');
  assert.equal(done.durationSeconds, 61);
  assert.ok(store.state.flags.some((f) => /Dizzy 3×/.test(f.text)));

  r = await json('/api/webhooks/vapi', { method: 'POST', headers: H, body: { message: { type: 'end-of-call-report', call: { id: 'ghost' } } } });
  assert.equal(r.status, 200, 'unknown call must not crash the server');
  r = await json('/api/webhooks/vapi', { method: 'POST', headers: H, body: { message: { type: 'speech-update' } } });
  assert.deepEqual(r.body, { ignored: true });
});

test('B16b webhook parsing: no-answer report closes the call as no-answer', async () => {
  const evt = parseWebhook({ message: { type: 'end-of-call-report', endedReason: 'customer-did-not-answer', call: { id: 'x' } } });
  assert.equal(evt.type, 'ended');
  assert.deepEqual(evt.messages, []);
  assert.equal(parseWebhook({ message: { type: 'status-update', status: 'ended', call: { id: 'x' } } }), null);
  assert.equal(parseWebhook({}), null);
});

test('B17 demo scenarios, reset, and restart-safe store', async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'belletje-')), 'store.json');
  const first = await boot({ file });
  const list = await first.json('/api/demo/scenarios');
  assert.equal(list.body.length, 2);
  const r = await first.json('/api/demo/scenario/2', { method: 'POST', body: { live: true } });
  assert.equal(r.status, 202);
  assert.equal(r.body.live, false, 'live is impossible without a provider and must say so');
  await waitFor(() => first.store.state.status.level === 'help_on_the_way', { label: 'scenario 2 completes' });
  assert.equal((await first.json('/api/demo/scenario/9', { method: 'POST' })).status, 404);

  const second = makeSystem({ file });
  assert.equal(second.store.state.status.level, 'help_on_the_way', 'state survives a restart');
  assert.equal(second.store.state.incidents.length, 1);
  second.engine.close();

  const reset = await first.json('/api/reset', { method: 'POST' });
  assert.equal(reset.status, 200);
  assert.equal(first.store.state.calls.length, 0);
  assert.equal(first.store.state.persona.memory_from_last_calls.length, 2, 'reset restores the seed memory');
});

test('B18 the app shell: named controls exist, no CDN, polls every 2 s', async () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  const js = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
  for (const label of ['SOS button', 'Steps slider', 'Heart rate slider', 'Sleep slider', 'Fall detected toggle', 'Start check-in call', 'Live calls toggle', 'Run scenario 1', 'Run scenario 2', 'Reset demo', 'Watch time'])
    assert.ok(html.includes(`aria-label="${label}"`), `missing control: ${label}`);
  for (const label of ['I am going', 'I cannot go', 'Mark Mia safe', 'Mark flag handled']) assert.ok(js.includes(`aria-label="${label}"`), `missing control: ${label}`);
  for (const id of ['status-home', 'timeline', 'call-detail', 'go-now-alert', 'watch-simulator']) assert.ok(html.includes(`data-testid="${id}"`), `missing screen: ${id}`);
  assert.ok(!/https?:\/\/(cdn|unpkg|jsdelivr|fonts\.googleapis)/.test(html + js + css), 'the shell must work on flaky venue Wi-Fi: no CDN');
  assert.match(js, /setInterval\(poll, 2000\)/);
  assert.match(css, /min-height: 44px/);
  assert.match(html, /<html lang="en">/);
  assert.match(html, /role="alertdialog"/);

  const { base } = await boot();
  const res = await fetch(base + '/');
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Belletje/);
  assert.equal((await fetch(base + '/app.js')).status, 200);
  assert.equal((await fetch(base + '/api/health')).status, 200);
});
