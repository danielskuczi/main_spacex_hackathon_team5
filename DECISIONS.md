# DECISIONS — append-only. Every entry is locked. Do not re-litigate.
Format: `D-nnn · date · who · decision · why`. New entries go at the bottom. To reverse one, append a new entry that supersedes it by number.

D-001 · 2026-09-21 · agent (under PLAN §1) · Stack is Node 22 + Express 5 + vanilla web app, one process, JSON file store. · Zero build steps on hackathon Wi-Fi; one `npm start`; the whole team can read it.

D-002 · 2026-09-21 · agent (under PLAN §1) · Voice provider is behind an interface (`placeCall`, webhook parse, `verify`). `mock` always exists; `vapi` is the first real one. · The loop must run with no keys for tests, rehearsal and the stage fallback.

D-003 · 2026-09-21 · agent (under PLAN §6) · Escalation is code (`applyRules` + timer), never the LLM. The LLM only maps a transcript to an enum: `ok | needs_help | yes | no | unclear`. · Rule-based escalation is the answer to "what if the AI is wrong?" in Q&A and the reason this is not a medical device.

D-004 · 2026-09-21 · agent (under PLAN §5) · Post-call analysis has a keyword heuristic fallback; every result carries `source: llm | heuristic`. · A slow or dead LLM must never stall the loop; the app shows which one produced the text.

D-005 · 2026-09-21 · agent (under PLAN operating instructions) · Everything simulated is labelled simulated in data (`simulated: true`), in the UI, and in the timeline text. · Honesty is a rubric row and a banned-outcome; labelling in data makes it impossible to forget in the UI.

D-006 · 2026-09-21 · agent (under PLAN §3) · Phone numbers come only from `.env`; the persona file holds no real number. · Nothing personal in git; the repo is public.

D-007 · 2026-09-21 · agent (under PLAN §7) · The family app's "I'm going now" / "I can't" buttons feed the *same* rules as the voice answer. · It is legitimate product behaviour (Tom taps instead of talking), and it is the on-stage fallback if Max's phone leg fails.

D-008 · 2026-09-21 · agent (under PLAN §5) · Proactive trigger = sleep < 5 h AND steps < 500 AND watch time ≥ 10:00, 10-minute cooldown, auto-call on by default. · Matches scenario 1 exactly; both conditions so a lazy Sunday alone does not trigger a call.

D-009 · 2026-09-21 · agent (under PLAN §6) · Timer fires at 30 s even if the provider is still ringing Mia; a late no-answer report is recorded but does not re-run rules. · The spec says 30 s. Twilio may ring longer; we do not wait for it.

D-010 · 2026-09-21 · agent (under PLAN §6) · A failed dial (missing number, provider error) is treated as "no answer" and the chain continues to the next contact, ending at the alarm-centre handover. · The loop must never stall on configuration; B12 proves it.

D-011 · 2026-09-21 · agent (under PLAN §1) · Stage language default is English; `CALL_LANGUAGE=nl` is supported but not the default. Pending Daniel's INPUTS A4. · International jury; the app tells the story either way.

D-012 · 2026-09-21 · agent (under PLAN §7) · The care-circle app is the working baseline that Max restyles in place; `aria-label`s, `data-testid`s, the 2 s poll and `/api/state` shape are the contract (B18). · Two frontends on one afternoon is how the app connection fails at 16:45.

<!-- Daniel's entries start below. Suggested next: D-013 voice provider (INPUTS A1), D-014 language (A4), D-015 hosting (C1), D-016 no-answer seconds on stage (D4). -->
