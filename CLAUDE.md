# HAVI — commands + hard rules (keep this file under 80 lines)

Read order for a fresh session: PLAN.md → DECISIONS.md → DEVIATIONS.md → this file → src/engine.js → tests/.

## Commands
```
npm install                         # once (Node >= 22; only dependency is express)
cp .env.example .env                # fill keys; with none, everything runs simulated
npm start                           # http://localhost:3000  (npm run dev = --watch)
npm test                            # the battery, 28 tests, < 5 s, must be green at every phase close
node scripts/scenario.js 1          # proactive check-in (simulated)   --live for real calls
node scripts/scenario.js 2          # fall → no answer → Tom             --watch=90 to follow longer
npm run reset                       # wipe demo state (server running or not)
ngrok http 3000                     # then PUBLIC_URL=https://xxxx.ngrok-free.app in .env, restart
```
Dev pacing: `ESCALATION_NO_ANSWER_MS=8000 MOCK_RING_MS=1500 MOCK_TALK_MS=4000 npm start`.

## Architecture (one process, no build)
- `server.js` wires config → store → voices → analyzer → notifier → engine → express app.
- `src/config.js` env → config object. `src/store.js` JSON file, atomic writes. `data/persona.json` seed.
- `src/prompts.js` the two assistants (check-in, escalation) as pure functions of state.
- `src/voice/{mock,vapi}.js` providers: `placeCall(call)`, events `{status|transcript|ended}`. `scripts.js` = mock transcripts.
- `src/analysis.js` LLM (OpenAI-compatible, JSON mode, 15 s timeout) → heuristic fallback. Result has `source`.
- `src/engine.js` THE LOOP: signals, calls, webhook events, timers, `applyRules`. Escalation lives here and only here.
- `src/notify.js` Twilio SMS or recorded-as-simulated.
- `src/app.js` routes + demo scenarios + static `public/`. `public/app.js` polls `/api/state` every 2 s.
- `tests/helpers.js` builds a full system with fast timers; tests are named B01–B18 (see PLAN §8).

## Hard rules
1. Escalation decisions are code in `applyRules` + the no-answer timer. The LLM returns an enum, never a decision.
2. Anything simulated carries `simulated: true` in data and a visible label in the UI and timeline. No exceptions.
3. No medical advice anywhere: prompts, summaries, flags. Only "check on her" / "mention it to Dr Smeets".
4. No real phone numbers, keys, or addresses in git. Phones only via `.env`.
5. `aria-label`s and `data-testid`s in `public/index.html` and `public/app.js` are a contract (B18). Restyle around them.
6. `npm test` green before any commit that closes a phase. A TODO in a closed phase fails the phase.
7. Don't close a gate. Present captures + 2–4 options and stop; Daniel records the pick in DECISIONS.md.
8. Append to DECISIONS.md / DEVIATIONS.md; never edit or delete earlier entries.
9. Prefer the more ambitious option that still ships by the phase deadline; cut order if late: escalation call → proactive scenario as a clip. The live check-in call must work.

## Stage checklist (Phase 4)
- `.env` has PUBLIC_URL (tunnel), VOICE_PROVIDER=vapi, VAPI_API_KEY, VAPI_PUBLIC_KEY, OPENAI_*; `curl $PUBLIC_URL/api/health` shows `liveCalls: true`.
- No phone line (D-030): Layla's phone opens `$PUBLIC_URL/phone.html?who=mia`, Max's `?who=tom`; tap "Switch this phone on" once. Speaker next to the mic.
- Watch tab → "Live phone calls" on → Scenario 1, then Scenario 2. If a live leg fails: switch "Live phone calls" off and rerun — simulated, labelled, still real downstream.
- Backup video recorded before 17:45.
