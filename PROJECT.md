# Belletje — team brief

Working name: **Belletje** (Dutch "een belletje" = a quick call).
One-liner: an AI care layer that connects what older people already have — alarm button, wearable, phone, family, alarm centre — into one loop. It notices problems early and gets a real person there fast.
Tagline: **"The button waits for the fall. We don't."**

Daniel's build spec is `PLAN.md`; his open questions are `INPUTS.md`. This file is the shared team context.

## 1. The idea
- **Founder story (Daniel opens):** "My parents in Hungary use Gondosóra, a state panic button, every day. It works, but only after the fall, and only if they press it."
- **Problem:** five separate products that never talk to each other, and the button only reacts.
- **Dutch context:** the equivalent is *personenalarmering* — ~30 years old, widely used (Nivel 2018); a neck/wrist transmitter connected to a 24/7 control room; costs covered by insurer or municipality depending on need.

## 2. Features — the 5-in-1
1. **Alarm:** SOS button plus fall detection.
2. **Wearable data:** steps, heart rate, sleep.
3. **Daily AI check-in call:** warm, remembers details of her life, uses the watch data.
4. **Real people:** summaries to family, escalation calls to the son or neighbour, handoff to the alarm centre.
5. **Care-circle app:** timeline, summaries, flags, who's been notified, current status.

The AI suggests, humans decide. No diagnoses — not a medical device.

## 3. Why now
- **Replacement cycle:** the WDTM keurmerk v4.0 phases out analogue alarm equipment before 2028 — every system gets replaced soon.
- **YC's request on aging** names voice interfaces that hold real conversations, monitoring that keeps older adults safe and independent, and caregiver-coordination software. All three pieces.
- **Local angle:** CBS projected Limburg to be the most aged province by 2025 (a quarter over 65). That's a 2006 projection — pull today's figure from StatLine.

## 4. Business and differentiation
- **Who pays:** alarm centres, as software on top of existing devices — they have the users, the 24/7 control room and the funding. Then insurers (prevention), municipalities (social support); families pay for extras.
- **Differentiation:** alarm buttons are reactive, Belletje is proactive. AI companions like ElliQ need a new device; Belletje works on the phone she has and plugs into existing alarm infrastructure.

## 5. Tracks, criteria, judges
- **Human Centred** (Gaby Odekerken-Schröder + replacement for Andreas): meaningful AI, presentation, depth of human benefit, benefit to society, execution. Estimate 23/25. Gaby has published on companion robots and loneliness, and a 2025 paper on connectedness for people with long-term care needs.
- **Startup** (Yoeri Dassen, VC scout / YC alum; Predrag Končar, UM startup programme): meaningful AI, presentation, founder thinking, market potential, differentiation. Estimate 20–21 with the founder story and the alarm-centre channel.
- **Maastricht** (Anna Wilbik, Jean-Maurice Henkel) in the final: Anna works on data fusion, federated learning, fair/understandable automated decisions — expect privacy questions. Jean-Maurice asks about the business model.
- Everyone votes in the final, so include the money story whichever track.
- **Logistics:** hacking 13:00–18:00, submission 18:00, jury 18:00–19:00, final pitches 19:00 (all attend). 2-minute pitch + 3-minute Q&A. Six finalists, three winners.

## 6. Demo (about 60 seconds)
- **Roles:** Layla plays Mia Jacobs. Max plays her son Tom and presents. Daniel runs the demo.
- **Scenario 1 — proactive:** the simulator shows a restless night and only 200 steps by 11:00. Belletje calls Mia, asks "How did Lotte's exam go?" (memory), mentions the bad night, hears she's dizzy again. The app shows a summary and the flag "Dizzy 3× this week — suggest calling the GP."
- **Scenario 2 — emergency:** "fall detected." Belletje calls Mia; she doesn't answer. Tom's phone rings: "Your mother may have fallen and isn't answering. Can you go now?" He says yes; the app shows "Help on the way."
- **Stage:** phones on speaker next to the mic. Test audio in the 18:00 break. Record a backup video beforehand.

## 7. Persona (the AI's memory) — `data/persona.json`
Mia Jacobs, 81, alone at Voorbeeldstraat 12, Maastricht (fictional). Son Tom (Max's number), neighbour Mr Hendriks (spare key), GP Dr Smeets. Coffee at 8, walk to the bakery, blood-pressure tablet with breakfast. Likes her garden, crosswords, calls from granddaughter Lotte. Remembers: Lotte's exam yesterday (Mia was nervous); dizzy on Monday and Wednesday.

## 8. Architecture — see `PLAN.md` §1–7 and `CLAUDE.md`
Real: calls, AI, escalation, app. Simulated (said on stage): the watch. Cut: real watch integration, fall-detection algorithms, hardware.

## 9. Tasks
- **Daniel:** everything in `PLAN.md` (backend, voice, escalation, app data layer, tests).
- **Max:** restyle the app screens in `public/` (status home, timeline, call detail, "Can you go now?" alert, watch simulator) — the data is live already; keep the `aria-label`s and `data-testid`s. Then a five-slide deck (story, five disconnected products, demo, business + why now, close) and a 2-minute script rehearsed 5×.
- **Layla:** persona and conversation rules (warm, dignified, never medical advice) plus who gets called when — to Daniel by 15:00 (edit `data/persona.json` and `src/prompts.js` tone lines). Research: older people living alone (CBS StatLine), falls (VeiligheidNL), alarm-system reimbursement, competitors and a pricing guess. Validation: a Gondosóra quote from Daniel's parents, a WhatsApp poll. The Q&A sheet (§11).

## 10. Timeline
| Time | Daniel | Layla | Max |
|---|---|---|---|
| 14:00–14:15 | Kickoff: scope, demo script, repo, keys | Kickoff | Kickoff |
| 14:15–15:00 | First real call to Layla's phone (Phase 1) | Persona and rules | Simulator screen |
| 15:00–16:00 | Memory, watch data, summaries live (Phase 2) | Research, competitors | App screens |
| 16:00–16:45 | Escalation live; app on two phones (Phase 3) | Q&A sheet, poll, deck content | Deck and script |
| 16:45–17:15 | Fixes and fallback | Rehearse as Mia | Polish the app |
| 17:15–17:45 | 3 dry runs, backup video, submit (Phase 4) | Same | Same |
| 18:00–19:00 | Stage audio check | Q&A drill | Pitch rehearsals |

Shift every block if you start late; 17:45 stays fixed. Milestones: 15:00 a call rings · 16:00 a summary in the app · 16:45 the full loop · 17:15 feature freeze. Cut order if time runs out: escalation call first, then the proactive scenario becomes a recorded clip. The live check-in call must work.

## 11. Q&A prep
- **Privacy:** she opts in. Family sees summaries, not raw health data.
- **Surveillance:** she chooses who sees what.
- **Mistakes:** escalation follows fixed rules; humans decide.
- **Medical device:** no — no diagnoses, only "check on her" prompts.
- **Why not just the button?** It only works after the fall, and only if pressed.
- **Cost:** have a rough cost per call ready (voice minutes + LLM tokens; Daniel can read it off the Vapi dashboard after the rehearsal calls).
