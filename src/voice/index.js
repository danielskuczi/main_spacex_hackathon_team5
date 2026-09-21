import { createMockVoice } from './mock.js';
import { createVapiVoice } from './vapi.js';

export function createVoices(config, deps = {}) {
  const voices = { mock: createMockVoice(config.mock) };
  if (config.voiceProvider === 'vapi') voices.vapi = createVapiVoice(config, deps);
  else if (config.voiceProvider !== 'mock') throw new Error(`Unknown VOICE_PROVIDER "${config.voiceProvider}" (use mock or vapi)`);
  return voices;
}
