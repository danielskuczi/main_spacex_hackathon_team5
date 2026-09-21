# MAX — frontend feature list (you own `public/`)

The app already works end to end with live data. Your job: make it look and read great **without breaking the wiring**.
Deadline: frontend frozen **17:25** (D-027). Push straight to `main` (`git pull` first).

## See every state in 2 minutes (no keys needed)
```
npm install && npm start          # http://localhost:3000 (or open it on your phone: http://<laptop-ip>:3000)
```
Watch tab → **Scenario 1**: all screens fill with a check-in, a flag and memory. **Scenario 2**: the full-screen alert, then "Help on the way". **Reset demo** starts over.
Faster: `ESCALATION_NO_ANSWER_MS=8000 MOCK_RING_MS=1500 MOCK_TALK_MS=4000 npm start`.

## Hard rules (the tests check them: run `npm test` before every push)
- Keep every `aria-label` and `data-testid` below **exactly as spelled**. Move them, restyle them, wrap them: fine. Rename or delete them: the tests fail.
- Keep the JS hooks too: element `id`s (`#who #conn #sos #steps #hr #sleep #sim-time #fall #live #checkin #reset #alert #toast`, `#view-*`) and `data-*` attributes (`data-nav data-view data-call data-scenario data-back data-resolve-flag data-respond data-incident data-close-incident`).
- No CDN, no web fonts, no frameworks, no images from the internet (the venue Wi-Fi is hostile). Inline SVG and system fonts only.
- Tap targets ≥ 44 px (`min-height: 44px` must stay in `styles.css`), base text 16 px, must lay out at 360 px wide.
- Anything simulated must **say so on screen**: "simulated watch", "simulated call", "(simulated)" on SMS. Never hide those tags.
- Never hard-code a status, summary, flag or timeline line. Everything on screen comes from `/api/state` (it refreshes every 2 s).
- Where things live: layout of the fixed parts is in `public/index.html`; the screens are HTML strings in the `render*()` functions in `public/app.js`; styles are in `public/styles.css`.

## Priority order (if time runs out, stop after 2)
1. **Status home** and 2. **"Can you go now?" alert**. These are the two screens the jury sees (PLAN "two-screen test": a juror looks at just these two and can tell what happened to Mia, who knows, and what happens next).
3. Call summary detail · 4. Timeline · 5. Watch simulator.

## Screens and what's on them

### Top bar + tab bar (always visible)
- [ ] Brand "Belletje" · who: "Mia Jacobs · 81" (`#who`) · connection badge `#conn` shows **LIVE** or **SIM**
- [ ] Tab bar `aria-label="Main navigation"`: Home · Timeline · Watch (`data-nav`)

### 1. Status home (`data-testid="status-home"`)
- [ ] **Status card** (`data-testid="status-card"`): big label + detail + "since HH:MM · Mia, address". Six levels, each needs its own colour/feel:
  `ok` "All good" · `attention` "Needs attention" · `checking` "Checking on Mia" · `escalating` "Getting help" · `help_on_the_way` "Help on the way" · `alarm_centre` "Alarm centre alerted"
- [ ] **Help-on-the-way card** (only during an incident): who is going + button **"Mia is safe"** (`aria-label="Mark Mia safe"`)
- [ ] **Live call card** (only while a call rings/talks): who, ringing / on the phone, last line said (`aria-label="Open live call"`)
- [ ] **Today from her watch**: 3 tiles (steps by HH:MM, bpm, h sleep), warn style for low steps (<500), high bpm (>110), short sleep (<5 h). Tag **"simulated watch"**
- [ ] **Flags for the family** (`data-testid="flags"`): count, each flag = text + time + "from the live/simulated call" + **Handled** button (`aria-label="Mark flag handled"`). Severity low / medium / high. Empty state: "Nothing to worry about right now."
- [ ] **Latest call** card (`aria-label="Open latest call summary"`): title, LIVE/SIMULATED badge, summary, time · mood · urgency · "analysed by AI / heuristic"
- [ ] **Who's been notified** (`data-testid="notified"`): time, who, channel tag (SMS / call) with "· simulated" or "· failed", message
- [ ] **What Belletje remembers**: list of memory facts, newest first (candidate: collapse behind a tap, since home is one long scroll)

### 2. "Can you go now?" alert (`data-testid="go-now-alert"`, full-screen `role="alertdialog"`)
Shows on Tom's phone when the rules escalate. This is the money shot.
- [ ] Kicker "Belletje · HH:MM" · headline "Your mother may have fallen and isn't answering."
- [ ] Line: watch detected a fall at HH:MM, didn't pick up within N seconds
- [ ] **Address** (big) · neighbour + spare-key line
- [ ] Status line: "Calling your phone now (simulated)…" / "Calling Mr Hendriks…" / "Alarm centre has the case."
- [ ] Two big buttons: **"I'm going now"** (`aria-label="I am going"`) · **"I can't — try Mr Hendriks"** (`aria-label="I cannot go"`)
- [ ] After "I'm going now": the alert closes and home shows the green **Help on the way** card

### 3. Call summary detail (`data-testid="call-detail"`)
- [ ] Back button (`aria-label="Back to timeline"`)
- [ ] Title (Check-in with Mia / Safety call to Mia / Call to Tom / Call to Mr Hendriks) + **LIVE / SIMULATED** badge
- [ ] Time · state (dialling / ringing / on the phone / 42s / no answer / could not call) · reason · "via vapi"
- [ ] Summary (large) · 4 key-values: Mood, Urgency, Outcome, Analysed by
- [ ] Flags from this call · "Remembered for next time" list
- [ ] **Transcript** as chat bubbles (Belletje vs Mia/Tom)
- [ ] "Watch data Belletje had during this call": steps · bpm · sleep · time

### 4. Timeline (`data-testid="timeline"`)
- [ ] Every event, newest first, time with **seconds**, icon per type (incident, escalation, call, flag, SMS, watch signal, proactive ✦, memory, demo, error), high = red, good = green
- [ ] Events tied to a call are tappable → call detail
- [ ] Key line to make shine: "Quiet morning — Belletje decided to call" (proactivity)

### 5. Watch simulator (`data-testid="watch-simulator"`). Daniel's control panel on stage
- [ ] Note: "In this demo the watch is simulated — everything after it is real."
- [ ] Watch face: time input (`aria-label="Watch time"`), **SOS** (`aria-label="SOS button"`)
- [ ] Sliders: steps (`Steps slider`), heart rate (`Heart rate slider`), sleep (`Sleep slider`); toggle `Fall detected toggle`
- [ ] Button **"Belletje calls Mia now"** (`aria-label="Start check-in call"`)
- [ ] Demo card: **Live phone calls** switch (`Live calls toggle`), **Scenario 1** (`Run scenario 1`), **Scenario 2** (`Run scenario 2`), **Reset demo** (`Reset demo`)

## Before you push
`npm test` → 26/26 green. Open it on your phone at 390 px wide and run Scenario 2 once.
