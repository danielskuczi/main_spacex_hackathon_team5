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
