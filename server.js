import { loadEnvFile, loadConfig } from './src/config.js';
import { Store } from './src/store.js';
import { createVoices } from './src/voice/index.js';
import { createAnalyzer } from './src/analysis.js';
import { createNotifier } from './src/notify.js';
import { createEngine } from './src/engine.js';
import { createApp } from './src/app.js';

loadEnvFile();
const config = loadConfig();
const store = new Store({ file: config.dataFile });
const voices = createVoices(config);
const analyzer = createAnalyzer(config);
const notifier = createNotifier(config);
const engine = createEngine({ config, store, voices, analyzer, notifier });
const app = createApp({ engine, store, config, voices });

const server = app.listen(config.port, () => {
  const info = engine.info();
  console.log(`HAVI on http://localhost:${config.port}`);
  console.log(`  voice: ${info.voiceProvider}${info.liveCalls ? ' (LIVE calls)' : ' (simulated calls)'} · llm: ${info.llm ? config.llm.model : 'heuristic fallback'} · sms: ${info.sms ? 'live' : 'simulated'}`);
  console.log(`  webhook: ${info.webhookUrl ?? 'PUBLIC_URL not set — Vapi cannot reach us; use ngrok/cloudflared'}`);
  console.log(`  no-answer rule: ${info.noAnswerSeconds} s · store: ${config.dataFile}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    engine.close();
    store.save();
    server.close(() => process.exit(0));
  });
}
