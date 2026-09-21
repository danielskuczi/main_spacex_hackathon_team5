import { normaliseTranscript } from '../analysis.js';

const NO_ANSWER_REASONS = new Set([
  'customer-did-not-answer',
  'customer-busy',
  'voicemail',
  'twilio-failed-to-connect-call',
  'call.in-progress.error-sip-telephony-provider-failed-to-connect-call',
  'assistant-not-found',
]);

export const isNoAnswerReason = (reason) => !reason || NO_ANSWER_REASONS.has(reason) || /did-not-answer|busy|voicemail|failed-to-connect/.test(reason);

/**
 * Build a Vapi outbound-call request with a transient (inline) assistant, so every call
 * gets its own system prompt — that is how memory and today's watch data reach the voice.
 * https://docs.vapi.ai/api-reference/calls/create
 */
export function buildCallPayload(call, config) {
  const { vapi, publicUrl, callLanguage, escalation } = config;
  const isCheckin = call.kind === 'checkin';
  return {
    phoneNumberId: vapi.phoneNumberId,
    customer: { number: call.phone, name: call.toName },
    metadata: { belletjeCallId: call.id, kind: call.kind, incidentId: call.incidentId ?? null },
    assistant: {
      name: isCheckin ? 'Belletje check-in' : 'Belletje escalation',
      firstMessage: call.firstMessage,
      firstMessageMode: 'assistant-speaks-first',
      model: {
        provider: vapi.modelProvider,
        model: vapi.model,
        temperature: isCheckin ? 0.6 : 0.2,
        messages: [{ role: 'system', content: call.systemPrompt }],
      },
      voice: { provider: vapi.voiceProvider, voiceId: vapi.voiceId },
      transcriber: { provider: 'deepgram', model: 'nova-2', language: callLanguage === 'nl' ? 'nl' : 'en' },
      endCallFunctionEnabled: true,
      endCallMessage: isCheckin ? 'Bye for now, Mia.' : 'Goodbye.',
      maxDurationSeconds: isCheckin ? escalation.maxCallSeconds : 90,
      silenceTimeoutSeconds: isCheckin ? 20 : 12,
      backgroundSound: 'off',
      server: publicUrl ? { url: `${publicUrl}/api/webhooks/vapi`, secret: vapi.webhookSecret || undefined, timeoutSeconds: 20 } : undefined,
      serverMessages: ['end-of-call-report', 'status-update', 'transcript'],
    },
  };
}

/** Normalise a Vapi server message into the engine's event shape (or null if irrelevant). */
export function parseWebhook(body) {
  const msg = body?.message ?? body;
  if (!msg || typeof msg !== 'object') return null;
  const providerCallId = msg.call?.id ?? msg.callId ?? null;
  if (!providerCallId) return null;
  switch (msg.type) {
    case 'status-update':
      if (msg.status === 'ended') return null; // the end-of-call-report carries the transcript
      return { providerCallId, type: 'status', status: msg.status, endedReason: msg.endedReason };
    case 'transcript':
      if (msg.transcriptType && msg.transcriptType !== 'final') return null;
      return {
        providerCallId,
        type: 'transcript',
        append: { role: msg.role === 'user' ? 'user' : 'assistant', text: String(msg.transcript ?? '').trim() },
      };
    case 'end-of-call-report':
      return {
        providerCallId,
        type: 'ended',
        endedReason: msg.endedReason,
        messages: normaliseTranscript({ messages: msg.artifact?.messages ?? msg.messages, transcript: msg.artifact?.transcript ?? msg.transcript }),
        providerSummary: msg.summary ?? msg.analysis?.summary ?? null,
        recordingUrl: msg.recordingUrl ?? msg.artifact?.recordingUrl ?? null,
        durationSeconds: msg.durationSeconds ?? null,
      };
    default:
      return null;
  }
}

export function createVapiVoice(config, { fetchImpl = globalThis.fetch } = {}) {
  const { vapi } = config;
  return {
    name: 'vapi',
    setHandler() {}, // events arrive via the webhook route
    verify(headers) {
      if (!vapi.webhookSecret) return true;
      return headers['x-vapi-secret'] === vapi.webhookSecret;
    },
    async placeCall(call) {
      if (!vapi.apiKey || !vapi.phoneNumberId) throw new Error('Vapi not configured: set VAPI_API_KEY and VAPI_PHONE_NUMBER_ID');
      if (!call.phone) throw new Error(`No phone number for ${call.toName} (set ${call.to.toUpperCase()}_PHONE)`);
      const res = await fetchImpl(`${vapi.baseUrl}/call`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${vapi.apiKey}` },
        body: JSON.stringify(buildCallPayload(call, config)),
      });
      if (!res.ok) throw new Error(`Vapi HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const data = await res.json();
      return { providerCallId: data.id, provider: 'vapi', raw: { status: data.status } };
    },
    close() {},
  };
}
