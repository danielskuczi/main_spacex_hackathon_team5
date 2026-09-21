# RESUME PROMPT — paste into a fresh session

You are continuing PROJECT BELLETJE, Daniel's part of a one-afternoon hackathon build. Do not read any earlier transcript. The ledgers below are the memory.

## 0. Read first, in this order
1. `PLAN.md` — internalise §2 floors, §9 phases, §10 banned outcomes, §11 rubric.
2. `DECISIONS.md` — every entry is locked. Do not re-litigate. D-001…D-012 are the architecture; Daniel's picks from INPUTS.md follow.
3. `DEVIATIONS.md` — the war log; know what is honestly not done yet.
4. `CLAUDE.md` — commands, architecture map, hard rules.
5. `src/engine.js` (the loop and the rules), `src/prompts.js` (the two assistants), `public/app.js` + `public/index.html` (the visual/API contract), `src/voice/vapi.js` (the provider contract).
6. `tests/` — the 26-test battery (B01–B18). Stays green at every phase. Run `npm test` before anything else.

## 1. Mission, in one paragraph
Belletje connects the older person's alarm button, wearable, phone, family and alarm centre into one loop: a daily AI check-in call that remembers her life and uses her watch data, post-call summaries and flags for the family app, and rule-based escalation (fall → call Mia → 30 s no answer → call Tom "Can you go now?" → neighbour → alarm centre) that gets a real person there fast, on the phone she already has. Demo at 19:00: scenario 1 (proactive check-in, "How did Lotte's exam go?", "dizzy 3× this week") and scenario 2 (fall, no answer, Tom's phone rings, "yes", "Help on the way"). Layla is Mia, Max is Tom, Daniel drives.

## 2. Decisions already made (do not re-ask, do not drift)
- Node 22 + Express, one process, JSON store, vanilla web app polling every 2 s. No build, no CDN, no frameworks.
- Voice behind an interface; `mock` always available; Vapi is the real provider (transient assistant per call). Twilio number imported into Vapi.
- Escalation is code (`applyRules` + timer). The LLM only returns `ok | needs_help | yes | no | unclear`.
- Analysis: OpenAI-compatible JSON mode with a 15 s timeout, keyword heuristic fallback, `source` shown in the app.
- Everything simulated is labelled simulated — data, UI, timeline, pitch.
- Phones only in `.env`. Persona in `data/persona.json`. Memory appends after each call, capped at 12.
- The app in `public/` is the baseline Max restyles in place; aria-labels/data-testids/`/api/state` are the contract.
- Whatever Daniel wrote in INPUTS.md and recorded in DECISIONS.md D-013+ (provider, language, hosting, stage no-answer seconds).

## 3. The laws (violating one reopens the phase)
1. The LLM never decides who is called.
2. No unlabelled simulation reaches a screen or the stage.
3. No medical advice in any prompt, summary or flag.
4. No real number, key or address in git.
5. Battery green at phase close; no TODO in a closed phase.
6. Gates are closed by Daniel, with captures and 2–4 options in front of him.

## 4. Working method (gates, commits, when to ask)
- Loop: build → `npm start` → `npm test` → run `scripts/scenario.js 1` and `2` → capture → append to `DELTA.md` (gap vs anchors + rubric) → fix the two cheapest +2s for rows < 7 → re-capture → present the gate with concrete options → stop.
- Commit per logical change with a descriptive message; push to `cursor/belletje-backend-and-plan-bc62` (or the branch Daniel names).
- Ask only what cannot be resolved from PLAN, code or a capture. Mid-phase, prefer the more ambitious option that ships by the phase's clock time.
- If late, cut in this order: escalation call → proactive scenario becomes a recorded clip. The live check-in call must work.

## 5. Phase 1 — start here, concrete numbered steps
Goal (15:00 milestone): a real check-in call rings Layla's phone and its transcript lands in the app.
1. `node --version` (≥ 22), `npm install`, `npm test` — must be 26/26.
2. Read Daniel's answers in `INPUTS.md`; append D-013+ to `DECISIONS.md` for A1, A4, C1, D4.
3. `cp .env.example .env`; fill `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID` (Twilio number imported in Vapi), `MIA_PHONE` (Layla, E.164, verified on the Twilio trial), `TOM_PHONE` (Max), `OPENAI_API_KEY`, `VOICE_PROVIDER=vapi`, `CALL_LANGUAGE` per A4.
4. Start the tunnel (`ngrok http 3000`), set `PUBLIC_URL`, `npm start`. `curl $PUBLIC_URL/api/health` → `liveCalls: true`, `webhookUrl` set.
5. Watch tab → "Live phone calls" on → "Belletje calls Mia now". Layla answers as Mia. Watch the timeline: "Mia answered" (status webhook), then "Check-in with Mia finished" with a summary (`source: llm`).
6. If Vapi rejects the payload, fix field names in `src/voice/vapi.js:buildCallPayload` against https://docs.vapi.ai/api-reference/calls/create and update B15. If the webhook never arrives, check the tunnel URL and `VAPI_WEBHOOK_SECRET`.
7. Listen for: uses "Mia", asks about Lotte, notices the night without numbers, no medical advice, ends within 3 min. Adjust `src/prompts.js` only for tone; keep the plan structure.
8. Capture: photo/recording of the ringing phone + screenshot of the call detail with transcript. Append Phase 1 to `DELTA.md`, score the rubric, list the two cheapest +2s.
9. Present the gate to Daniel with options: (a) voice stays Paige / switch to ElevenLabs; (b) English / Dutch; (c) call length target; (d) proceed to Phase 2 now.

## 6. What "done" means
- Phase 1: a live call rang, was answered, and its LLM summary is in the app; DECISIONS has D-013+; DELTA has the Phase 1 entry; battery green.
- Project: at 17:45 both scenarios run live on stage hardware, the simulated fallback is one switch away, a backup video exists, the two-screen test (PLAN final acceptance) passes on Max's phone, and every simulated element on screen says so.
