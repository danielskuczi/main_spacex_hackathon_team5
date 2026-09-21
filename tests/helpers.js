import { loadConfig } from '../src/config.js';
import { Store } from '../src/store.js';
import { createMockVoice } from '../src/voice/mock.js';
import { createAnalyzer } from '../src/analysis.js';
import { createNotifier } from '../src/notify.js';
import { createEngine } from '../src/engine.js';
import { createApp } from '../src/app.js';

const quiet = { log() {}, warn() {}, error() {} };

/** Fast timers so the whole battery runs in seconds; rules are identical to production. */
export function testEnv(overrides = {}) {
  return {
    VOICE_PROVIDER: 'mock',
    ESCALATION_NO_ANSWER_MS: '120',
    MOCK_RING_MS: '30',
    MOCK_TALK_MS: '120',
    MOCK_NO_ANSWER_MS: '5000',
    CHECKIN_COOLDOWN_MS: '0',
    ...overrides,
  };
}

export function makeSystem({ env = {}, file = null, voices: extraVoices = {}, fetchImpl } = {}) {
  const config = loadConfig(testEnv(env));
  const store = new Store({ file });
  const voices = { mock: createMockVoice(config.mock), ...extraVoices };
  const analyzer = createAnalyzer(config, { fetchImpl, log: quiet });
  const notifier = createNotifier(config, { fetchImpl, log: quiet });
  const engine = createEngine({ config, store, voices, analyzer, notifier, log: quiet });
  const app = createApp({ engine, store, config, voices });
  return { config, store, voices, engine, app };
}

export async function listen(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const json = async (path, { method = 'GET', body, headers = {} } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json().catch(() => null) };
  };
  return { server, base, json, close: () => new Promise((r) => server.close(r)) };
}

export async function waitFor(fn, { timeout = 4000, every = 15, label = 'condition' } = {}) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for ${label}`);
    await new Promise((r) => setTimeout(r, every));
  }
}
