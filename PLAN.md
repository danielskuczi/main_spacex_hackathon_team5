# PROJECT BELLETJE — an AI care layer that connects what older people already have into one loop
### The button waits for the fall. We don't.

## Context — why we're doing this
Daniel's parents in Hungary use Gondosóra, a state panic button, every day. It works, but only after the fall, and only if they press it. The Dutch equivalent (personenalarmering) has the same shape: a neck or wrist transmitter, a 24/7 control room, thirty years of history, and no idea how last night went. Five products around one older person — alarm button, wearable, phone, family, alarm centre — and none of them talk to each other.

Belletje ("een belletje" = a quick call) is the software layer on top of that existing infrastructure. It reads the wearable, calls the older person every day with a voice that remembers her life, turns what it hears into summaries and flags for the family, and when something looks wrong it gets a real person there fast — on the phone she already has. The AI suggests; humans decide. No diagnoses, so it isn't a medical device.

This is a hackathon build (Maastricht, one afternoon: hacking 13:00–18:00, submission 18:00, finals 19:00, 2-minute pitch + 3-minute Q&A). Three people: Daniel (everything in this plan), Max (app screens, deck, script), Layla (persona, conversation rules, research, Q&A sheet). The team plan lives in `PROJECT.md`; this file is Daniel's binding spec.

## The bar — the 3 reference anchors, named, with URLs
1. **ElliQ (Intuition Robotics)** — https://elliq.com — the bar for the *conversation*: proactive, warm, remembers the person, initiates contact rather than waiting. Belletje must feel like this over an ordinary phone line, with no new device.
2. **Apple Watch Fall Detection + Emergency SOS** — https://support.apple.com/en-us/108896 — the bar for the *escalation loop*: detect → ask the person → wait a fixed time → call for help and notify emergency contacts with location. Deterministic, timed, transparent. Belletje's rules engine is measured against this.
3. **Sensi.AI** — https://www.sensi.ai — the bar for *what the family sees*: audio-derived care insights turned into short, actionable flags for caregivers ("suggest, humans decide"), never raw data dumps.

## Operating instructions
- Build, don't describe. Long autonomous stretches, no mid-phase approval round-trips. Don't ask mid-phase questions you can resolve from this plan, the code, or a capture.
- Between two approaches, build the more ambitious one that still ships.
- No placeholder content — a TODO in a closed phase fails the phase.
- Everything simulated is labelled simulated, in the code, in the app and on stage. Everything else runs for real.
- Gates are closed by Daniel, never by the agent. Present captures + 2–4 concrete options and stop.

## 1. Fixed constraints (stack, hosting, budget — decided, not open)
- **Runtime:** Node 22, ESM, one process. Dependency: Express 5. Nothing else in `dependencies`. No build step, no bundler, no TypeScript.
- **Frontend:** mobile web app (vanilla HTML/CSS/JS) served by the same process, opened on phones. No CDN, no fonts, no frameworks. Polls `/api/state` every 2 s.
- **Store:** one JSON file (`data/store.json`), atomic writes, survives restart. Persona seed in `data/persona.json`.
- **Voice:** hosted voice-agent platform with a Twilio number. Primary: Vapi (transient assistant per call so the prompt carries memory + today's watch data). Provider interface `placeCall / webhook`; `mock` provider always available.
- **LLM:** any OpenAI-compatible chat endpoint for post-call analysis; keyword heuristic fallback when the key is missing, the call fails, or 15 s pass.
- **Escalation logic:** plain code in `src/engine.js`. The LLM never decides who gets called.
- **Hosting on the day:** Daniel's laptop + an HTTPS tunnel (ngrok or cloudflared) for the webhook; phones on the venue Wi-Fi or hotspot hit the laptop's LAN IP or the tunnel.
- **Budget:** trial credits only. Twilio trial (verified numbers), Vapi free tier, one paid LLM key. No hardware purchases.
- **Language:** English on stage by default (international jury); `CALL_LANGUAGE=nl` supported. Decided in INPUTS A4.
- **Cut, not deferred:** real watch integration, fall-detection algorithms, hardware, push notifications, auth/multi-tenant.

## 2. Floors (numbers: perf, a11y, latency. these are gates, not goals)
| # | Floor | How it's checked |
|---|---|---|
| F1 | Trigger → call request accepted by the provider ≤ 3 s | B06, B13 timing asserts; dry run |
| F2 | Fall with no pickup → Tom's phone ringing ≤ 45 s (30 s rule + dial) | B07 ordering assert; dry run with a stopwatch |
| F3 | Any state change visible in the app ≤ 2.5 s (2 s poll + render) | B18 poll interval assert; capture |
| F4 | Call end → summary + flags in the app ≤ 20 s; heuristic fallback if the LLM misses 15 s | B05 timeout assert, B14 end-to-end |
| F5 | Every interactive control has an `aria-label`; tap targets ≥ 44 px; base text 16 px; lays out at 360 px width | B18 asserts; capture at 390×844 |
| F6 | App shell has zero external network dependencies (venue Wi-Fi is hostile) | B18 CDN assert |
| F7 | The battery (`npm test`) is green and finishes < 30 s | every phase close |
| F8 | State survives a server restart mid-incident | B17 |
| F9 | Escalation call transcripts never influence *who* is called except through the fixed yes/no/ok/needs_help outcome enum | code review of `applyRules` |

## 3. Persona and memory
- Mia Jacobs, 81, alone at Voorbeeldstraat 12, Maastricht (fictional). Son Tom (Max's phone), neighbour Mr Hendriks (spare key), GP Dr Smeets. Routine, likes and `memory_from_last_calls` in `data/persona.json` — this is the memory the AI is loaded with.
- After each check-in the analysis returns `new_facts`; they append to memory (deduplicated, capped at 12). The next call's prompt gets the memory plus the last 3 summaries plus today's watch data. Memory persists across restarts.
- Phones never live in git or in the persona; they come from `.env` (`MIA_PHONE`, `TOM_PHONE`, `NEIGHBOUR_PHONE`).

## 4. The two assistants
- **Check-in** (`buildCheckinPrompt`): warm, slow, one question at a time, uses memory naturally ("How did Lotte's exam go?"), notices a short night or low steps without quoting numbers, never gives medical advice (only "worth mentioning to Dr Smeets; I'll let Tom know"), closes within ~3 min. If she reports a fall or asks for help: "I'm getting help for you right now" and the call ends — the outcome enum then opens an incident.
- **Escalation** (`buildEscalationMiaPrompt`, `buildEscalationFamilyPrompt`): short, urgent, calm. To Mia: "Your watch detected a fall. Are you okay?" To Tom: facts (time, not answering, address, spare key) then "Can you go now?" — wants a yes or no, under 45 s.
- Both go to Vapi as a transient assistant: system prompt, first message, Deepgram transcriber in the call language, `end-of-call-report` + `status-update` + `transcript` webhooks to `PUBLIC_URL/api/webhooks/vapi`, secret header verified.

## 5. Backend and data model
- Endpoints (the plan's three, plus what the app needs):
  `POST /api/signals` (vitals | fall | sos) · `POST /api/calls` (check-in) · `POST /api/webhooks/vapi` · `GET /api/state` · `GET /api/calls/:id` · `POST /api/incidents/:id/respond` (yes/no from the app) · `POST /api/incidents/:id/close` · `POST /api/flags/:id/resolve` · `POST /api/demo/scenario/:n` · `POST /api/reset` · `GET /api/health`.
- State: `persona, status, vitals, calls[], events[], flags[], notifications[], incidents[]`. Every call keeps its prompt, transcript, analysis and `simulated` flag. Every notification keeps `simulated`/`sent`/`failed`.
- Analysis result: `{ summary, mood, urgency, outcome, flags[], newFacts[], familyMessage, source: llm|heuristic }`.
- Proactive rule (code): sleep < 5 h **and** steps < 500 **and** watch time ≥ 10:00 → event "Quiet morning — Belletje decided to call" → check-in call (`AUTO_CHECKIN`), 10-minute cooldown.

## 6. Escalation — plain rules, not the LLM
```
fall | sos                  → incident; status "Checking on Mia"; call Mia (safety assistant)
Mia: ok                     → false alarm; family SMS; status ok
Mia: needs_help | unclear   → call Tom now (skip the wait)
no pickup in 30 s (timer)   → call Tom + SMS: "may have fallen … isn't answering … address … Can you go now?"
Tom: yes (voice or app)     → "Help on the way"; family SMS; Tom marks "Mia is safe" later
Tom: no | no answer         → call Mr Hendriks
neighbour: no | no answer   → hand over to the alarm centre (simulated handover, labelled)
check-in urgency high       → family SMS + status "Needs attention"
```
The timer is armed on every escalation call. A late webhook for a call the timer already closed keeps the transcript but does not re-run rules. A failed dial (no number, provider error) counts as no answer and moves on — the loop never stalls.

## 7. Care-circle app
Screens (Max restyles; the working baseline ships here): **Status home** (status card, today's watch tiles, flags with "Handled", latest call, who's been notified, what Belletje remembers) · **Timeline** (every event, seconds precision, tap a call to open it) · **Call summary detail** (summary, mood, urgency, outcome, flags, remembered facts, full transcript, watch data at call time, LIVE/SIMULATED badge) · **"Can you go now?" alert** (full-screen, address, spare-key line, "I'm going now" / "I can't", then the green "Help on the way" card with "Mia is safe") · **Watch simulator** (SOS, steps/heart-rate/sleep sliders, fall toggle, watch time, "Belletje calls Mia now", scenario 1/2 buttons, live/simulated switch, reset).
Everything simulated says so on screen: "simulated watch", "simulated call", "(simulated)" on SMS, "(simulated in this demo)" on the alarm-centre handover.

## 8. Verification battery (numbered, scripted, runs at every phase close)
`npm test` — 26 tests in `tests/`, < 5 s. Named so a fresh session can read the contract without the transcript:
- **B01–B02** store persistence, corrupt-file quarantine, memory append/dedupe/cap, contact resolution.
- **B03** check-in prompt carries memory + last summaries + today's watch data + the no-medical-advice rule. **B03b** escalation prompts ask yes/no and read the address.
- **B04** heuristic: "dizzy again" → "Dizzy 3× this week — suggest calling Dr Smeets", urgency medium, new facts. **B04b** yes/no/ok/needs_help outcomes. **B04c** transcript normalisation.
- **B05** LLM analyser used when it answers, heuristic on HTTP error, heuristic on timeout (timeout actually enforced).
- **B06** fall → Mia called < 3 s. **B07** no pickup → Tom not before the rule, "Can you go now?" + address, SMS, yes → help on the way, close → ok. **B08** Mia fine → false alarm. **B08b** Mia needs help → Tom immediately. **B09** Tom no → neighbour → alarm centre (labelled simulated, packet lists who was tried). **B10** app answer while phone rings. **B11** second fall doesn't double-escalate. **B12** failed dials escalate through to the alarm centre.
- **B13** proactive rule (and its negatives), prompts not shipped to the app, 400 on bad signal. **B14** check-in end-to-end: summary, flag, memory, status, resolve flag. **B15/B15b** Vapi payload and provider. **B16/B16b** webhook: secret enforced, status → answered, live transcript, report → analysis, unknown call ignored. **B17** scenarios, honest `live:false`, restart-safe, reset restores seed. **B18** app shell contract: named controls, screens, no CDN, 2 s poll, 44 px targets.
Plus at every phase close: `node scripts/scenario.js 1` and `2` against the running server, and the screenshots in `DELTA.md`.

## 9. Phase plan — gated
| Phase | Deliverable | Gate |
|---|---|---|
| 0 — Skeleton (done in session 1) | Backend, mock provider, rules, analysis, app, battery, this doc set | Battery green; both scenarios run simulated end-to-end; captures in DELTA.md; Daniel answers INPUTS.md |
| 1 — First real call (15:00 milestone) | Vapi + Twilio wired; `npm start` with `.env`; tunnel up; check-in call rings Layla's phone and the webhook lands | A recording or photo of the phone ringing + the call's transcript in the app; Daniel picks voice/language (DECISIONS) |
| 2 — Memory, watch data, summaries (16:00) | Live call uses memory ("Lotte") and today's vitals; LLM analysis lands in the app ≤ 20 s; flag appears | Capture of the app showing summary + "Dizzy 3×" flag from a *live* call; Daniel approves the summary wording |
| 3 — Escalation + live app (16:45) | Scenario 2 live: fall → Mia's phone rings, no pickup → 30 s → Max's phone rings → "yes" → Help on the way; app on two phones | Stopwatch ≤ 45 s to Tom's ring; captures of the alert on Max's phone; Daniel picks the on-stage fallback mode |
| 4 — Freeze, fallback, submit (17:15 → 17:45) | 3 dry runs, backup video recorded, README/RESUME updated, submitted | Backup video exists and plays; battery green; Daniel confirms submission |

## 10. Banned outcomes — instant fail
- Lorem ipsum, TODO/FIXME in a closed phase, "Project One" cards, empty states that pretend to be content.
- A demo that "works" because a screen was hard-coded: any status, summary, flag or timeline entry that did not come out of the engine.
- A simulated call, SMS or handover shown without a visible "simulated" label — in the app or in the pitch.
- The LLM choosing who gets called. Escalation is `applyRules` and the timer, nothing else.
- Medical language: "diagnosis", "you may have", "take", "dose" in any prompt or summary. Only "check on her" / "mention it to Dr Smeets".
- Real phone numbers, API keys or a real address committed to git.
- Claims without proof: a floor marked met without the test or capture that shows it.
- Anything the jury sees that depends on a CDN, push notifications, or a native app store.
- Closing a gate without Daniel.

## 11. Self-score rubric (rows, anchored 10/7/4/2, scored after every phase)
Rule that does the work: for every row scored below 7, write the cheapest change that gets +2; implement the two cheapest before proceeding to the next phase.

| Row | 10 | 7 | 4 | 2 |
|---|---|---|---|---|
| Conversation warmth (vs ElliQ) | Live call, she's addressed by name, memory used unprompted, notices the bad night without numbers, closes gracefully | Live call with memory and one gentle observation, slightly stiff | Live call that sounds like a survey | Scripted or no call |
| Proactivity (vs ElliQ) | Belletje decides to call from watch data alone and says why in the timeline | Auto-call fires, reason shown | Manual button only | No trigger |
| Escalation loop (vs Apple SOS) | Fall → Mia → 30 s → Tom's real phone → yes → Help on the way, ≤ 45 s, app mirrors every step | Loop works live but one hop is app-button instead of voice | Loop works only simulated | Loop stalls or needs a human to nudge |
| Family insight (vs Sensi) | LLM summary + "Dizzy 3× — suggest GP" flag + remembered facts from a live call | Same from a simulated call, or heuristic from a live call | Summary only | Raw transcript |
| App glanceability | Status answers "is Mum ok?" in 1 s; 2 screens tell the whole story | All screens present, minor clutter | Data present but needs scrolling to understand | Table of JSON |
| Demo robustness | Live path + simulated fallback + backup video, all rehearsed 3× | Live + fallback, rehearsed once | Live only | Untested on stage audio |
| Honesty | Every simulated element labelled, packet shows what was tried | Labels present, one missing | Labels only in the pitch | None |
| Accessibility floor | F5 met and checked on a phone | F5 met by tests only | Some controls unlabelled | Unusable at 360 px |

## 12. Tier 3 — only after the battery passes (the wishlist parking lot)
- Retell / ElevenLabs Agents as second voice provider behind the same interface.
- Dutch voice and UI toggle at runtime.
- Second family member in the circle with their own answer buttons.
- Live transcript streaming into the call card during a real call (Vapi `transcript` webhooks are already parsed).
- Hang up the Mia leg when the 30 s timer fires.
- Weekly digest: 7-day mood/flags line.
- Alarm-centre "control room" view: the handover packet as a screen.
- Cost-per-call counter for the Q&A money question.
- Playwright screenshot script promoted into the battery.

## Final acceptance — the two-screen test
Show a juror two screens and nothing else: the **Status home** after scenario 1 and the **"Can you go now?" alert** during scenario 2. If they can say what happened to Mia, who knows, and what happens next — without anyone explaining — the build passes. If they ask "is this real?", the answer must be on the screen already.
