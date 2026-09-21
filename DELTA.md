# DELTA — gap vs the reference anchors, one entry per phase, scored with PLAN §11

## Phase 0 — Skeleton · 2026-09-21

### What runs
- `npm test`: 26/26 green in ~4 s (F7 met).
- `npm start` + `node scripts/scenario.js 1` → proactive event → simulated check-in → heuristic analysis → "Dizzy 3× this week — suggest calling Dr Smeets" flag → status "Needs attention" → 3 facts remembered. 6 s wall time at demo pacing.
- `node scripts/scenario.js 2` → fall → Mia called → 30 s rule (8 s in the dev run) → SMS (simulated) + Tom called → "yes" → "Help on the way". App mirrors every hop.
- App screens captured at 390×844 (iPhone-class), simulated calls: home with flag, call detail with transcript, full-screen "Can you go now?" alert, help-on-the-way card, timeline, watch simulator. No console errors.

### Gap vs anchors
| Anchor | Where we are | Gap |
|---|---|---|
| ElliQ (conversation) | Prompt carries memory, last 3 summaries, watch observations, warmth rules; **no live call placed yet** (no keys in this environment) | The bar is only measurable on a real phone. Phase 1. |
| Apple SOS (escalation) | Deterministic loop with timer, three hops, app mirror, failure-tolerant | Mia's leg keeps ringing after the 30 s timer (no hang-up call to the provider). Tier 3. |
| Sensi (family insight) | Heuristic flags are already the right shape; LLM path tested with a fake endpoint only | Real LLM wording unverified until a key exists. Phase 2. |

### Self-score (PLAN §11)
| Row | Score | Why | Cheapest +2 |
|---|---|---|---|
| Conversation warmth | 2 | No live call yet — by definition scripted | Phase 1 gate: one real call to Layla |
| Proactivity | 7 | Auto-call fires from watch data, reason in timeline | Live call raises to 10 |
| Escalation loop | 4 | Works simulated, every hop; not yet on real phones | Phase 3 live run with stopwatch |
| Family insight | 7 | Heuristic summary + 3× flag + facts, simulated call | Real LLM on a real transcript (Phase 2) |
| App glanceability | 7 | Status card answers "is Mum ok?"; home is one long scroll | Max's pass; collapse "what Belletje remembers" behind a tap |
| Demo robustness | 4 | Simulated fallback exists and is one button; no live path, no backup video | Phase 1 live path; Phase 4 video |
| Honesty | 10 | Every simulated element labelled in data, UI and timeline; `live:false` when a provider is missing | — |
| Accessibility floor | 7 | F5 met by B18 + capture; not yet checked on a real phone | Open on Max's phone in Phase 3 |

Rows below 7: Conversation (2), Escalation (4), Robustness (4). Two cheapest +2s are both "place a real call" — that *is* Phase 1, so no extra work is queued before the gate.

### Floors
F1 ✓ (B06 < 3 s) · F2 ✓ ordering (B07), wall-clock pending live · F3 ✓ (B18) · F4 ✓ (B05/B14) · F5 ✓ (B18 + captures) · F6 ✓ (B18) · F7 ✓ · F8 ✓ (B17) · F9 ✓ (`applyRules` only reads `analysis.outcome`).

## Phase 1 — First real call · 2026-09-21 16:45

### What runs
- Live Vapi web call to Daniel's phone (`/phone.html?who=mia`, D-030) at 16:30: rang, answered, 93 s, 11 transcript lines; end-of-call webhook landed through the ngrok tunnel; summary in the app.
- LLM analysis live (D-032): the same transcript re-analysed in 3.5–4.9 s, `source: llm`. Both scenarios re-run with the real LLM: scenario 1 → "Dizzy 3× … suggest calling the GP", no false escalation; scenario 2 → 15 s → Tom `yes` → Help on the way.
- Battery 28/28.

### Gap vs anchors
| Anchor | Where we are | Gap |
|---|---|---|
| ElliQ | Live call used her name, asked about Lotte unprompted, noticed the restless night without numbers, closed warmly | Gave medication advice once (fixed in prompt, DEVIATIONS 14); says "Bellicca"; web call, not her phone line |
| Apple SOS | Loop verified simulated with the real LLM | Not yet run live on two phone pages (Phase 3) |
| Sensi | LLM summary + flags from a live transcript, banned words enforced in code | "Dizzy 3×" not yet produced from a *live* call (Phase 2 gate) |

### Self-score
Conversation 7 (live, memory, gentle; one advice slip) · Proactivity 7 · Escalation 4 (simulated only) · Family insight 7 · Glanceability 7 · Robustness 7 (live + simulated fallback, rehearsed once) · Honesty 10 ("live web call" labels) · Accessibility 7.
Row below 7: Escalation. Cheapest +2: run scenario 2 live with Max on `?who=tom` (Phase 3).

## Phases 2–3 — Memory, summaries, live escalation · 2026-09-21 17:15

### What runs (all live web calls, D-030)
- **Phase 2, 16:53:** check-in used memory unprompted ("How did Lotte's exam go yesterday? You were nervous for her."), only the GP line on dizziness, LLM summary + "Dizzy … suggest calling the GP" flag, status "Needs attention". No medication advice after the D-033/B03 fix.
- **Phase 3, 17:14:** fall → Mia's page rang → no pickup → **Tom's call placed at +15.0 s, answered at +20.9 s** (F2 ≤ 45 s met, stopwatch = server timestamps) → "Yep." → outcome `yes` → Help on the way. SOS now goes straight to Tom (D-039).
- Battery 30/30.

### Self-score
Conversation 8 (memory, no numbers, GP line only; voice slightly stiff) · Proactivity 7 (live proactive run not yet captured) · Escalation 8 (full loop live by voice; Help on the way lands at call end, not at the "yes") · Family insight 9 (live LLM summary + GP flag; wording not yet pinned) · Glanceability 7 · Robustness 7 (live + simulated switch; no video yet) · Honesty 10 · Accessibility 7.
Cheapest +2s: record the backup video (Robustness); run Scenario 1 live once (Proactivity).
