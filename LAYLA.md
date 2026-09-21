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
- Something about Mr Hendriks (one line) → Friendly neighbour; Mia has known him for years and he has her spare key.
- Something about Tom (job, how often he visits) →Tom works in Maastricht and visits Mia about twice a week.
- A late husband / pet / hobby detail Belletje can bring up → Her husband passed away a few years ago; she still enjoys taking care of the garden.

**Memory from last calls** (4–6 short lines. Belletje brings these up naturally.)
The first two must stay: scenario 1 depends on them ("How did Lotte's exam go?" and the "Dizzy 3× this week" flag).
1. Lotte had an exam yesterday; Mia was nervous for her
2. Mentioned feeling dizzy on Monday and Wednesday
3. → Tom visited last weekend
4. → Mia has been spending more time in the garden recently
5. → Lotte usually calls Mia in the eveni

**Your improv facts as Mia** (not given to the AI; things you can say on the call so it sounds real):
- How Lotte's exam went → It went well; Mia is relieved and proud of her.
- What you plan to do today → Stay home this morning and maybe do some gardening later.

## Part 2 — How Belletje talks (tone rules)
The rules below are what the AI gets now. Cross out, reword or add lines.

**Check-in call (daily, warm):**
- A friendly, patient voice, like a kind neighbour who calls every morning. Not a nurse, not a doctor, not a machine.
- Speak slowly. Short sentences. One question at a time. Use her first name.
- Never give medical advice. If worried, only: "It may be worth mentioning that to Dr Smeets. I'll let Tom know."
- Never say "data", "sensors", "simulation"
- Don’t sound like you're reading a checklist. Let the conversation flow naturally while covering the important points.
- Start with something personal she remembers, especially Lotte’s exam.
- Gently bring up that she seemed to have had a restless night or a quieter morning, without mentioning numbers or technical details.
- If Mia mentions feeling unwell, ask simple follow-up questions such as when it happened and whether she has had breakfast and taken her tablet.
- Ask about what she plans to do today.
- Keep the call around 2–3 minutes and end warmly: “Tom will get a short note.”
- If she has fallen, is hurt, or says she needs help: “I’m getting help for you right now. Stay where you are.” Then end the call.
- Your changes → Keep the conversation natural and personal rather than following the questions like a checklist.

**Emergency calls (short, calm):**
- To Mia: “Mia, this is HAVI. Your watch detected a fall. Are you okay?”
If Mia answers and says she is okay → briefly check whether she needs anyone to come over. If she needs help, get help immediately.
If Mia does not answer → call Tom.
To Tom: give the time, say Mia may have fallen and is not answering, give her address and mention that Mr Hendriks has the spare key. Ask: “Can you go now?”
Keep Tom’s call under 45 seconds and make the request clear enough for a simple yes/no answer.
Your changes → Stay calm and factual. No diagnosis or speculation about what happened.
**First words HAVI says when Mia picks up** (now: "Hello Mia, it's HAVI. Is now a good moment for our little chat?") →

## Part 3 — Stage lines for you as Mia (rehearse with Daniel)
Every live call starts with a Twilio trial message: **press any key**, then Belletje speaks.
- **Scenario 1 (check-in):** answer, press a key, chat. You must say you “slept badly” and “felt dizzy again” this morning (that triggers the flag). Mention Lotte’s exam.
- **Scenario 2 (fall):**your phone rings. Don’t answer. After 15 s, Max’s phone rings.
.
- **Scenario 1 (check-in):** answer, press a key, chat. You *must* say you slept badly and that you **"felt dizzy again"** this morning (that triggers the flag). Mention Lotte's exam.
- **Scenario 2 (fall):** your phone rings. **Don't answer.** After 15 s, Max's phone rings.

## Part 4 — Research (a number + a source link for each)
| # | Question | Answer | Source URL |
|---|---|---|---|
| R1 | People 65+ living alone in NL (CBS StatLine) | **~1.1 million (2024)** | https://www.cbs.nl/nl-nl/longread/statistische-trends/2024/huishoudensprognose-2024-2070-bijna-10-miljoen-huishoudens-verwacht-in-2070/4-resultaten-verwachte-huishoudensontwikkeling |
| R2 | Share of 65+ in Limburg **today** (CBS StatLine; our 2006 projection said ~25% by 2025) | **26.2% in 2026** (298,545 people aged 65+ out of 1,138,374) | https://www.cbs.nl/nl-nl/cijfers/detail/70072ned |
| R3 | Falls among 65+ in NL per year: ER visits and deaths (VeiligheidNL) | **119,000 65+ people treated at the ER/SEH after a fall in 2024; 7,115 died as a result of a fall** | https://www.veiligheid.nl/kennisaanbod/infographic/infographic-valongevallen-65-plussers |
| R4 | Personenalarmering: who pays (insurer / municipality / self) and cost per month | **Can be covered by health insurance with a medical indication; Wlz or Wmo may also cover it. Without coverage, the person pays. Subscription costs are not covered by the basic insurance.** | https://www.zorginstituutnederland.nl/verzekerde-zorg/a/alarmeringsapparatuur-personenalarmering-zvw |
| R5 | WDTM keurmerk v4.0: analogue alarm equipment phased out by when | **From 2028, no analogue personal-alarm equipment may be in use or actively connected. New equipment should in principle be digital/mobile from 1 Jan 2025.** | https://www.wdtm.nl/media/kttp40/WDTM_Ketenkeurmerk_versie_4.0-final.pdf |
| R6 | 2–3 Dutch alarm-centre providers (our buyer) | **VHD Alarmcentrale, Eurocross, Verian** | https://www.wdtm.nl/ketenkeurmerk/houders/ |
| R7 | ElliQ price (device + subscription) | **$249 one-time lease initiation + $39.99/month for the 24-month option; monthly subscription listed at $59.99/month.** | https://elliq.com/collections/all |
| R8 | Sensi.AI: what they charge / who buys it | **No public standard price found; B2B SaaS sold directly to care providers/organisations. Pricing is contract-based.** | https://www.sensi.ai/terms-and-conditions/ |
| R9 | Our pricing guess per user per month, and why | **€7.50/user/month paid by the alarm centre. HAVI is a software layer on top of existing alarm infrastructure, so the price should be small compared with the existing alarm service rather than replacing it.** | Our estimate |
| R10 | Gondosóra quote from Daniel's parents (ask Daniel) | **ASK DANIEL** | |
| R11 | WhatsApp poll: question asked, # answers, result | **ASK DANIEL** | |

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
