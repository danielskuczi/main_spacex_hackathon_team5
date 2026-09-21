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

D-013 · 2026-09-21 · Daniel (INPUTS A1, A5, B2) · Voice is Vapi (new account, free credit), voice `Paige`, in-call model `gpt-4o`. · Provider already written; no reason to switch.

D-014 · 2026-09-21 · Daniel (INPUTS A2, A3) · Telephony is a new Twilio **trial** account, not upgraded. One US number bought with trial credit and imported into Vapi; Netherlands allowed for voice and SMS; Layla's, Max's and Daniel's phones verified as caller IDs. Accepted cost: every answered call opens with Twilio's trial message and needs a keypress before Belletje speaks. · Budget stays at trial credits (PLAN §1). A +31 number needs Twilio's regulatory review, which won't finish today.

D-015 · 2026-09-21 · Daniel (INPUTS A4, E2) · Calls and app UI are English. Supersedes the "pending" in D-011. · International jury.

D-016 · 2026-09-21 · Daniel (INPUTS B1) · Post-call analysis uses OpenAI `gpt-4o-mini`. · Fast, JSON mode, cheap.

D-017 · 2026-09-21 · Daniel (INPUTS C1, C2) · Server runs on Daniel's laptop behind ngrok (free account, static domain). Laptop and all phones on a mobile hotspot, not eduroam; phones open the ngrok URL. · eduroam likely blocks device-to-device traffic; the static domain keeps `PUBLIC_URL` stable from rehearsal to stage.

D-018 · 2026-09-21 · Daniel (INPUTS D1, D2) · Phones: Layla = Mia (`MIA_PHONE`), Max = Tom (`TOM_PHONE`), Daniel = Mr Hendriks (`NEIGHBOUR_PHONE`). Daniel drives the laptop. · Three people, three phones; the third hop stays demonstrable.

D-019 · 2026-09-21 · Daniel (INPUTS D3) · Family SMS on, through the same Twilio trial account and number (`SMS_ENABLED=true`). · A phone buzzing on stage is worth the trial prefix.

D-020 · 2026-09-21 · Daniel (INPUTS D4) · No-answer wait on stage is 15 s (`ESCALATION_NO_ANSWER_MS=15000`); README and production say 30 s. Risk to check in Phase 3: the trial message + keypress on Tom's leg may eat the 15 s; if the stopwatch shows it does, raise to 30 s. · 30 s of silence is long on stage.

D-021 · 2026-09-21 · Daniel (INPUTS D5) · Scenario 1 values unchanged: 11:00, 200 steps, 4.2 h sleep. · Matches D-008.

D-022 · 2026-09-21 · Daniel · The family flag reads "Dizzy 3× this week — suggest calling the GP" (not "Dr Smeets"), in the app and on the slides. In the call, Belletje still says "mention it to Dr Smeets". · Matches PROJECT.md and the deck; readable without knowing the persona.

D-023 · 2026-09-21 · agent (Daniel said real names would also be fine) · Character names stay Mia Jacobs, Tom, Mr Hendriks, Lotte, Dr Smeets. · They are wired through ~12 files including tests and mock scripts; renaming costs time and buys nothing on stage.

D-024 · 2026-09-21 · Daniel (INPUTS E1, F2) · Max owns `public/` and restyles in place from `MAX.md`, keeping every `aria-label`/`data-testid` (B18). Layla fills `LAYLA.md` (character, tone rules, research, Q&A); an agent copies her character sheet into `data/persona.json` and her tone lines into `src/prompts.js`. · Everyone gets a file only they edit, so nobody collides.

D-025 · 2026-09-21 · Daniel · Git: `main` is the submission. Max and Layla push straight to `main` (pull first). Agents (Cursor and Claude Code) each work on a short branch and merge to `main` only after `npm test` is green and both `scripts/scenario.js` runs pass; they commit and push without asking once green. · One trunk, checked merges, no waiting on reviews.

D-026 · 2026-09-21 · Daniel · Agents ping Daniel before any real call or real SMS. · Each one rings a teammate's phone and spends trial credit.

D-027 · 2026-09-21 · Daniel · Clock times supersede PLAN §9: **18:00 is the hard end: code on public `main` plus the backup video.** The deck is made after 18:00. Accounts (Daniel, by hand) 15:45–16:10 · Phase 1 first live call 16:30 · Phase 2 live memory + LLM summary 16:55 · Phase 3 live escalation 17:20 · Phase 4 freeze 17:25, dry runs, video, merge, submit by 17:55. Cut order unchanged (escalation call first, then proactive scenario as a clip; the live check-in call must work). · We started building at 15:20.

D-028 · 2026-09-21 · Daniel (INPUTS G1) · Tier 3 stays parked; nothing added to scope. · No time.

D-029 · 2026-09-21 · Daniel · Phase 0 gate closed: accepted after Daniel's own click-through of both scenarios (option B). Known gap carried forward: no screenshots in the repo (DEVIATIONS #10). `main` fast-forwarded to the Phase 0 branch so Max and Layla can pull. · Tests 26/26 and both scenarios verified end to end at 15:38.

D-030 · 2026-09-21 · Daniel (plan B; not paying for Twilio) · Live calls are **Vapi web calls**. `public/phone.html?who=mia|tom|neighbour` is the "phone" on a teammate's phone: it rings, they tap Answer, and the same transient assistant (memory, watch data, webhooks, rules) runs in the browser via the public key. A contact that has a phone number *and* `VAPI_PHONE_NUMBER_ID` is set still gets a real phone call, with no code change. SMS off (recorded as simulated). Supersedes D-014 and D-019; in D-018 "phone" now means that person's phone page (Layla ?who=mia, Max ?who=tom, Daniel ?who=neighbour). · The free Twilio trial cannot give us a number: buying one needs a verified caller ID (API error 21404), and verification calls are refused on trial accounts (10002). Teammates' German numbers are outside the trial's sign-up country anyway.

D-031 · 2026-09-21 · agent (forced by Vapi) · Voice is Vapi `Clara` ("warm, professional"). Supersedes the voice in D-013. · Vapi retired `Paige`: creating the assistant failed with 400 in the preflight at 16:24; `Clara` passed the same preflight.

D-032 · 2026-09-21 · Daniel · Post-call analysis uses Daniel's third-party Claude key: `OPENAI_BASE_URL=https://api.oneprovider.dev/v1`, `OPENAI_MODEL=claude-haiku-4-5` (OpenAI-compatible endpoint). Supersedes D-016. · The only LLM key available; 3.5–4.9 s per analysis on the real transcript (F4 ≤ 20 s).

D-033 · 2026-09-21 · agent (under D-003) · Code has the last word on the outcome enum. Escalation legs: the heuristic's yes/no/ok/needs_help on the person's own words wins whenever it isn't `unclear`; the LLM writes only summary and mood (no flags or facts into Mia's memory). Check-ins: `needs_help` only stands if the heuristic agrees or Belletje said "getting help". Banned medical words are swapped in code on every LLM text field. · Live run 16:41: the model returned `unclear` for "Yes — yes, I'm going now" and `needs_help` for "dizzy again", which escalated a normal check-in to Tom and then to the neighbour. B05b pins it.
