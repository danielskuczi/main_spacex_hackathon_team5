import { SCRIPTS, DEFAULT_SCRIPT_BY_KIND } from './scripts.js';

/**
 * Mock voice provider. Emits the same normalised events as the real provider
 * (status ringing → in-progress → transcript → ended) on timers, so the engine,
 * rules, analysis and app behave exactly as with a live call — minus the phone.
 */
export function createMockVoice({ ringMs = 2500, talkMs = 6000, noAnswerMs = 45000 } = {}, { onEvent } = {}) {
  const timers = new Set();
  const later = (ms, fn) => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    t.unref?.();
    timers.add(t);
    return t;
  };
  let emit = onEvent ?? (() => {});

  return {
    name: 'mock',
    setHandler(fn) {
      emit = fn;
    },
    async placeCall(call, { simulate = {} } = {}) {
      const providerCallId = `mock_${call.id}`;
      const scriptName = simulate.script === undefined ? DEFAULT_SCRIPT_BY_KIND[call.kind] : simulate.script;
      const answers = simulate.answers ?? scriptName != null;
      const script = SCRIPTS[scriptName] ?? [];

      later(200, () => emit({ providerCallId, type: 'status', status: 'ringing' }));
      if (!answers) {
        later(noAnswerMs, () => emit({ providerCallId, type: 'ended', endedReason: 'customer-did-not-answer', messages: [] }));
        return { providerCallId, provider: 'mock' };
      }
      later(ringMs, () => emit({ providerCallId, type: 'status', status: 'in-progress' }));
      const step = script.length ? Math.max(150, Math.floor(talkMs / script.length)) : talkMs;
      script.forEach((_, i) => {
        later(ringMs + step * (i + 1), () => emit({ providerCallId, type: 'transcript', messages: script.slice(0, i + 1) }));
      });
      later(ringMs + step * script.length + 300, () =>
        emit({
          providerCallId,
          type: 'ended',
          endedReason: 'assistant-ended-call',
          messages: script,
          durationSeconds: Math.round((step * script.length) / 1000),
        }),
      );
      return { providerCallId, provider: 'mock' };
    },
    close() {
      for (const t of timers) clearTimeout(t);
      timers.clear();
    },
  };
}
