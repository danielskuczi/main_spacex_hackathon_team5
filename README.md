# HAVI

**The button waits for the fall. We don't.**

An AI care layer that connects what older people already have — alarm button, wearable, phone, family, alarm centre — into one loop. A daily check-in call that remembers her life and uses her watch data; summaries and flags for the family; rule-based escalation that gets a real person there fast, on the phone she already has.

Hackathon build, Maastricht. Team: Daniel (backend, voice, escalation — this repo), Max (app design, deck, pitch), Layla (persona, research, Q&A).

## Quick start

```bash
npm install
npm start            # http://localhost:3000 — with no keys, calls are simulated and labelled as such
npm test             # 26-test battery, < 5 s
```

Open the app on a phone (same Wi-Fi: `http://<laptop-ip>:3000`), go to **Watch**, and run **Scenario 1** (proactive check-in) or **Scenario 2** (fall → no answer → Tom).

## Real calls

```bash
cp .env.example .env     # VOICE_PROVIDER=vapi, VAPI_API_KEY, VAPI_PHONE_NUMBER_ID, MIA_PHONE, TOM_PHONE, OPENAI_API_KEY
ngrok http 3000          # PUBLIC_URL=https://xxxx.ngrok-free.app  (Vapi posts webhooks here)
npm start
curl localhost:3000/api/health   # liveCalls: true
```

Then switch **Live phone calls** on in the Watch tab. Anything that is not live says *simulated* on screen.

## How it works

```
watch simulator ──signals──▶ engine ──rules──▶ voice provider (Vapi + Twilio) ──▶ Mia / Tom / neighbour
                              │  ▲                       │
                              │  └── webhook: status, transcript, end-of-call report
                              ▼
                     LLM analysis → summary · mood · flags · urgency · new facts
                              ▼
                     JSON store ──/api/state (2 s poll)──▶ care-circle app
```

- Escalation is code, never the LLM: fall → call Mia → no pickup in 30 s → call Tom ("Can you go now?") → neighbour → alarm centre.
- The LLM turns transcripts into summaries, flags ("Dizzy 3× this week — suggest calling Dr Smeets") and an outcome enum. A keyword fallback keeps the loop alive without a key.
- Memory: facts from each call feed the next call's prompt.

## Documents

| File | What |
|---|---|
| `PLAN.md` | Daniel's binding spec: floors, phases, banned outcomes, rubric |
| `INPUTS.md` | Questions Daniel answers before Phase 1 |
| `DECISIONS.md` | Locked decisions, append-only |
| `DELTA.md` | Gap vs reference anchors + self-score, per phase |
| `DEVIATIONS.md` | Honest war log |
| `CLAUDE.md` | Commands, architecture, hard rules |
| `RESUME.md` | Paste into a fresh session to continue |
| `PROJECT.md` | Team brief: idea, demo, tracks, tasks, timeline, Q&A |
