#!/usr/bin/env node
/**
 * Trigger a demo scenario against a running server and print the timeline as it unfolds.
 *   node scripts/scenario.js 1            # simulated calls
 *   node scripts/scenario.js 2 --live     # real phone calls via the configured provider
 *   BASE=http://localhost:3000 node scripts/scenario.js 2
 */
const base = process.env.BASE ?? 'http://localhost:3000';
const n = process.argv[2] ?? '1';
const live = process.argv.includes('--live');
const seconds = Number((process.argv.find((a) => a.startsWith('--watch=')) ?? '--watch=75').split('=')[1]);

const post = (p, body) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) }).then((r) => r.json());
const t = (iso) => new Date(iso).toLocaleTimeString('en-GB');

const start = await post(`/api/demo/scenario/${n}`, { live });
if (start.error) {
  console.error(start.error);
  process.exit(1);
}
console.log(`▶ ${start.scenario} — ${start.live ? 'LIVE calls' : 'simulated calls'}`);

const seen = new Set();
const until = Date.now() + seconds * 1000;
while (Date.now() < until) {
  const s = await fetch(`${base}/api/state`).then((r) => r.json());
  for (const e of [...s.events].reverse()) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    console.log(`${t(e.at)}  ${e.severity === 'high' ? '!!' : e.severity === 'good' ? 'ok' : '  '} ${e.title}${e.detail ? ` — ${e.detail}` : ''}`);
  }
  const done = s.status.level === 'help_on_the_way' || s.status.level === 'alarm_centre' || (n === '1' && s.calls.some((c) => c.kind === 'checkin' && c.analysis));
  if (done) {
    console.log(`\nstatus: ${s.status.label} — ${s.status.detail}`);
    break;
  }
  await new Promise((r) => setTimeout(r, 1000));
}
