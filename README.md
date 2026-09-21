# HAVI

**The button waits for the fall. We don't.**

HAVI is an AI care layer that links an older person's alarm button, watch, phone, family and alarm centre into one loop. It notices problems early and gets a real person there fast.

## For the judges

Older people who live alone already have a panic button, a smartwatch, a phone and family nearby. None of these talk to each other, and the button only helps *after* a fall, and only if she can press it. HAVI is the AI layer that connects them.

- **A daily check-in call.** Every morning HAVI calls her for a short, warm chat. It remembers her life ("How did Lotte's exam go?") and gently mentions a restless night or a quiet morning it saw on her watch. It never gives medical advice.
- **Early warnings for the family.** After each call, the family app shows a short summary and flags such as *"Dizzy 3× this week — suggest calling the GP"*. The family can act before a crisis.
- **Fast help after a fall.** When the watch detects a fall, HAVI calls her first. If she doesn't answer within 15 seconds, it calls her son and asks "Can you go now?". If he can't go, it calls the neighbour with the spare key, then hands over to the alarm centre.

**Built to be trusted.** The AI writes the conversations and summaries, but who gets called is decided by fixed, readable rules in code, never by the model. The AI suggests; people decide. HAVI makes no diagnoses and is not a medical device. In the demo, everything simulated is labelled on screen.

**What's real today:** live AI voice calls, memory across calls, AI-written summaries and flags, and the full escalation loop. In our live test, the son's phone rang 15 seconds after the fall and he answered at 21 seconds. Only the watch is simulated, and calls ring in a web page on the phone rather than over a phone line. A call costs about $0.09 per minute.

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
