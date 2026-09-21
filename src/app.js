import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWebhook } from './voice/vapi.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Demo scenarios from PLAN.md §6. `live: true` uses the configured voice provider; otherwise the mock. */
export const SCENARIOS = {
  1: {
    name: 'Proactive check-in',
    description: 'Restless night, 200 steps by 11:00 → Belletje calls Mia, remembers Lotte, hears "dizzy again" → flag for Tom.',
    async run(engine, { live }) {
      const simulate = live ? undefined : { script: 'checkin-dizzy' };
      return engine.handleSignal({ type: 'vitals', steps: 200, heartRate: 78, sleepHours: 4.2, simTime: '11:00', simulate });
    },
  },
  2: {
    name: 'Fall, no answer, Tom',
    description: 'Fall detected → Mia does not answer within 30 s → Tom is called → "yes" → help on the way.',
    async run(engine, { live }) {
      const simulate = live ? undefined : { mia: { answers: false }, tom: { script: 'tom-yes' }, neighbour: { script: 'neighbour-yes' } };
      return engine.handleSignal({ type: 'fall', simulate });
    },
  },
};

export function createApp({ engine, store, config, voices }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  const wrap = (fn) => (req, res) =>
    Promise.resolve(fn(req, res)).catch((err) => {
      const status = err.status ?? 500;
      if (status >= 500) console.error(err);
      res.status(status).json({ error: err.message });
    });

  app.get('/api/health', (req, res) => res.json({ ok: true, ...engine.info() }));

  app.get('/api/state', (req, res) => {
    const s = store.state;
    res.json({
      meta: engine.info(),
      now: new Date().toISOString(),
      persona: { name: s.persona.name, age: s.persona.age, address: s.persona.address, son: s.persona.son.name, neighbour: s.persona.neighbour, gp: s.persona.gp, memory: s.persona.memory_from_last_calls },
      status: s.status,
      vitals: s.vitals,
      flags: s.flags,
      notifications: s.notifications.slice(-20).reverse(),
      incidents: s.incidents.slice(-10).reverse(),
      activeIncident: s.incidents.find((i) => !i.resolvedAt) ?? null,
      calls: s.calls.slice(-30).reverse().map(({ systemPrompt, ...c }) => c),
      events: s.events.slice(-120).reverse(),
    });
  });

  app.get('/api/calls/:id', (req, res) => {
    const c = store.state.calls.find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'call not found' });
    res.json(c);
  });

  // 1) simulator signals in
  app.post('/api/signals', wrap(async (req, res) => res.status(202).json(await engine.handleSignal(req.body ?? {}))));

  // 2) start a call
  app.post('/api/calls', wrap(async (req, res) => {
    const { kind = 'checkin', simulate, reason } = req.body ?? {};
    if (kind !== 'checkin') throw Object.assign(new Error('only kind=checkin can be started by hand; escalation calls come from the rules'), { status: 400 });
    res.status(202).json(await engine.startCheckin({ simulate, reason }));
  }));

  // 3) webhook: call status + end-of-call transcript
  app.post('/api/webhooks/vapi', wrap(async (req, res) => {
    if (voices.vapi && !voices.vapi.verify(req.headers)) return res.status(401).json({ error: 'bad webhook secret' });
    const evt = parseWebhook(req.body);
    if (!evt) return res.json({ ignored: true });
    // Reply fast; Vapi retries slow webhooks. Rules run after the response.
    res.json({ received: evt.type });
    await engine.record(engine.handleVoiceEvent(evt));
  }));

  app.post('/api/incidents/:id/respond', wrap(async (req, res) => {
    const { who = 'tom', answer } = req.body ?? {};
    if (!['yes', 'no'].includes(answer)) throw Object.assign(new Error('answer must be yes or no'), { status: 400 });
    res.json(await engine.respondToIncident(req.params.id, { who, answer, via: 'app' }));
  }));
  app.post('/api/incidents/:id/close', wrap(async (req, res) => res.json(engine.closeIncident(req.params.id, req.body ?? {}))));
  app.post('/api/flags/:id/resolve', wrap(async (req, res) => res.json(engine.resolveFlag(req.params.id))));

  app.get('/api/demo/scenarios', (req, res) =>
    res.json(Object.entries(SCENARIOS).map(([id, s]) => ({ id: Number(id), name: s.name, description: s.description }))),
  );
  app.post('/api/demo/scenario/:n', wrap(async (req, res) => {
    const sc = SCENARIOS[req.params.n];
    if (!sc) throw Object.assign(new Error('unknown scenario'), { status: 404 });
    const live = Boolean(req.body?.live) && config.voiceProvider !== 'mock';
    engine.addEvent({ type: 'demo', title: `Scenario ${req.params.n} started — ${sc.name} (${live ? 'LIVE calls' : 'simulated calls'})` });
    res.status(202).json({ scenario: sc.name, live, result: await sc.run(engine, { live }) });
  }));
  app.post('/api/reset', (req, res) => res.json({ ok: true, state: engine.reset() }));

  app.use(express.static(path.join(here, '..', 'public'), { etag: false, maxAge: 0 }));
  return app;
}
