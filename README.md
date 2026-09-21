# HAVI

**The button waits for the fall. We don't.**

An AI care layer that connects what older people already have — alarm button, wearable, phone, family, alarm centre — into one loop. A daily check-in call that remembers her life and uses her watch data; summaries and flags for the family; rule-based escalation that gets a real person there fast.

Hackathon build, Maastricht. Team: Daniel (backend, voice, escalation), Max (app design, deck, pitch), Layla (persona, research, Q&A).

## What is real and what is simulated

| Real | Simulated (labelled on screen) |
|---|---|
| AI voice calls (Vapi, live), transcripts, post-call LLM summaries and flags, memory across calls, escalation rules and timers, the care-circle app | The watch (steps, heart rate, sleep, fall, SOS come from the Watch tab), SMS to the family, the alarm-centre handover |

Calls are **web calls**: a teammate's phone opens `/phone.html?who=mia` (or `tom`), it rings, they tap Answer and talk to HAVI live. In production the same assistant rings her ordinary phone through Twilio; the code switches to a real phone call as soon as a contact has a number and `VAPI_PHONE_NUMBER_ID` is set (D-030).

## Quick start (no keys needed)

```bash
npm install
npm start            # http://localhost:3000 — with no keys, calls are simulated and labelled as such
npm test             # 30-test battery, < 5 s
```

Open the app, go to **Watch**, and run **Scenario 1** (proactive check-in) or **Scenario 2** (fall → no answer → Tom). Press **Reset demo** between runs.

## Live calls

```bash
cp .env.example .env     # VOICE_PROVIDER=vapi, VAPI_API_KEY, VAPI_PUBLIC_KEY, OPENAI_API_KEY (+ OPENAI_BASE_URL/MODEL)
ngrok http 3000 --url https://<your-static-domain>   # PUBLIC_URL=that URL (Vapi posts webhooks here)
npm start
curl $PUBLIC_URL/api/health   # liveCalls: true
```

Then open `$PUBLIC_URL/phone.html?who=mia` on one phone and `?who=tom` on another, tap **Switch this phone on**, and switch **Live phone calls** on in the Watch tab.

## How it works

```
Watch tab (simulated watch) ──signals──▶ engine ──rules──▶ Vapi voice (web call / phone) ──▶ Mia · Tom · neighbour
                                           │  ▲                       │
                                           │  └── webhooks: status, transcript, end-of-call report
                                           ▼
                                  LLM analysis → summary · mood · flags · urgency · new facts
                                           ▼
                                  JSON store ──/api/state (2 s poll)──▶ care-circle app (the family's view)
```

- **Escalation is code, never the LLM.** Fall → call Mia → no pickup in 15 s → call Tom ("Can you go now?", 30 s to answer) → neighbour → alarm centre. SOS skips the check and calls Tom at once. Production timing is 30 s for Mia.
- **The LLM writes, code decides.** It turns transcripts into summaries and flags ("Dizzy 3× this week — suggest calling the GP"); the yes/no/ok/needs-help outcome that drives escalation is checked against the person's own words in code. Banned medical wording is filtered in code. A keyword fallback keeps the loop alive without a key.
- **Memory:** facts from each check-in feed the next call's prompt.
- **No medical advice, not a medical device:** HAVI only says "check on her" or "mention it to the GP".

## Documents

| File | What |
|---|---|
| `PLAN.md` | The binding spec: floors, phases, banned outcomes, rubric |
| `DECISIONS.md` | Locked decisions, append-only (D-030 web calls, D-033 code owns the outcome, D-036 HAVI) |
| `DEVIATIONS.md` | Honest war log: what fell short and why |
| `DELTA.md` | Gap vs reference anchors + self-score, per phase |
| `INPUTS.md` | Kickoff questions and answers |
| `MAX.md` · `LAYLA.md` | Frontend feature list · persona, tone, research and Q&A sheet |
| `CLAUDE.md` · `RESUME.md` | Commands, architecture, hard rules · resume prompt for a fresh session |
| `PROJECT.md` | Team brief: idea, demo, tracks, tasks, timeline, Q&A |
