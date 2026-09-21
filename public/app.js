/* HAVI care-circle app — polls /api/state every 2 s (PLAN.md §7). No build step, no CDN. */
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const time = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '');
  const timeS = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '');

  let state = null;
  let view = 'home';
  let selectedCall = null;
  let lastRendered = '';
  let simInitialised = false;

  // ---------- API ----------
  async function api(path, body, method = 'POST') {
    const res = await fetch(path, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }
  const act = (p) => p.catch((e) => toast(e.message));

  async function poll() {
    try {
      const res = await fetch('/api/state', { cache: 'no-store' });
      state = await res.json();
      $('#conn').textContent = state.meta.liveCalls ? 'LIVE' : 'SIM';
      $('#conn').classList.remove('off');
      render();
    } catch {
      $('#conn').textContent = 'offline';
      $('#conn').classList.add('off');
    }
  }

  // ---------- navigation ----------
  function show(v) {
    view = v;
    $$('main > section').forEach((s) => (s.hidden = s.dataset.view !== v));
    $$('.tabbar button').forEach((b) => (b.dataset.nav === (v === 'call' ? 'timeline' : v) ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
    window.scrollTo({ top: 0 });
    lastRendered = '';
    render();
  }
  $$('.tabbar button').forEach((b) => b.addEventListener('click', () => show(b.dataset.nav)));
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-call]');
    if (el) {
      selectedCall = el.dataset.call;
      show('call');
    }
    const back = e.target.closest('[data-back]');
    if (back) show(back.dataset.back);
    const resolve = e.target.closest('[data-resolve-flag]');
    if (resolve) act(api(`/api/flags/${resolve.dataset.resolveFlag}/resolve`).then(poll));
    const respond = e.target.closest('[data-respond]');
    if (respond) act(api(`/api/incidents/${respond.dataset.incident}/respond`, { who: 'tom', answer: respond.dataset.respond }).then(poll));
    const close = e.target.closest('[data-close-incident]');
    if (close) act(api(`/api/incidents/${close.dataset.closeIncident}/close`, { note: 'Confirmed safe in the app' }).then(poll));
  });

  // ---------- render ----------
  function render() {
    if (!state) return;
    const key = JSON.stringify([view, selectedCall, state.status, state.vitals, state.flags, state.notifications, state.calls, state.events.slice(0, 40), state.activeIncident]);
    if (key !== lastRendered) {
      lastRendered = key;
      if (view === 'home') $('#view-home').innerHTML = renderHome();
      if (view === 'timeline') $('#view-timeline').innerHTML = renderTimeline();
      if (view === 'call') $('#view-call').innerHTML = renderCall();
      renderAlert();
    }
    renderSimulator();
  }

  const badge = (c) => (c.simulated ? '<span class="tag sim">simulated call</span>' : c.web ? '<span class="tag live">live web call</span>' : '<span class="tag live">live call</span>');
  const callTitle = (c) => ({ checkin: `Check-in with ${c.toName}`, escalation_mia: `Safety call to ${c.toName}`, escalation_tom: `Call to ${c.toName}`, escalation_neighbour: `Call to ${c.toName}` })[c.kind] ?? c.kind;
  const callState = (c) => ({ queued: 'dialling…', ringing: 'ringing…', 'in-progress': 'on the phone…', ended: c.durationSeconds != null ? `${c.durationSeconds}s` : 'ended', 'no-answer': 'no answer', failed: 'could not call' })[c.status] ?? c.status;

  function renderHome() {
    const s = state.status;
    const v = state.vitals;
    const flags = state.flags.filter((f) => !f.resolvedAt);
    const latest = state.calls.find((c) => c.analysis) ?? null;
    const live = state.calls.find((c) => ['queued', 'ringing', 'in-progress'].includes(c.status));
    const lowSteps = v.steps != null && v.steps < 500;
    const shortSleep = v.sleepHours != null && v.sleepHours < 5;
    const inc = state.activeIncident;
    return `
      <div class="status ${esc(s.level)}" role="status" aria-live="polite" data-testid="status-card">
        <span class="pulse" aria-hidden="true"></span>
        <div class="label">${esc(s.label)}</div>
        <div class="detail">${esc(s.detail || '')}</div>
        <div class="since">since ${time(s.since)} · ${esc(state.persona.name)}, ${esc(state.persona.address)}</div>
      </div>
      ${inc && inc.stage === 'help_on_the_way' ? `<div class="card"><div class="row-head"><h2>Help on the way</h2><span class="tag">${esc(inc.helper)}</span></div><p>${esc(inc.helper)} is going to Mia. When you've seen her, mark her safe so everyone in the circle knows.</p><button class="btn primary" data-close-incident="${inc.id}" aria-label="Mark Mia safe">Mia is safe</button></div>` : ''}
      ${live ? `<button class="call-card call-live" data-call="${live.id}" aria-label="Open live call"><div class="row-head"><strong>${esc(callTitle(live))}</strong>${badge(live)}</div><div class="meta">${esc(callState(live))} · started ${time(live.createdAt)}${live.messages?.length ? ` · ${live.messages.length} lines so far` : ''}</div>${live.messages?.length ? `<p class="summary">“${esc(live.messages.at(-1).text)}”</p>` : ''}</button>` : ''}

      <div class="row-head"><h2>Today from her watch</h2><span class="tag sim">simulated watch</span></div>
      <div class="tiles" style="margin-bottom:14px">
        <div class="tile ${lowSteps ? 'warn' : ''}"><div class="v">${v.steps ?? '–'}</div><div class="k">steps${v.simTime ? ` by ${esc(v.simTime)}` : ''}</div></div>
        <div class="tile ${v.heartRate > 110 ? 'warn' : ''}"><div class="v">${v.heartRate ?? '–'}</div><div class="k">bpm</div></div>
        <div class="tile ${shortSleep ? 'warn' : ''}"><div class="v">${v.sleepHours ?? '–'}</div><div class="k">h sleep</div></div>
      </div>

      <div class="card" data-testid="flags">
        <div class="row-head"><h2>Flags for the family</h2><span class="tag">${flags.length}</span></div>
        ${flags.length ? flags.map((f) => `<div class="flag ${esc(f.severity)}"><span class="dot"></span><div class="t">${esc(f.text)}<small>${time(f.at)} · from the ${state.calls.find((c) => c.id === f.callId)?.simulated ? 'simulated' : 'live'} call</small></div><button data-resolve-flag="${f.id}" aria-label="Mark flag handled">Handled</button></div>`).join('') : '<p class="empty">Nothing to worry about right now.</p>'}
      </div>

      <h2>Latest call</h2>
      ${latest ? `<button class="call-card" data-call="${latest.id}" aria-label="Open latest call summary"><div class="row-head"><strong>${esc(callTitle(latest))}</strong>${badge(latest)}</div><p class="summary">${esc(latest.analysis.summary)}</p><div class="meta">${time(latest.endedAt)} · mood: ${esc(latest.analysis.mood ?? '–')} · urgency: ${esc(latest.analysis.urgency)} · analysed by ${esc(latest.analysis.source)}</div></button>` : '<div class="card"><p class="empty">No call yet today. HAVI calls when the morning looks quiet, or when you press the button in the watch tab.</p></div>'}

      <div class="card" data-testid="notified">
        <h2>Who's been notified</h2>
        ${state.notifications.length ? `<ul class="list">${state.notifications.slice(0, 6).map((n) => `<li><span class="time">${time(n.at)}</span><div class="body"><div class="title">${esc(n.to)} <span class="tag ${n.simulated ? 'sim' : 'live'}">${esc(n.channel)}${n.simulated ? ' · simulated' : n.status === 'failed' ? ' · failed' : ''}</span></div><div class="detail">${esc(n.message)}</div></div></li>`).join('')}</ul>` : '<p class="empty">Nobody yet.</p>'}
      </div>

      <div class="card">
        <h2>What HAVI remembers</h2>
        <ul class="list">${(state.persona.memory ?? []).slice().reverse().map((m) => `<li><div class="body"><div class="detail">${esc(m)}</div></div></li>`).join('')}</ul>
      </div>`;
  }

  const ICON = { incident: '!', escalation: '↗', call: '☎', 'call-ended': '☎', flag: '⚑', notification: '✉', signal: '◔', proactive: '✦', memory: '♥', demo: '▶', error: '×' };
  function renderTimeline() {
    if (!state.events.length) return '<div class="card"><p class="empty">The timeline fills up as things happen.</p></div>';
    return `<div class="card"><h2>Timeline</h2><ul class="list" id="timeline">${state.events
      .map((e) => {
        const cls = e.severity === 'high' ? 'high' : e.severity === 'good' ? 'good' : e.type.startsWith('call') ? 'call' : '';
        const icon = e.severity === 'good' ? '✓' : ICON[e.type] ?? '·';
        const click = e.callId ? `class="clickable" data-call="${e.callId}" role="button" tabindex="0"` : '';
        return `<li ${click}><span class="time">${timeS(e.at)}</span><span class="icon ${cls}" aria-hidden="true">${icon}</span><div class="body"><div class="title">${esc(e.title)}</div>${e.detail ? `<div class="detail">${esc(e.detail)}</div>` : ''}</div></li>`;
      })
      .join('')}</ul></div>`;
  }

  function renderCall() {
    const c = state.calls.find((x) => x.id === selectedCall);
    if (!c) return '<button class="back" data-back="timeline">‹ Back</button><div class="card"><p class="empty">Call not found.</p></div>';
    const a = c.analysis;
    return `
      <button class="back" data-back="timeline" aria-label="Back to timeline">‹ Back</button>
      <div class="card">
        <div class="row-head"><h1 style="font-size:22px">${esc(callTitle(c))}</h1>${badge(c)}</div>
        <div class="hint" style="margin:0 0 8px">${time(c.createdAt)} · ${esc(callState(c))}${c.reason ? ` · ${esc(c.reason)}` : ''}${c.provider !== 'mock' ? ` · via ${esc(c.provider)}` : ''}</div>
        ${a ? `
          <p style="font-size:17px;margin:8px 0">${esc(a.summary)}</p>
          <div class="kv">
            <div><div class="k">Mood</div><div class="v">${esc(a.mood ?? '–')}</div></div>
            <div><div class="k">Urgency</div><div class="v">${esc(a.urgency)}</div></div>
            <div><div class="k">Outcome</div><div class="v">${esc(a.outcome?.replace('_', ' '))}</div></div>
            <div><div class="k">Analysed by</div><div class="v">${esc(a.source === 'llm' ? 'AI' : a.source)}</div></div>
          </div>
          ${a.flags?.length ? `<h2>Flags</h2>${a.flags.map((f) => `<div class="flag ${esc(f.severity)}"><span class="dot"></span><div class="t">${esc(f.text)}</div></div>`).join('')}` : ''}
          ${a.newFacts?.length ? `<h2 style="margin-top:12px">Remembered for next time</h2><ul class="list">${a.newFacts.map((f) => `<li><div class="body"><div class="detail">${esc(f)}</div></div></li>`).join('')}</ul>` : ''}
        ` : c.status === 'no-answer' ? '<p>No answer.</p>' : c.status === 'failed' ? `<p>${esc(c.endedReason)}</p>` : '<p>Call in progress — the summary appears here when it ends.</p>'}
      </div>
      ${c.messages?.length ? `<div class="card"><h2>Transcript</h2><ul class="transcript">${c.messages.map((m) => `<li class="${m.role}"><div class="bubble"><span class="role">${m.role === 'user' ? esc(c.toName) : 'HAVI'}</span>${esc(m.text)}</div></li>`).join('')}</ul></div>` : ''}
      ${c.vitals && c.vitals.steps != null ? `<div class="card"><h2>Watch data HAVI had during this call</h2><div class="detail hint" style="margin:0">${c.vitals.steps} steps · ${c.vitals.heartRate ?? '–'} bpm · ${c.vitals.sleepHours ?? '–'} h sleep${c.vitals.simTime ? ` · ${esc(c.vitals.simTime)}` : ''}</div></div>` : ''}`;
  }

  function renderAlert() {
    const el = $('#alert');
    const inc = state.activeIncident;
    const tomCall = inc && state.calls.find((c) => c.id === inc.tomCallId);
    const showing = inc && (inc.stage === 'calling_tom' || inc.stage === 'calling_neighbour' || inc.stage === 'alarm_centre');
    if (!showing) {
      el.hidden = true;
      el.className = 'alert';
      return;
    }
    const what = inc.type === 'sos' ? 'pressed her alarm button' : inc.type === 'help_request' ? 'asked for help' : 'may have fallen';
    const calling = inc.stage === 'calling_tom' && tomCall && ['queued', 'ringing', 'in-progress'].includes(tomCall.status) ? `Calling your phone now${tomCall.simulated ? ' (simulated)' : ''}…` : inc.stage === 'calling_neighbour' ? `Calling ${esc(state.persona.neighbour.split(',')[0])}…` : inc.stage === 'alarm_centre' ? 'Alarm centre has the case.' : '';
    el.hidden = false;
    el.className = 'alert';
    el.innerHTML = `
      <div class="kicker">HAVI · ${time(inc.at)}</div>
      <h1 id="alert-title">Your mother ${what} and isn't answering.</h1>
      <p>Mia's watch ${inc.type === 'sos' ? 'sent an SOS' : inc.type === 'help_request' ? 'call ended with a request for help' : 'detected a fall'} at ${time(inc.at)}. She didn't pick up within ${state.meta.noAnswerSeconds} seconds.</p>
      <div class="addr">${esc(state.persona.address)}</div>
      <p style="font-size:15px;opacity:.85">${esc(state.persona.neighbour)}</p>
      ${calling ? `<div class="calling">${calling}</div>` : ''}
      <div class="actions">
        <button class="go" data-respond="yes" data-incident="${inc.id}" aria-label="I am going">I'm going now</button>
        <button class="no" data-respond="no" data-incident="${inc.id}" aria-label="I cannot go">I can't — try ${inc.stage === 'calling_tom' ? esc(state.persona.neighbour.split(',')[0]) : 'the alarm centre'}</button>
      </div>`;
  }

  // ---------- simulator ----------
  const sim = { steps: $('#steps'), hr: $('#hr'), sleep: $('#sleep'), time: $('#sim-time'), fall: $('#fall'), live: $('#live') };
  function updateOutputs() {
    $('#steps-out').value = sim.steps.value;
    $('#hr-out').value = `${sim.hr.value} bpm`;
    $('#sleep-out').value = `${Number(sim.sleep.value).toFixed(1)} h`;
  }
  let vitalsTimer;
  function sendVitals() {
    clearTimeout(vitalsTimer);
    vitalsTimer = setTimeout(() => {
      act(api('/api/signals', { type: 'vitals', steps: Number(sim.steps.value), heartRate: Number(sim.hr.value), sleepHours: Number(sim.sleep.value), simTime: sim.time.value || null }).then(poll));
    }, 350);
  }
  ['steps', 'hr', 'sleep'].forEach((k) => {
    sim[k].addEventListener('input', () => {
      updateOutputs();
      sendVitals();
    });
  });
  sim.time.addEventListener('change', () => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(sim.time.value)) {
      toast('Watch time must be HH:MM');
      sim.time.value = state?.vitals?.simTime ?? '11:00';
      return;
    }
    sendVitals();
  });
  sim.fall.addEventListener('change', () => {
    if (sim.fall.checked) {
      act(api('/api/signals', { type: 'fall', simulate: sim.live.checked ? undefined : {} }).then(() => { toast('Fall signal sent — calling Mia'); poll(); }));
      setTimeout(() => (sim.fall.checked = false), 4000);
    }
  });
  $('#sos').addEventListener('click', () => act(api('/api/signals', { type: 'sos', simulate: sim.live.checked ? undefined : {} }).then(() => { toast('SOS sent — calling Mia'); show('home'); poll(); })));
  $('#checkin').addEventListener('click', () =>
    act(api('/api/calls', { kind: 'checkin', simulate: sim.live.checked ? undefined : {} }).then(() => { toast('HAVI is calling Mia'); show('home'); poll(); })),
  );
  $$('[data-scenario]').forEach((b) =>
    b.addEventListener('click', () =>
      act(api(`/api/demo/scenario/${b.dataset.scenario}`, { live: sim.live.checked }).then((r) => { toast(`${r.scenario} — ${r.live ? 'LIVE' : 'simulated'}`); show('home'); poll(); })),
    ),
  );
  $('#reset').addEventListener('click', () => act(api('/api/reset').then(() => { toast('Demo reset'); selectedCall = null; poll(); })));

  function renderSimulator() {
    if (!state) return;
    const m = state.meta;
    if (!simInitialised) {
      simInitialised = true;
      const v = state.vitals;
      if (v.steps != null) sim.steps.value = v.steps;
      if (v.heartRate != null) sim.hr.value = v.heartRate;
      if (v.sleepHours != null) sim.sleep.value = v.sleepHours;
      if (v.simTime) sim.time.value = v.simTime;
      sim.live.checked = m.liveCalls;
      sim.live.disabled = !m.liveCalls;
      updateOutputs();
    }
    $('#live-avail').textContent = m.liveCalls ? `via ${m.voiceProvider}${m.phones.mia ? '' : ' — MIA_PHONE missing'}` : 'not configured (VOICE_PROVIDER=mock)';
    $('#voice-hint').textContent = m.liveCalls
      ? `Calls go out through ${m.voiceProvider}${sim.live.checked ? '' : ' — switch on "Live phone calls" below to use them'}. Analysis: ${m.llm ? 'AI' : 'keyword fallback (no OPENAI_API_KEY)'}.`
      : `No voice provider configured — calls are simulated with scripted transcripts. Analysis: ${m.llm ? 'AI' : 'keyword fallback (no OPENAI_API_KEY)'}.`;
  }

  // ---------- boot ----------
  show('home');
  poll();
  setInterval(poll, 2000);
})();
