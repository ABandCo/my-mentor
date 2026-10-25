# Product spec — My Mentor (condensed from Master Build Prompt V2)

**North star:** Convert intention into action. Measure what actually happens. Learn from it. Improve the system. Push people out of the app and into their lives.

## Locked decisions
- Users: Arpan Bohra and his wife; two private accounts; extensible later, no billing/public signup.
- Android-first private APK; iOS-ready code.
- English + Hindi + Hinglish. Full English UI with Hindi labels on key screens.
- Top-priority modules (equal polish): Accountability, Communication Lab, CA/CS Practice Growth, Habits & Health. Couple Space fully built but ranked below.
- Coaching tone: strict and direct for Arpan (never shaming); wife sets her own.
- AI: only free official APIs (Gemini free tier). Claude/OpenAI/Perplexity adapters built but disabled.
- Budget ₹0/month. Any cost → stop and ask.
- Data: encrypted cloud in India/APAC.
- Reminders: hourly intensive mode in waking hours with quiet hours and off switch.
- Look: calm premium base, light cream/sage/soft-gold palette, playful rewards, animated glowing orb mentor.
- Gamification: rich, never shaming; reward recovery.
- Delivery: complete app in one release, phased internally, nothing faked.

## 30-day success (reported from real data)
1. Daily consistent action (plan, hourly check-ins, recovery).
2. Communication Lab weekly scores trending up on a fixed rubric.
3. Practice growth: BD actions, follow-ups, fee realisation logged and reviewed weekly.
4. Healthier routines: sleep, water, exercise, digital wellbeing recorded honestly.

## Screens
Bottom bar: Home · Habits · Mentor (centre orb) · Grow · Me.
- **Onboarding (<5 min):** orb welcome, language, coaching style, focus areas, wake/sleep/quiet/intensive window, notification permission + battery guidance, privacy & AI consent (sensitive off by default), real baselines (skippable, never invented), first tiny win.
- **Home:** greeting + orb + mood tap; Today's One Thing + focus timer; This-hour card (Done/Partly/Missed/Change plan); habit tiles; pending commitments; week ring, streak + comeback counter, XP; hold-to-speak. Low-motivation mode collapses to "Smallest next step".
- **Talk to Mentor:** full-screen orb, hold-to-talk + text, transcript bubbles, quick-start chips, post-session summary with Accept/Edit/Dismiss actions, editable memory chips.
- **Habits:** statuses done/partial/missed/rest/N/A/unrecorded (distinct from missed); full habit fields; detail heatmap, trends, miss reasons, adjustment proposals (Approve/Decline with trial outcome); templates.
- **Goals:** long-term → quarterly → weekly → today; mentor makes goals specific; progress from recorded actions only.
- **Communication Lab:** scenario library (spoken/professional English, seminars, listening, questioning, assertiveness, persuasion, family, CA/CS client scenarios); respond → scored feedback → improved example → retry; fixed rubric with evidence sentence per score; daily 5-min drill, weekly deep exercise; trends; varied role-play voices in EN/HI. Never claims to measure intelligence/personality/body language.
- **Work & Business:** separate dashboards for Arpan Bohra & Co. and ComplianceKart; revenue targets, fee realisation, recurring revenue, leads, proposals, follow-ups, conversion, retention, outstanding fees, referrals, networking, content, delegation, BD hours vs low-value hours; pipeline board with overdue alerts; weekly action plan; monthly review; delegation advisor; anonymised client names option; no invented data.
- **Couple Space:** shared goals/habits only with both consents; check-ins, reflections, gratitude, exercises, milestones; Sharing Controls with one-tap revoke; no leaderboards.
- **Reports:** weekly/monthly/30-day; adherence = completed eligible ÷ eligible × 100 with unknown/rest/excused/N/A reported separately; "How this is calculated"; incomplete-data flags; PDF export.
- **Health:** manual entry first, personal targets, no diagnosis, highly sensitive.
- **Settings:** language, style, schedule, quiet hours, intensive window, AI providers + free-quota meter, privacy, memory manager, export/delete, retention, theme, haptics/sound.
- Every screen handles empty, loading, error, offline, permission-denied, success.

## Mentor brain
Honest, direct, refers only to recorded commitments; separates facts from labelled hypotheses; diagnoses why plans fail by asking; structured exercise-based programmes; no shaming/threats/manipulation; no diagnosing; crisis → drop accountability, respond with care, suggest professional/emergency help. Consented, editable, exportable memory; never invented.

## Accountability engine
Morning plan, hourly check-ins in window, pre-event reminders, follow-ups, evening review, weekly/monthly reviews. Quiet hours, "client work" and "family time" pause. Offer to ease off if nudges go unanswered. Backend scheduling, device registration, IST default, retries, dedupe, delivery + ack records. Prove on real phone.

## Gamification
XP for honest actions incl. recovery; streaks with rest days + weekly shield; Comeback badge > perfect streak; milestone badges; Weekly Wins card; orb level glows; never reward unverified entries; missed days → supportive reset.

## Security & privacy
Server-side auth + DB-enforced isolation (RLS); no keys in app; validation, rate limits, no conversation content in logs; India/APAC region; couple permissions enforced server-side; voice audio deleted after transcription; working export + delete; AI safeguards: minimise, strip client names, "never send to AI" flag, visible data-leaving indicator.

## Deliverables
Verified APK + real install path for both phones; GitHub repo; docs (README, PRODUCT_SPEC, ARCHITECTURE, IMPLEMENTATION_PLAN, PROGRESS, TEST_REPORT, DEPLOYMENT, API_INTEGRATIONS, COSTS, .env.example, USER_GUIDE, SECURITY, DESIGN_SYSTEM).
