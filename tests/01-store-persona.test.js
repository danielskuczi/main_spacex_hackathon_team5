import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.js';
import { defaultPersona, rememberFacts, recentSummaries, resolveContact } from '../src/persona.js';

test('B01 store persists to disk and survives a restart', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'belletje-')), 'store.json');
  const a = new Store({ file });
  a.state.events.push({ id: 'e1', title: 'hello' });
  a.state.vitals.steps = 200;
  a.save();
  const b = new Store({ file });
  assert.equal(b.state.events[0].title, 'hello');
  assert.equal(b.state.vitals.steps, 200);
  assert.equal(b.state.persona.name, 'Mia Jacobs');
});

test('B01b corrupt store is quarantined, not fatal', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'belletje-')), 'store.json');
  fs.writeFileSync(file, '{not json');
  const s = new Store({ file });
  assert.equal(s.state.persona.name, 'Mia Jacobs');
  assert.ok(fs.readdirSync(path.dirname(file)).some((f) => f.includes('corrupt')));
});

test('B02 persona memory appends, dedupes and caps', () => {
  const p = defaultPersona();
  assert.equal(p.memory_from_last_calls.length, 2);
  const added = rememberFacts(p, ["Lotte's exam went well", 'Lotte had an exam yesterday; Mia was nervous for her', '  ']);
  assert.deepEqual(added, ["Lotte's exam went well"]);
  assert.equal(p.memory_from_last_calls.length, 3);
  rememberFacts(p, Array.from({ length: 20 }, (_, i) => `fact ${i}`));
  assert.equal(p.memory_from_last_calls.length, 12);
  assert.equal(p.memory_from_last_calls.at(-1), 'fact 19');
});

test('B02b last three summaries, most recent first; contacts resolve to env phones', () => {
  const state = { calls: [1, 2, 3, 4].map((i) => ({ kind: 'checkin', endedAt: `2026-01-0${i}T10:00:00Z`, analysis: { summary: `s${i}`, mood: 'ok' } })) };
  assert.deepEqual(recentSummaries(state).map((s) => s.summary), ['s4', 's3', 's2']);
  const p = defaultPersona();
  const tom = resolveContact(p, { mia: '+311', tom: '+312', neighbour: '' }, 'tom');
  assert.equal(tom.name, 'Tom');
  assert.equal(tom.phone, '+312');
  assert.equal(resolveContact(p, { mia: '+311' }, 'mia').name, 'Mia');
  assert.throws(() => resolveContact(p, {}, 'stranger'));
});
