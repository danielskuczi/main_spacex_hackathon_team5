# LAYLA — fill this file (you own it)

Write your answers after each `→`. Push straight to `main` (`git pull` first). An agent copies Parts 1–2 into `data/persona.json` and `src/prompts.js`, so you never touch code.
Deadlines (D-027): **Parts 1–2 by 16:15** (the live calls need them) · Parts 3–5 by 18:30 (for the deck and the 19:00 Q&A).

Rules: no real address, no real phone number anywhere in this file (the repo is public). No medical advice in anything Belletje says: only "check on her" / "mention it to Dr Smeets".

---

## Part 1 — Mia's character sheet (this is what the AI "remembers")
Names are fixed: **Mia Jacobs** (you), son **Tom** (Max), neighbour **Mr Hendriks** (spare key, Daniel's phone), GP **Dr Smeets**, granddaughter **Lotte** (D-023: they're wired into the code and tests).
Current values are shown; overwrite any of them or leave them as is.

- Age → 81
- Lives (fictional address) → alone, Voorbeeldstraat 12, Maastricht
- Daily routine → coffee at 8, walk to the bakery, blood-pressure tablet with breakfast
- Likes → her garden, crosswords, calls from granddaughter Lotte
- Something about Mr Hendriks (one line) →
- Something about Tom (job, how often he visits) →
- A late husband / pet / hobby detail Belletje can bring up →

**Memory from last calls** (4–6 short lines. Belletje brings these up naturally.)
The first two must stay: scenario 1 depends on them ("How did Lotte's exam go?" and the "Dizzy 3× this week" flag).
1. Lotte had an exam yesterday; Mia was nervous for her
2. Mentioned feeling dizzy on Monday and Wednesday
3. →
4. →
5. →

**Your improv facts as Mia** (not given to the AI; things you can say on the call so it sounds real):
- How Lotte's exam went →
- What you plan to do today →

## Part 2 — How Belletje talks (tone rules)
The rules below are what the AI gets now. Cross out, reword or add lines.

**Check-in call (daily, warm):**
- A friendly, patient voice, like a kind neighbour who calls every morning. Not a nurse, not a doctor, not a machine.
- Speak slowly. Short sentences. One question at a time. Use her first name.
- Never give medical advice. If worried, only: "It may be worth mentioning that to Dr Smeets. I'll let Tom know."
- Never say "data", "sensors", "simulation" or "AI".
- Order: greet → ask about what it remembers (Lotte's exam) → gently mention the restless night / not moving much, *without numbers* → if a complaint: when did it happen, has she had breakfast and her tablet → plans for today → warm goodbye within ~3 min, "Tom will get a short note".
- If she has fallen / is hurt / needs help: "I'm getting help for you right now. Stay where you are." and end the call.
- Your changes →

**Emergency calls (short, calm):**
- To Mia: "Mia, this is Belletje. Your watch detected a fall. Are you okay?"
- To Tom: time, not answering, address, spare key with Mr Hendriks, "Can you go now?" Wants a yes or no, under 45 s.
- Your changes →

**First words Belletje says when Mia picks up** (now: "Hello Mia, it's Belletje. Is now a good moment for our little chat?") →

## Part 3 — Stage lines for you as Mia (rehearse with Daniel)
Every live call starts with a Twilio trial message: **press any key**, then Belletje speaks.
- **Scenario 1 (check-in):** answer, press a key, chat. You *must* say you slept badly and that you **"felt dizzy again"** this morning (that triggers the flag). Mention Lotte's exam.
- **Scenario 2 (fall):** your phone rings. **Don't answer.** After 15 s, Max's phone rings.

## Part 4 — Research (a number + a source link for each)
| # | Question | Answer | Source URL |
|---|---|---|---|
| R1 | People 65+ living alone in NL (CBS StatLine) | | |
| R2 | Share of 65+ in Limburg **today** (CBS StatLine; our 2006 projection said ~25% by 2025) | | |
| R3 | Falls among 65+ in NL per year: ER visits and deaths (VeiligheidNL) | | |
| R4 | Personenalarmering: who pays (insurer / municipality / self) and cost per month | | |
| R5 | WDTM keurmerk v4.0: analogue alarm equipment phased out by when | | |
| R6 | 2–3 Dutch alarm-centre providers (our buyer) | | |
| R7 | ElliQ price (device + subscription) | | |
| R8 | Sensi.AI: what they charge / who buys it | | |
| R9 | Our pricing guess per user per month, and why | | |
| R10 | Gondosóra quote from Daniel's parents (ask Daniel) | | |
| R11 | WhatsApp poll: question asked, # answers, result | | |

## Part 5 — Q&A sheet (one or two sentences each; Max and Daniel read this before 19:00)
Jury to expect: Anna Wilbik (data fusion, privacy, fair automated decisions), Jean-Maurice Henkel (business model), Gaby Odekerken-Schröder (loneliness, companion robots), Yoeri Dassen (VC, YC).

| # | Question | Our answer |
|---|---|---|
| Q1 | What data do you collect, who sees it, where is it stored? (GDPR) | |
| Q2 | Isn't this surveillance of old people? Who decides who sees what? | |
| Q3 | What if the AI gets it wrong: misses a fall, or calls Tom for nothing? | Escalation is fixed rules, not the AI; humans decide. |
| Q4 | Is this a medical device (EU MDR)? | No diagnoses, only "check on her" prompts. |
| Q5 | Why not just the panic button? | It only works after the fall, and only if pressed. |
| Q6 | What does one call cost? (Daniel reads it off the Vapi dashboard) | |
| Q7 | Who pays, and why would an alarm centre buy this? | |
| Q8 | What about people with dementia, hearing loss, or who don't speak English? | |
| Q9 | Does a daily call from an AI make loneliness better or worse? | |
| Q10 | What's real in the demo and what's simulated? | Real: calls, AI, escalation, app. Simulated: the watch. |
| Q11 | What stops ElliQ or an alarm centre from building this themselves? | |
| Q12 | How do you get the first 100 users? | |
