const bool = (v, d) => (v == null || v === '' ? d : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()));
const num = (v, d) => (v == null || v === '' ? d : Number(v));
const str = (v, d = '') => (v == null ? d : String(v).trim());

export function loadEnvFile(file = '.env') {
  try {
    process.loadEnvFile(file);
  } catch {
    /* no .env — fine, everything has a default */
  }
}

export function loadConfig(env = process.env) {
  return {
    port: num(env.PORT, 3000),
    publicUrl: str(env.PUBLIC_URL).replace(/\/$/, ''),
    dataFile: str(env.DATA_FILE, 'data/store.json'),
    voiceProvider: str(env.VOICE_PROVIDER, 'mock'),
    callLanguage: str(env.CALL_LANGUAGE, 'en'),
    autoCheckin: bool(env.AUTO_CHECKIN, true),
    phones: {
      mia: str(env.MIA_PHONE),
      tom: str(env.TOM_PHONE),
      neighbour: str(env.NEIGHBOUR_PHONE),
    },
    vapi: {
      baseUrl: str(env.VAPI_BASE_URL, 'https://api.vapi.ai'),
      apiKey: str(env.VAPI_API_KEY),
      phoneNumberId: str(env.VAPI_PHONE_NUMBER_ID),
      webhookSecret: str(env.VAPI_WEBHOOK_SECRET),
      voiceProvider: str(env.VAPI_VOICE_PROVIDER, 'vapi'),
      voiceId: str(env.VAPI_VOICE_ID, 'Paige'),
      model: str(env.VAPI_MODEL, 'gpt-4o'),
      modelProvider: str(env.VAPI_MODEL_PROVIDER, 'openai'),
    },
    llm: {
      baseUrl: str(env.OPENAI_BASE_URL, 'https://api.openai.com/v1').replace(/\/$/, ''),
      apiKey: str(env.OPENAI_API_KEY),
      model: str(env.OPENAI_MODEL, 'gpt-4o-mini'),
      timeoutMs: num(env.LLM_TIMEOUT_MS, 15000),
    },
    sms: {
      enabled: bool(env.SMS_ENABLED, false),
      accountSid: str(env.TWILIO_ACCOUNT_SID),
      authToken: str(env.TWILIO_AUTH_TOKEN),
      from: str(env.TWILIO_FROM),
    },
    escalation: {
      // "No pickup within 30 seconds triggers a call to Tom" — PLAN.md §6
      noAnswerMs: num(env.ESCALATION_NO_ANSWER_MS, 30000),
      checkinCooldownMs: num(env.CHECKIN_COOLDOWN_MS, 10 * 60 * 1000),
      maxCallSeconds: num(env.MAX_CALL_SECONDS, 240),
    },
    mock: {
      ringMs: num(env.MOCK_RING_MS, 2500),
      talkMs: num(env.MOCK_TALK_MS, 6000),
      noAnswerMs: num(env.MOCK_NO_ANSWER_MS, 45000),
    },
  };
}
