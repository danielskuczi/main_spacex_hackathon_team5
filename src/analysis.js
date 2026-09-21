/**
 * Post-call analysis (PLAN.md §5): after every call an LLM returns summary, mood, flags,
 * urgency, outcome and new facts to remember. A keyword heuristic is the fallback so the
 * loop never stalls on a slow or missing LLM — the result says which one produced it.
 */

const URGENCIES = ['low', 'medium', 'high'];
const OUTCOMES = ['ok', 'needs_help', 'yes', 'no', 'unclear', 'no_answer'];

export function transcriptToText(messages = []) {
  return messages
    .filter((m) => m.text)
    .map((m) => `${m.role === 'user' ? 'User' : 'Belletje'}: ${m.text}`)
    .join('\n');
}

/** Vapi gives either `messages` (role bot/user) or a flat "AI: ...\nUser: ..." transcript. */
export function normaliseTranscript({ messages, transcript } = {}) {
  if (Array.isArray(messages) && messages.length) {
    return messages
      .filter((m) => ['bot', 'assistant', 'user'].includes(m.role) && (m.message ?? m.content ?? m.text))
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', text: String(m.message ?? m.content ?? m.text).trim() }));
  }
  if (typeof transcript === 'string' && transcript.trim()) {
    return transcript
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const m = l.match(/^(AI|Assistant|Bot|Belletje|User|Customer)\s*:\s*(.*)$/i);
        if (!m) return { role: 'user', text: l };
        return { role: /^(user|customer)$/i.test(m[1]) ? 'user' : 'assistant', text: m[2] };
      });
  }
  return [];
}

const userText = (messages) =>
  messages
    .filter((m) => m.role === 'user')
    .map((m) => m.text)
    .join(' ')
    .toLowerCase();

const count = (text, re) => (text.match(re) ?? []).length;

export function heuristicAnalysis({ call, persona, messages }) {
  const said = userText(messages);
  const gp = persona.gp ?? 'her GP';
  const flags = [];
  const newFacts = [];
  let urgency = 'low';
  let outcome = 'unclear';
  let mood = 'neutral';

  const yes = /\b(yes|yeah|yep|sure|of course|i('m| am) (going|on my way|coming)|i will|ja)\b/.test(said);
  const no = /\b(no|nope|can't|cannot|not possible|i'm away|nee)\b/.test(said);
  const help = /\b(help|hurt|can'?t get up|cannot get up|fell|fallen|pain|bleeding|ambulance)\b/.test(said);
  const fine = /\b(fine|okay|ok|all right|alright|good|nothing happened|i'?m up|dropped)\b/.test(said);

  if (call.kind === 'escalation_tom' || call.kind === 'escalation_neighbour') {
    outcome = yes && !no ? 'yes' : no ? 'no' : 'unclear';
  } else if (call.kind === 'escalation_mia') {
    outcome = help ? 'needs_help' : fine ? 'ok' : 'unclear';
    urgency = outcome === 'needs_help' ? 'high' : outcome === 'ok' ? 'low' : 'medium';
  } else {
    outcome = help ? 'needs_help' : 'ok';
    if (help) urgency = 'high';
  }

  // Dizziness pattern across memory + this call (PLAN.md §6 scenario 1 flag).
  const dizzyBefore = (persona.memory_from_last_calls ?? [])
    .map((m) => m.toLowerCase())
    .filter((m) => /dizz|duizel/.test(m))
    .reduce((n, m) => n + Math.max(1, count(m, /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/g)), 0);
  const dizzyNow = /\b(dizzy|dizziness|light-?headed|duizelig)\b/.test(said);
  if (dizzyNow) {
    const n = dizzyBefore + 1;
    flags.push({ text: `Dizzy ${n}× this week — suggest calling ${gp}`, severity: n >= 3 ? 'medium' : 'low' });
    newFacts.push(`Felt dizzy again${call.vitals?.simTime ? ` (around ${call.vitals.simTime})` : ''}`);
    if (urgency === 'low' && n >= 3) urgency = 'medium';
  }
  if (/\b(tired|exhausted|didn'?t sleep|bad night|restless)\b/.test(said)) mood = 'tired';
  if (/\b(happy|lovely|wonderful|proud|glad|great)\b/.test(said)) mood = mood === 'tired' ? 'tired but cheerful' : 'cheerful';
  if (/\b(lonely|sad|down|worried|anxious)\b/.test(said)) mood = 'low';
  if (/\b(passed|went well|she did (well|great)|good grade)\b/.test(said)) newFacts.push("Lotte's exam went well");
  if (/\bgarden\b/.test(said)) newFacts.push('Hoped to spend time in the garden today');
  else if (/\bcrossword\b/.test(said)) newFacts.push('Planned to do her crossword today');
  else if (/\b(been to|back from|going to) the bakery\b/.test(said)) newFacts.push('Made it to the bakery today');
  if (/haven'?t been to the bakery|didn'?t feel up to it/.test(said)) newFacts.push('Skipped the bakery walk today');

  // The most informative thing she said — not the greeting.
  const quote = messages
    .filter((m) => m.role === 'user' && m.text.length > 20)
    .sort((a, b) => b.text.length - a.text.length)[0]?.text;
  const summaryByKind = {
    checkin: quote
      ? `Mia ${mood === 'neutral' ? 'talked' : `sounded ${mood}`}${dizzyNow ? ' and mentioned feeling dizzy again' : ''}. In her words: "${quote}"`
      : 'Short check-in; Mia said little.',
    escalation_mia: outcome === 'ok' ? 'Mia answered and says she is okay.' : outcome === 'needs_help' ? 'Mia answered and asked for help.' : 'Mia answered but the call was unclear.',
    escalation_tom: outcome === 'yes' ? 'Tom said yes — he is going to Mia now.' : outcome === 'no' ? 'Tom cannot go right now.' : 'Tom answered but did not give a clear yes or no.',
    escalation_neighbour: outcome === 'yes' ? 'Mr Hendriks is going over with the spare key.' : outcome === 'no' ? 'Mr Hendriks cannot go right now.' : 'Neighbour call unclear.',
  };

  return {
    source: 'heuristic',
    summary: summaryByKind[call.kind] ?? summaryByKind.checkin,
    mood,
    flags,
    urgency,
    outcome,
    newFacts,
    familyMessage: null,
  };
}

function normalise(raw, fallback) {
  const out = { ...fallback, source: 'llm' };
  if (typeof raw.summary === 'string' && raw.summary.trim()) out.summary = raw.summary.trim();
  if (typeof raw.mood === 'string' && raw.mood.trim()) out.mood = raw.mood.trim().toLowerCase();
  if (URGENCIES.includes(raw.urgency)) out.urgency = raw.urgency;
  if (OUTCOMES.includes(raw.outcome)) out.outcome = raw.outcome;
  if (Array.isArray(raw.flags))
    out.flags = raw.flags
      .map((f) => (typeof f === 'string' ? { text: f, severity: 'low' } : f))
      .filter((f) => f && typeof f.text === 'string' && f.text.trim())
      .map((f) => ({ text: f.text.trim(), severity: ['low', 'medium', 'high'].includes(f.severity) ? f.severity : 'low' }));
  if (Array.isArray(raw.new_facts ?? raw.newFacts))
    out.newFacts = (raw.new_facts ?? raw.newFacts).map((f) => String(f).trim()).filter(Boolean).slice(0, 5);
  if (typeof (raw.family_message ?? raw.familyMessage) === 'string') out.familyMessage = (raw.family_message ?? raw.familyMessage).trim();
  return out;
}

export function createAnalyzer(config, { fetchImpl = globalThis.fetch, log = console } = {}) {
  const { llm } = config;

  async function llmAnalyse({ call, persona, messages, vitals }) {
    const system = `You are the post-call analyst for Belletje, an AI care layer for older people who live alone.
You read a phone transcript and return strict JSON for the family app. You never diagnose and never suggest treatment; you may suggest "check on her" or "mention it to the GP".
Return exactly this JSON object:
{
  "summary": "2 short sentences for her son, warm and factual",
  "mood": "one or two words",
  "urgency": "low" | "medium" | "high",
  "outcome": ${call.kind === 'checkin' ? '"ok" | "needs_help"' : call.kind === 'escalation_mia' ? '"ok" | "needs_help" | "unclear"' : '"yes" | "no" | "unclear"'},
  "flags": [{"text": "short flag for the family, e.g. 'Dizzy 3× this week — suggest calling Dr Smeets'", "severity": "low"|"medium"|"high"}],
  "new_facts": ["things worth remembering for the next call, in her words, max 5"],
  "family_message": "one sentence to text the family, or null"
}
Count recurring complaints across memory AND this call (memory says dizzy Monday and Wednesday, so a new mention is the third). Flags only for things a caring son would want to know. Empty arrays are fine.`;
    const user = `Call type: ${call.kind}. Called: ${call.toName}.
Persona: ${JSON.stringify({ name: persona.name, age: persona.age, gp: persona.gp, routine: persona.routine, likes: persona.likes })}
Memory from earlier calls: ${JSON.stringify(persona.memory_from_last_calls ?? [])}
Today's watch data: ${JSON.stringify(vitals ?? {})}
Transcript:
${transcriptToText(messages) || '(empty)'}`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), llm.timeoutMs);
    try {
      const res = await fetchImpl(`${llm.baseUrl}/chat/completions`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${llm.apiKey}` },
        body: JSON.stringify({
          model: llm.model,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });
      if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      return JSON.parse(content);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async analyze(input) {
      const fallback = heuristicAnalysis(input);
      if (!llm.apiKey) return fallback;
      try {
        return normalise(await llmAnalyse(input), fallback);
      } catch (err) {
        log.warn(`analysis: LLM failed, using heuristic (${err.message})`);
        return { ...fallback, llmError: err.message };
      }
    },
  };
}
