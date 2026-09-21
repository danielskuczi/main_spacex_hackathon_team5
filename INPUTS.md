# Phase 1 inputs — answered by Daniel 2026-09-21 ~15:30
Write answers after each `A:`. Skip nothing marked **[BLOCKING]**.
Short, honest answers beat polished ones; I assemble the polish.
Every question has a recommendation — an empty answer means "go with the recommendation".

## A — Voice platform and telephony **[BLOCKING]**
**A1.** Which voice-agent account do you have, or can you create in 10 minutes: Vapi, Retell, or ElevenLabs Agents?
Recommendation: Vapi (the provider is already written; transient assistants let each call carry its own prompt). Your pick:
A: Vapi. No account yet — Daniel creates one (free credit). → D-013

**A2.** Do you have a Twilio account with a phone number? Vapi's free numbers are US-only and cannot reliably dial the Netherlands.
Recommendation: buy one Twilio number (≈ €1), import it in Vapi → Phone Numbers → Import, copy the `phoneNumberId` into `VAPI_PHONE_NUMBER_ID`. Your status:
A: No Twilio account before today; Daniel made a trial account at ~15:30. Buy one US number with the trial credit, import it in Vapi. → D-014

**A3.** Is the Twilio account a trial? If yes, every number we call must be a *verified caller ID* (Layla's, Max's, yours), and geographic permissions must allow the Netherlands.
Recommendation: verify all three phones now, before 14:15. Done / not done:
A: Trial, not upgraded (Daniel, 15:30). Verify Layla's, Max's and Daniel's phones as caller IDs; allow the Netherlands for voice + SMS. Accepted cost: every answered call starts with Twilio's trial message and a keypress. → D-014

**A4.** Language of the calls on stage: English (international jury hears everything) or Dutch (more authentic for Mia, jury needs the app to follow)?
Recommendation: English (`CALL_LANGUAGE=en`). Your pick:
A: English. → D-015

**A5.** Voice: Vapi's built-in `Paige` (warm, fast, no extra key) or an ElevenLabs voice (needs an ElevenLabs key in Vapi)?
Recommendation: Paige for Phase 1; switch only if Layla dislikes it in the first test call. Your pick:
A: Paige. → D-013

## B — LLM for the post-call analysis **[BLOCKING]**
**B1.** Which API key do you have: OpenAI, or another OpenAI-compatible endpoint (Groq, Mistral, OpenRouter, Anthropic via proxy)?
Recommendation: OpenAI `gpt-4o-mini` (fast, JSON mode, cheap). Key and model:
A: OpenAI gpt-4o-mini. → D-016

**B2.** Which model should Vapi use *inside* the call? (`VAPI_MODEL`, billed through Vapi.)
Recommendation: `gpt-4o` for the check-in (warmth), same for escalation (short anyway). Your pick:
A: gpt-4o. → D-013

## C — Where the server runs on the day **[BLOCKING]**
**C1.** Laptop + tunnel, or a host (Fly.io / Railway / Render)? The webhook needs a public HTTPS URL; the phones in the room need to reach the app.
Recommendation: laptop + `ngrok http 3000` (or `cloudflared tunnel --url http://localhost:3000`), set `PUBLIC_URL` to the tunnel URL, open the *same* URL on Max's and Layla's phones so the app works even if venue Wi-Fi isolates devices. Your pick:
A: Laptop + tunnel (the alternative was deploying to a cloud host; not needed). → D-017

**C2.** Do you have ngrok (with an account, so the URL is stable for the session) or cloudflared installed?
Recommendation: ngrok with a free static domain, so `PUBLIC_URL` does not change between rehearsal and stage. Installed / needs install:
A: Neither installed; install ngrok (free account + static domain). Phones and laptop on a mobile hotspot, not eduroam. → D-017

## D — Demo mechanics
**D1.** Who is "Tom's phone" on stage — Max's real number, and is he happy to say "yes" out loud on speaker?
Recommendation: Max, speaker on, phone held to the mic. Confirm:
A: Yes — Max is Tom, Layla is Mia, Daniel drives the laptop. → D-018

**D2.** If Tom says "no" in a rehearsal, whose phone is "Mr Hendriks" (`NEIGHBOUR_PHONE`)? Leaving it empty means the rule skips straight to the alarm-centre handover, which is also a fine stage moment.
Recommendation: your own phone, so the third hop is demonstrable in Q&A. Number or "leave empty":
A: Daniel's phone (everyone has one number: Layla = Mia, Max = Tom, Daniel = Mr Hendriks). → D-018

**D3.** SMS to the family: on (real Twilio SMS to Max's phone, trial adds a "Sent from your Twilio trial account" prefix) or off (recorded as "simulated" in the app)?
Recommendation: on — a phone buzzing on stage is worth the prefix. On / off:
A: On, same Twilio trial account and number (trial prefix accepted). → D-019

**D4.** The 30-second no-answer wait is the spec. On stage 30 s of silence is long. Keep 30 s, or shorten to 15 s for the pitch and say "we set the rule to 30 seconds in production"?
Recommendation: 15 s for the pitch (`ESCALATION_NO_ANSWER_MS=15000`), 30 s in the README. Your pick:
A: 15 s on stage, 30 s in README/production. → D-020

**D5.** Watch time for scenario 1 is 11:00 with 200 steps and 4.2 h sleep. Any change?
Recommendation: keep. Change:
A: Keep 11:00 / 200 steps / 4.2 h. → D-021

## E — App hand-off with Max
**E1.** Max builds screens in Cursor on mock data. Should he restyle the working app in `public/` (same data, his design), or hand over a separate frontend that I wire to `/api/state`?
Recommendation: restyle `public/` in place — the poll, aria-labels and data-testids are the contract; he changes CSS and markup around them. Your pick:
A: Restyle public/ in place; Max owns the frontend, works from MAX.md. → D-024

**E2.** UI language on the phones: English (matches an English pitch) or Dutch?
Recommendation: English. Your pick:
A: English. → D-015

## F — Persona and contacts
**F1.** Do Layla's and Max's real first names appear anywhere, or stay "Mia" and "Tom" throughout (calls, app, SMS)?
Recommendation: Mia and Tom everywhere; only the phone numbers are real. Confirm:
A: Daniel: real names would also be fine. Kept Mia/Tom/Mr Hendriks — the names are wired through ~12 files incl. tests and mock scripts; renaming buys nothing on stage. Real phones only in .env. → D-023

**F2.** Anything in `data/persona.json` Layla wants changed before 15:00 (routine, likes, memory lines)? She can edit the file directly; the next call picks it up after a restart.
Recommendation: keep; add one more memory line she can improvise on. Notes:
A: Layla fills LAYLA.md (character sheet, tone rules, research, Q&A); an agent copies it into data/persona.json and src/prompts.js. → D-024

## G — Anything the plan gets wrong
**G1.** One thing in `PLAN.md` you disagree with, or one thing you want cut before 15:00.
A: Nothing for now. Tier 3 stays parked. → D-028
