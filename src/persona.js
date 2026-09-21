import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const seedFile = path.join(here, '..', 'data', 'persona.json');

export function defaultPersona() {
  return JSON.parse(fs.readFileSync(seedFile, 'utf8'));
}

const MAX_MEMORY = 12;

/** Append new facts to persona memory, most recent last, deduplicated, capped. */
export function rememberFacts(persona, facts = []) {
  const existing = persona.memory_from_last_calls ?? [];
  const seen = new Set(existing.map((f) => f.toLowerCase().trim()));
  const added = [];
  for (const raw of facts) {
    const f = String(raw ?? '').trim();
    if (!f || seen.has(f.toLowerCase())) continue;
    seen.add(f.toLowerCase());
    existing.push(f);
    added.push(f);
  }
  persona.memory_from_last_calls = existing.slice(-MAX_MEMORY);
  return added;
}

/** Last n completed check-in summaries, most recent first. */
export function recentSummaries(state, n = 3) {
  return state.calls
    .filter((c) => c.kind === 'checkin' && c.analysis?.summary)
    .slice(-n)
    .reverse()
    .map((c) => ({ at: c.endedAt ?? c.createdAt, summary: c.analysis.summary, mood: c.analysis.mood }));
}

/** Resolve who we are calling. Phones come from env so real numbers never live in git. */
export function resolveContact(persona, phones, who) {
  switch (who) {
    case 'mia':
      return { role: 'mia', name: persona.name.split(' ')[0], fullName: persona.name, phone: phones.mia };
    case 'tom':
      return { role: 'tom', name: persona.son.name, fullName: persona.son.name, phone: phones.tom, relation: 'son' };
    case 'neighbour':
      return { role: 'neighbour', name: persona.neighbour_name ?? 'Mr Hendriks', fullName: persona.neighbour, phone: phones.neighbour };
    default:
      throw new Error(`unknown contact: ${who}`);
  }
}
