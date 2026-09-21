import { randomUUID } from 'node:crypto';
import { buildCheckinPrompt, buildEscalationMiaPrompt, buildEscalationFamilyPrompt } from './prompts.js';
import { rememberFacts, recentSummaries, resolveContact } from './persona.js';
import { isNoAnswerReason } from './voice/vapi.js';

/**
 * The loop. Signals come in, calls go out, transcripts come back, rules decide.
 * Escalation is plain code, never the LLM (PLAN.md §6):
 *   fall/SOS            → call Mia
 *   no pickup in 30 s   → call Tom ("Can you go now?")
 *   Tom says no / silent→ call the neighbour → hand off to the alarm centre
 *   high urgency        → notify family
 */
export const STATUS = {
  ok: { level: 'ok', label: 'All good' },
  attention: { level: 'attention', label: 'Needs attention' },
  checking: { level: 'checking', label: 'Checking on Mia' },
  escalating: { level: 'escalating', label: 'Getting help' },
  help_on_the_way: { level: 'help_on_the_way', label: 'Help on the way' },
  alarm_centre: { level: 'alarm_centre', label: 'Alarm centre alerted' },
};

const ACTIVE_CALL = new Set(['queued', 'ringing', 'in-progress']);

export function createEngine({ config, store, voices, analyzer, notifier, now = () => new Date(), log = console }) {
  const timers = new Map();
  const S = () => store.state;
  const iso = () => now().toISOString();
  const hhmm = (d = now()) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const save = () => store.save();
  const persona = () => S().persona;

  // ---------- bookkeeping ----------

  function addEvent({ type, title, detail = '', severity = 'info', callId = null, incidentId = null }) {
    const ev = { id: randomUUID(), at: iso(), type, title, detail, severity, callId, incidentId };
    S().events.push(ev);
    if (S().events.length > 500) S().events.splice(0, S().events.length - 500);
    return ev;
  }

  function setStatus(key, detail = '') {
    const prev = S().status;
    S().status = { ...STATUS[key], detail, since: prev?.level === key ? prev.since : iso() };
    return S().status;
  }

  const findCall = (providerCallId) => S().calls.find((c) => c.providerCallId === providerCallId);
  const callById = (id) => S().calls.find((c) => c.id === id);
  const incidentById = (id) => S().incidents.find((i) => i.id === id);
  const activeIncident = () => S().incidents.find((i) => !i.resolvedAt);
  const activeCallOfKind = (kind) => S().calls.find((c) => c.kind === kind && ACTIVE_CALL.has(c.status));

  function clearTimer(callId) {
    const t = timers.get(callId);
    if (t) clearTimeout(t);
    timers.delete(callId);
  }

  async function record(promise) {
    try {
      return await promise;
    } catch (err) {
      log.error('engine:', err);
      addEvent({ type: 'error', title: 'Something went wrong', detail: err.message, severity: 'high' });
      save();
      return null;
    }
  }

  // ---------- notifications ----------

  async function notifyFamily(message, { incidentId = null, callId = null } = {}) {
    const contact = resolveContact(persona(), config.phones, 'tom');
    const result = await notifier.sendSms({ to: contact.phone, message });
    const n = { id: randomUUID(), at: iso(), to: contact.name, phone: contact.phone ? contact.phone.replace(/\d(?=\d{2})/g, '•') : null, message, incidentId, callId, ...result };
    S().notifications.push(n);
    addEvent({ type: 'notification', title: `${contact.name} notified by SMS${result.simulated ? ' (simulated)' : ''}`, detail: message, incidentId, callId });
    return n;
  }

  // ---------- calls ----------

  function buildPromptFor(kind, { contact, incident, reason }) {
    const p = persona();
    const language = config.callLanguage;
    if (kind === 'checkin') return buildCheckinPrompt({ persona: p, summaries: recentSummaries(S(), 3), vitals: S().vitals, language, reason });
    if (kind === 'escalation_mia') return buildEscalationMiaPrompt({ persona: p, incident, language });
    return buildEscalationFamilyPrompt({ persona: p, contact, incident, reason, language });
  }

  async function startCall({ kind, to, incidentId = null, simulate, reason = null }) {
    const incident = incidentId ? incidentById(incidentId) : null;
    const contact = resolveContact(persona(), config.phones, to);
    const useMock = config.voiceProvider === 'mock' || simulate != null;
    const provider = useMock ? voices.mock : voices[config.voiceProvider];
    const prompt = buildPromptFor(kind, { contact, incident, reason });

    const call = {
      id: randomUUID(),
      kind,
      to,
      toName: contact.name,
      phone: contact.phone || null,
      incidentId,
      reason,
      provider: provider.name,
      simulated: provider.name === 'mock',
      status: 'queued',
      createdAt: iso(),
      answeredAt: null,
      endedAt: null,
      endedReason: null,
      providerCallId: null,
      systemPrompt: prompt.system,
      firstMessage: prompt.firstMessage,
      vitals: kind === 'checkin' ? { ...S().vitals } : null,
      messages: [],
      analysis: null,
    };
    S().calls.push(call);
    addEvent({
      type: 'call',
      title: kind === 'checkin' ? `Belletje is calling ${contact.name}` : `Calling ${contact.name}`,
      detail: reason ?? (kind === 'checkin' ? 'Daily check-in' : ''),
      callId: call.id,
      incidentId,
      severity: kind === 'checkin' ? 'info' : 'high',
    });
    save();

    try {
      const res = await provider.placeCall(call, { simulate: simulate ?? {} });
      call.providerCallId = res.providerCallId;
      if (kind !== 'checkin') armNoAnswerTimer(call);
      save();
    } catch (err) {
      log.warn(`call to ${contact.name} failed: ${err.message}`);
      call.status = 'failed';
      call.endedAt = iso();
      call.endedReason = err.message;
      addEvent({ type: 'error', title: `Could not place call to ${contact.name}`, detail: err.message, severity: 'high', callId: call.id, incidentId });
      save();
      await onNoAnswer(call);
    }
    return call;
  }

  function armNoAnswerTimer(call) {
    clearTimer(call.id);
    const t = setTimeout(() => {
      timers.delete(call.id);
      const c = callById(call.id);
      if (!c || c.answeredAt || !ACTIVE_CALL.has(c.status)) return;
      c.status = 'no-answer';
      c.endedAt = iso();
      c.endedReason = 'no-answer-timeout';
      addEvent({
        type: 'call-ended',
        title: `${c.toName} didn't pick up within ${Math.round(config.escalation.noAnswerMs / 1000)} s`,
        callId: c.id,
        incidentId: c.incidentId,
        severity: 'high',
      });
      save();
      record(onNoAnswer(c));
    }, config.escalation.noAnswerMs);
    t.unref?.();
    timers.set(call.id, t);
  }

  async function handleVoiceEvent(evt) {
    const call = findCall(evt.providerCallId);
    if (!call) {
      log.warn(`voice event for unknown call ${evt.providerCallId}`);
      return null;
    }
    if (!ACTIVE_CALL.has(call.status)) {
      // Late report for a call the timer already closed: keep the transcript, don't re-run rules.
      if (evt.type === 'ended' && evt.messages?.length && !call.messages?.length) {
        call.messages = evt.messages;
        call.lateTranscript = true;
        save();
      }
      return call;
    }
    switch (evt.type) {
      case 'status':
        if (evt.status === 'ringing' || evt.status === 'queued') call.status = 'ringing';
        if (evt.status === 'in-progress') {
          call.status = 'in-progress';
          call.answeredAt = iso();
          clearTimer(call.id);
          addEvent({ type: 'call', title: `${call.toName} answered`, callId: call.id, incidentId: call.incidentId });
        }
        break;
      case 'transcript':
        if (evt.messages) call.messages = evt.messages;
        else if (evt.append?.text) call.messages.push(evt.append);
        if (!call.answeredAt) {
          call.status = 'in-progress';
          call.answeredAt = iso();
          clearTimer(call.id);
        }
        break;
      case 'ended':
        await finishCall(call, evt);
        break;
    }
    save();
    return call;
  }

  async function finishCall(call, evt) {
    clearTimer(call.id);
    call.endedAt = iso();
    call.endedReason = evt.endedReason ?? null;
    call.durationSeconds = evt.durationSeconds ?? Math.round((Date.parse(call.endedAt) - Date.parse(call.answeredAt ?? call.createdAt)) / 1000);
    if (evt.recordingUrl) call.recordingUrl = evt.recordingUrl;
    if (evt.messages?.length) call.messages = evt.messages;
    const spoke = call.messages.some((m) => m.role === 'user');

    if (!spoke && (isNoAnswerReason(call.endedReason) || !call.answeredAt)) {
      call.status = 'no-answer';
      addEvent({ type: 'call-ended', title: `${call.toName} didn't answer`, detail: call.endedReason ?? '', callId: call.id, incidentId: call.incidentId, severity: 'high' });
      save();
      await onNoAnswer(call);
      return;
    }

    call.status = 'ended';
    save();
    const analysis = await analyzer.analyze({ call, persona: persona(), messages: call.messages, vitals: S().vitals });
    call.analysis = analysis;
    addEvent({
      type: 'call-ended',
      title: call.kind === 'checkin' ? `Check-in with ${call.toName} finished` : `Call with ${call.toName} finished`,
      detail: analysis.summary,
      callId: call.id,
      incidentId: call.incidentId,
      severity: analysis.urgency === 'high' ? 'high' : 'info',
    });
    save();
    await applyRules(call);
    save();
  }

  // ---------- the rules ----------

  async function onNoAnswer(call) {
    if (call.kind === 'checkin') {
      setStatus('attention', `${call.toName} did not answer the check-in call at ${hhmm()}`);
      save();
      return;
    }
    const incident = incidentById(call.incidentId);
    if (!incident || incident.resolvedAt || incident.stage === 'help_on_the_way' || incident.stage === 'alarm_centre') return;
    const secs = Math.round(config.escalation.noAnswerMs / 1000);
    if (call.kind === 'escalation_mia') return callFamily(incident, 'tom', `She did not pick up within ${secs} seconds`);
    if (call.kind === 'escalation_tom') return callFamily(incident, 'neighbour', `Neither Mia nor ${call.toName} could be reached`);
    return handoffAlarmCentre(incident, 'Nobody in the care circle could be reached');
  }

  async function applyRules(call) {
    const a = call.analysis;
    const incident = call.incidentId ? incidentById(call.incidentId) : null;

    if (call.kind === 'checkin') {
      const added = rememberFacts(persona(), a.newFacts);
      if (added.length) addEvent({ type: 'memory', title: 'Remembered for next time', detail: added.join(' · '), callId: call.id });
      for (const f of a.flags) upsertFlag(f, call.id);
      if (a.urgency === 'high') {
        setStatus('attention', a.flags[0]?.text ?? a.summary);
        await notifyFamily(a.familyMessage ?? `Belletje: ${a.summary}`, { callId: call.id });
      } else if (a.urgency === 'medium' || a.flags.some((f) => f.severity !== 'low')) {
        setStatus('attention', a.flags[0]?.text ?? a.summary);
      } else {
        setStatus('ok', `Checked in at ${hhmm(call.endedAt)} · mood: ${a.mood}`);
      }
      if (a.outcome === 'needs_help' && !activeIncident()) {
        const inc = openIncident('help_request', { simulate: call.simulated ? {} : undefined });
        addEvent({ type: 'incident', title: 'Mia asked for help during her check-in', severity: 'high', incidentId: inc.id, callId: call.id });
        await callFamily(inc, 'tom', 'She asked for help during her check-in call');
      }
      return;
    }

    if (!incident || incident.resolvedAt) return;

    if (call.kind === 'escalation_mia') {
      if (incident.stage !== 'calling_mia') return;
      if (a.outcome === 'ok') {
        resolveIncident(incident, 'mia_ok');
        setStatus('ok', `False alarm at ${hhmm()} — Mia says she is fine`);
        addEvent({ type: 'incident', title: 'Mia is okay — false alarm', detail: a.summary, incidentId: incident.id, callId: call.id, severity: 'good' });
        await notifyFamily(`Belletje: Mia's watch detected a fall at ${hhmm(incident.at)}. She answered and says she is fine. No action needed.`, { incidentId: incident.id, callId: call.id });
        return;
      }
      return callFamily(incident, 'tom', a.outcome === 'needs_help' ? 'She answered and asked for help' : 'She answered but could not confirm she is okay');
    }

    if (call.kind === 'escalation_tom') {
      if (incident.stage !== 'calling_tom') return;
      if (a.outcome === 'yes') return helpOnTheWay(incident, call.toName, call.id);
      return callFamily(incident, 'neighbour', `${call.toName} ${a.outcome === 'no' ? 'cannot go right now' : 'gave no clear answer'}`);
    }

    if (call.kind === 'escalation_neighbour') {
      if (incident.stage !== 'calling_neighbour') return;
      if (a.outcome === 'yes') return helpOnTheWay(incident, call.toName, call.id);
      return handoffAlarmCentre(incident, `${call.toName} ${a.outcome === 'no' ? 'cannot go' : 'gave no clear answer'} and nobody else could be reached`);
    }
  }

  function upsertFlag(flag, callId) {
    const key = flag.text.toLowerCase().replace(/\d+×/, 'n×');
    const existing = S().flags.find((f) => !f.resolvedAt && f.key === key);
    if (existing) {
      existing.text = flag.text;
      existing.severity = flag.severity;
      existing.at = iso();
      existing.callId = callId;
    } else {
      S().flags.push({ id: randomUUID(), key, text: flag.text, severity: flag.severity, at: iso(), callId, resolvedAt: null });
    }
    addEvent({ type: 'flag', title: flag.text, severity: flag.severity === 'low' ? 'info' : 'high', callId });
  }

  function openIncident(type, { simulate } = {}) {
    const inc = { id: randomUUID(), type, at: iso(), stage: 'open', simulate, miaCallId: null, tomCallId: null, neighbourCallId: null, helper: null, resolvedAt: null, outcome: null };
    S().incidents.push(inc);
    return inc;
  }

  function resolveIncident(incident, outcome) {
    incident.resolvedAt = iso();
    incident.outcome = outcome;
    for (const c of S().calls) if (c.incidentId === incident.id && ACTIVE_CALL.has(c.status)) clearTimer(c.id);
  }

  async function callFamily(incident, who, reason) {
    const contact = resolveContact(persona(), config.phones, who);
    incident.stage = `calling_${who}`;
    setStatus('escalating', `Calling ${contact.name} — ${reason}`);
    addEvent({ type: 'escalation', title: `Escalating to ${contact.name}`, detail: reason, severity: 'high', incidentId: incident.id });
    save();
    if (who === 'tom') {
      await notifyFamily(
        `Belletje: your mother ${incident.type === 'sos' ? 'pressed her alarm button' : 'may have fallen'} at ${hhmm(incident.at)} and isn't answering. ${reason}. Address: ${persona().address}. Can you go now? Answer in the app or on the call.`,
        { incidentId: incident.id },
      );
    }
    const call = await startCall({ kind: `escalation_${who}`, to: who, incidentId: incident.id, simulate: incident.simulate?.[who] ?? incident.simulate, reason });
    incident[`${who}CallId`] = call.id;
    save();
    return call;
  }

  async function helpOnTheWay(incident, helperName, callId = null) {
    incident.stage = 'help_on_the_way';
    incident.helper = helperName;
    incident.helpSince = iso();
    for (const c of S().calls) if (c.incidentId === incident.id && ACTIVE_CALL.has(c.status)) clearTimer(c.id);
    setStatus('help_on_the_way', `${helperName} is on the way to Mia (since ${hhmm()})`);
    addEvent({ type: 'incident', title: `Help on the way — ${helperName} is going to Mia`, severity: 'good', incidentId: incident.id, callId });
    save();
    await notifyFamily(`Belletje: ${helperName} is on the way to Mia (${persona().address}). Mark her safe in the app when you've seen her.`, { incidentId: incident.id, callId });
  }

  async function handoffAlarmCentre(incident, reason) {
    incident.stage = 'alarm_centre';
    const tried = ['Mia', incident.tomCallId && persona().son.name, incident.neighbourCallId && persona().neighbour_name].filter(Boolean).join(', ');
    const packet = `${incident.type === 'sos' ? 'SOS' : 'Fall'} at ${hhmm(incident.at)} · ${persona().name}, ${persona().age} · ${persona().address} · tried: ${tried} · key: ${persona().neighbour}`;
    setStatus('alarm_centre', `Handed over to the alarm centre — ${reason}`);
    S().notifications.push({ id: randomUUID(), at: iso(), to: 'Alarm centre (personenalarmering)', channel: 'alarm-centre', status: 'simulated', simulated: true, message: packet, incidentId: incident.id });
    addEvent({ type: 'escalation', title: 'Handed over to the alarm centre (simulated in this demo)', detail: `${reason}. Packet: ${packet}`, severity: 'high', incidentId: incident.id });
    save();
    await notifyFamily(`Belletje: nobody could be reached for Mia. The alarm centre has been handed the case (${hhmm()}).`, { incidentId: incident.id });
  }

  // ---------- inputs ----------

  function proactiveReason(v) {
    const hour = v.simTime ? Number(v.simTime.split(':')[0]) : now().getHours();
    const reasons = [];
    if (v.sleepHours != null && v.sleepHours < 5) reasons.push(`a restless night (${v.sleepHours} h of sleep)`);
    if (v.steps != null && v.steps < 500 && hour >= 10) reasons.push(`only ${v.steps} steps by ${v.simTime ?? hhmm()}`);
    return reasons.length === 2 ? reasons.join(' and ') : null;
  }

  async function handleSignal(signal) {
    const type = signal?.type;
    if (type === 'vitals') {
      const v = S().vitals;
      for (const k of ['steps', 'heartRate', 'sleepHours']) if (signal[k] != null && signal[k] !== '') v[k] = Number(signal[k]);
      if (signal.simTime !== undefined) v.simTime = signal.simTime || null;
      v.updatedAt = iso();
      const last = S().events.at(-1);
      const detail = `${v.steps ?? '–'} steps · ${v.heartRate ?? '–'} bpm · ${v.sleepHours ?? '–'} h sleep${v.simTime ? ` · watch time ${v.simTime}` : ''}`;
      if (last?.type === 'signal' && Date.parse(iso()) - Date.parse(last.at) < 5000) {
        last.detail = detail;
        last.at = iso();
      } else addEvent({ type: 'signal', title: 'Watch data updated (simulated watch)', detail });

      if (v.heartRate != null && (v.heartRate > 120 || v.heartRate < 40)) addEvent({ type: 'signal', title: `Unusual heart rate: ${v.heartRate} bpm`, severity: 'high' });

      const reason = proactiveReason(v);
      const cooldownOk = !S().lastProactiveAt || Date.parse(iso()) - Date.parse(S().lastProactiveAt) > config.escalation.checkinCooldownMs;
      if (reason && cooldownOk && !activeIncident() && !activeCallOfKind('checkin')) {
        S().lastProactiveAt = iso();
        addEvent({ type: 'proactive', title: 'Quiet morning — Belletje decided to call', detail: `Noticed ${reason}.`, severity: 'info' });
        setStatus('checking', `Calling Mia: ${reason}`);
        save();
        if (config.autoCheckin) await startCall({ kind: 'checkin', to: 'mia', simulate: signal.simulate, reason: `You noticed ${reason}.` });
      }
      save();
      return { vitals: v, proactive: reason };
    }

    if (type === 'fall' || type === 'sos') {
      const existing = activeIncident();
      if (existing) {
        addEvent({ type: 'incident', title: `${type === 'sos' ? 'SOS pressed' : 'Fall detected'} again during an active incident`, severity: 'high', incidentId: existing.id });
        save();
        return existing;
      }
      const incident = openIncident(type, { simulate: signal.simulate });
      incident.stage = 'calling_mia';
      setStatus('checking', `${type === 'sos' ? 'SOS pressed' : 'Fall detected'} at ${hhmm()} — calling Mia`);
      addEvent({ type: 'incident', title: type === 'sos' ? 'SOS button pressed' : 'Fall detected by the watch', detail: 'Calling Mia to check', severity: 'high', incidentId: incident.id });
      save();
      const call = await startCall({ kind: 'escalation_mia', to: 'mia', incidentId: incident.id, simulate: incident.simulate?.mia ?? incident.simulate });
      incident.miaCallId = call.id;
      save();
      return incident;
    }

    throw Object.assign(new Error(`unknown signal type "${type}" (vitals | fall | sos)`), { status: 400 });
  }

  async function startCheckin({ simulate, reason } = {}) {
    if (activeCallOfKind('checkin')) throw Object.assign(new Error('a check-in call is already in progress'), { status: 409 });
    setStatus('checking', 'Belletje is calling Mia');
    return startCall({ kind: 'checkin', to: 'mia', simulate, reason });
  }

  /** The family app's own answer buttons ("I'm going" / "I can't") — same rules as the voice answer. */
  async function respondToIncident(id, { who = 'tom', answer, via = 'app' }) {
    const incident = incidentById(id);
    if (!incident) throw Object.assign(new Error('incident not found'), { status: 404 });
    if (incident.resolvedAt) throw Object.assign(new Error('incident already resolved'), { status: 409 });
    const name = resolveContact(persona(), config.phones, who).name;
    const pending = S().calls.find((c) => c.incidentId === id && c.to === who && ACTIVE_CALL.has(c.status));
    if (pending) {
      clearTimer(pending.id);
      pending.status = 'ended';
      pending.endedAt = iso();
      pending.endedReason = `answered-in-${via}`;
      pending.analysis = { source: via, summary: `${name} answered in the app: ${answer}`, mood: null, flags: [], urgency: 'low', outcome: answer, newFacts: [] };
    }
    addEvent({ type: 'incident', title: `${name} answered in the app: ${answer === 'yes' ? "I'm going" : "I can't go"}`, severity: answer === 'yes' ? 'good' : 'high', incidentId: id });
    if (answer === 'yes') await helpOnTheWay(incident, name, pending?.id);
    else if (who === 'tom') await callFamily(incident, 'neighbour', `${name} cannot go right now`);
    else await handoffAlarmCentre(incident, `${name} cannot go`);
    save();
    return incident;
  }

  function closeIncident(id, { note = '' } = {}) {
    const incident = incidentById(id);
    if (!incident) throw Object.assign(new Error('incident not found'), { status: 404 });
    resolveIncident(incident, 'safe');
    setStatus('ok', `Mia is safe — confirmed at ${hhmm()}${incident.helper ? ` by ${incident.helper}` : ''}`);
    addEvent({ type: 'incident', title: 'Mia is safe', detail: note, severity: 'good', incidentId: id });
    save();
    return incident;
  }

  function resolveFlag(id) {
    const f = S().flags.find((x) => x.id === id);
    if (!f) throw Object.assign(new Error('flag not found'), { status: 404 });
    f.resolvedAt = iso();
    addEvent({ type: 'flag', title: `Handled: ${f.text}`, severity: 'good' });
    if (S().status.level === 'attention' && !S().flags.some((x) => !x.resolvedAt)) setStatus('ok', 'All flags handled');
    save();
    return f;
  }

  function reset() {
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
    voices.mock.close?.();
    store.reset({ keepMemory: false });
    return S();
  }

  function info() {
    return {
      voiceProvider: config.voiceProvider,
      liveCalls: config.voiceProvider !== 'mock',
      llm: Boolean(config.llm.apiKey),
      sms: notifier.live,
      webhookUrl: config.publicUrl ? `${config.publicUrl}/api/webhooks/vapi` : null,
      noAnswerSeconds: Math.round(config.escalation.noAnswerMs / 1000),
      language: config.callLanguage,
      phones: { mia: Boolean(config.phones.mia), tom: Boolean(config.phones.tom), neighbour: Boolean(config.phones.neighbour) },
    };
  }

  function close() {
    for (const t of timers.values()) clearTimeout(t);
    timers.clear();
    for (const v of Object.values(voices)) v.close?.();
  }

  const engine = { handleSignal, startCheckin, handleVoiceEvent, respondToIncident, closeIncident, resolveFlag, reset, info, close, addEvent, record };
  voices.mock.setHandler((evt) => record(handleVoiceEvent(evt)));
  return engine;
}
