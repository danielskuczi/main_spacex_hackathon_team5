import fs from 'node:fs';
import path from 'node:path';
import { defaultPersona } from './persona.js';

export function emptyState(persona = defaultPersona()) {
  return {
    version: 1,
    persona,
    status: { level: 'ok', label: 'All good', detail: 'No check-in yet today', since: new Date().toISOString() },
    vitals: { steps: null, heartRate: null, sleepHours: null, simTime: null, updatedAt: null },
    calls: [],
    events: [],
    flags: [],
    notifications: [],
    incidents: [],
    lastProactiveAt: null,
  };
}

/**
 * Tiny JSON store: whole state in memory, written atomically after every mutation.
 * `file: null` keeps it in memory only (tests).
 */
export class Store {
  constructor({ file = null, persona } = {}) {
    this.file = file;
    this.state = emptyState(persona);
    if (file) this.load();
  }

  load() {
    if (!this.file || !fs.existsSync(this.file)) return this.state;
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      // Merge so that new top-level keys added in code survive an old store.json.
      this.state = { ...emptyState(raw.persona ?? undefined), ...raw };
    } catch (err) {
      const backup = `${this.file}.corrupt-${Date.now()}`;
      fs.renameSync(this.file, backup);
      console.error(`store: could not parse ${this.file}; moved to ${backup}`, err.message);
    }
    return this.state;
  }

  save() {
    if (!this.file) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2));
    fs.renameSync(tmp, this.file);
  }

  reset({ keepMemory = true } = {}) {
    const persona = keepMemory ? this.state.persona : defaultPersona();
    this.state = emptyState(persona);
    this.save();
    return this.state;
  }
}
