#!/usr/bin/env node
// Reset the demo state on a running server (or delete the store file if it is not running).
import fs from 'node:fs';
const base = process.env.BASE ?? 'http://localhost:3000';
try {
  const r = await fetch(`${base}/api/reset`, { method: 'POST' });
  console.log(r.ok ? 'demo state reset' : `server said ${r.status}`);
} catch {
  const file = process.env.DATA_FILE ?? 'data/store.json';
  if (fs.existsSync(file)) fs.unlinkSync(file);
  console.log(`server not running; removed ${file}`);
}
