# Progress — status board

States: **Verified** · **Built but unverified** · **Blocked by external requirement** · **Not started** · **Needs my action**

Last updated: 2026-10-18 (session 1). Correction: earlier "verified on phone" entries were retracted; no phone test has succeeded yet.

| Area | Status | Notes |
|---|---|---|
| Environment inspection | Verified | Node 24, npm 11. No git, no Android SDK, only Java 8 → APK built in the cloud (EAS). Username contains "&" → see resume notes. |
| Stack decision | Verified (desk research) | See ARCHITECTURE.md. |
| Design tokens, Orb, core components, tab bar | Verified in web preview | Not yet on a real phone. |
| Home "Today" screen | Verified in web preview | One Thing, hour check-in, habits, progress, persistence. |
| Habits (templates, 5 statuses) | Verified in web preview | Detail/heatmap/adjustment proposals: Phase 2b. |
| Honest metrics | Verified (9 unit tests) | `tests/metrics.test.ts` |
| Onboarding (9 steps) | Verified in web preview | Notification permission step only testable on phone. |
| Me: sync status, export, delete | Built but unverified | Needs backend for delete/sync test. |
| Sign-in (email + password) | Built but unverified | Needs backend. |
| Offline outbox + sync | Built but unverified | Queueing verified; upload needs backend. |
| Database schema + RLS | Verified | Applied; 12/12 two-user isolation checks pass. |
| Supabase project (Mumbai) | Verified | `soueweipaljxbpupiqed`, Free plan, ap-south-1. |
| Goals tree, daily planner screen | Not started | Phase 2b |
| Gemini AI layer | Needs my action | Free key from aistudio.google.com; Phase 3. |
| Voice, Communication Lab | Not started | Phase 4 |
| Hourly notifications (local) | Built but unverified on device | Planner: 9 unit tests pass. Morning, hourly in window, evening; quiet hours; pause (client work / family time); Done/Partly/Missed buttons; test button. **Never run on a phone yet** (earlier "verified" entry was wrong and is retracted). |
| Server push (FCM) | Not started | Not needed for check-ins; later for server-driven nudges. |
| Expo account + project | Verified | `@arpan25/my-mentor`; logged in. |
| Android APK on the user's phone | **Installed (1.0.3)** | Installs from the download link. Sign-in bug found (screen never advanced); fixed in 1.0.4 (building). Supabase Site URL still `localhost:3000` → needs `mymentor://auth-callback` (waiting on user's Supabase login). |
| Android APK build (history) | Earlier note, superseded: install FAILED on OnePlus 10R until 1.0.3 | Passes Google's aapt2/zipalign/apksigner; installs successfully on an Android 14 emulator; full build launches to the sign-in screen there; the download link serves an identical file. The phone still says "problem parsing the package", so the cause is on the phone/installer side. Backup builds ready: v1.0.2 (targetSdk 34) and a control "Install Test" app. Next: install straight to the phone over Wi-Fi debugging (QR pairing) and read the real error. See TEST_REPORT.md. |
| Notifications on real Android | Not verified | Emulator test was attempted but the PC ran out of memory. Will be tested on the user's phone once it can be reached with adb. |
| Sign-in + cloud sync | Verified in web preview only | Account, profile and day plan reached Supabase from the browser preview. Not yet tested from a phone. |
| Wife's phone | Needs her action | Account exists (created in web preview), email unconfirmed; app not installed. |
| Work & Business | Not started | Phase 6 |
| Couple Space | Not started | Phase 7 |
| Reports & gamification | Not started | Phase 8 (XP/streak basics exist) |
| GitHub repo | Needs my action | Git not installed on this PC. |

## Resume notes for a future session
- Project folder: `my-mentor/`. Run npm via the 8.3 short path `C:\Users\ARPANB~1\…` with `npm_config_cache=C:\Users\ARPANB~1\AppData\Local\npm-cache`. `npx` inside the project fails (npm shims break on "&"): call tools directly, e.g. `node node_modules/expo/bin/cli …`, `node node_modules/typescript/bin/tsc --noEmit`, `node --test tests/`.
- Supabase org `mzsphtujfotdwbbdluio`, project `soueweipaljxbpupiqed` (my-mentor, Mumbai). Migration 0001 applied. `.env` holds URL + publishable key. The Supabase connector can't create projects (missing cost-confirmation tool); use the dashboard in the built-in browser.
- Without `.env` the app runs in local-only mode (no sign-in screen).

## Phase 3 - Krishna AI mentor (app side) - status as of 2026-10-18
- Built, typechecked, 85 unit tests passing: Mentor chat screen, Memory screen, Settings screen (consent, language, style, masked names, AI connection check, transcript retention), keyboard-aware tab bar.
- Built but unverified: everything above on a real phone or in the web preview (not yet run by a signed-in user).
- Blocked by external requirement: live Gemini replies need GEMINI_API_KEY set as a Supabase secret (user types it). Until then the app shows an honest message and the rules-based coach.
- Not started: OTA update publish (waits for user to install 1.1.0), Phase 4 onward.

---
## Build 1.2.0: all remaining features (2026-10-18)

Status board. States: Verified / Built but unverified / Blocked by external requirement / Not started / Needs my action.

| Area | State | Evidence / what is missing |
|---|---|---|
| No sign-in wall (app opens straight into onboarding, on Android and web) | Verified (web) | Loaded in the built-in browser with no session; goes to onboarding. Android: built, not yet opened on a phone by me. |
| Sign-in (optional) for AI mentor, backup, Couple Space | Built but unverified | Screen unchanged from 1.1.0 plus "Not now" button and optional wording. Email confirmation flow was never confirmed by the user. |
| Phase 3 Krishna chat, Memory, Settings | Built but unverified | Renders on web, no console errors. Live Gemini answers: **Blocked by external requirement** (free Gemini key must be added as Supabase secret `GEMINI_API_KEY` by the user). |
| Phase 4 voice (hold-to-talk, spoken replies) | Built but unverified | Uses the phone's recogniser / TTS. Not testable in a desktop browser; needs a real phone. |
| Phase 4 Communication Lab (24 scenarios, 4 areas, 5-criterion rubric, retry, daily drill, weekly exercise, trends) | Verified (web, rules-based scoring) | Typed an answer, got a basic-check score, attempt saved. AI scoring and rewrite: blocked by the Gemini key. |
| Phase 5 habits UI (Daily/Weekly/Monthly/Yearly, colours, 7-day circles, insights, detail page, timer, adaptive proposals) | Verified (web) | Seeded test data; found and fixed a real bug (settings row overwrote habit start date); regression test added. |
| Phase 5 goals tree, daily planner, push-hard coach, extra reminders | Verified (web) for screens and logic; reminders Built but unverified | Reminder planner is unit-tested (weekly review, pre-event, follow-up, ease-off). Delivery on a real phone was never verified. |
| Phase 6 Work & Business **without CRM** (growth log, time use, delegation advisor, due-date calendar, weekly plan, monthly review) | Verified (web render) | Due dates are typical defaults and labelled "please verify". No leads, pipeline or fees by request; to be a separate app. |
| Phase 7 Couple Space | Content: Verified (web). Sharing: Verified at database level, Built but unverified in the app | Two-consent link, own-items-only writes, end-link hides everything: tested in SQL with 3 users (`supabase/tests/couple_rls.sql`, passed). Two real accounts using it on two devices: **Needs my action** (both of you). |
| Phase 8 reports, PDF export, XP, badges, Weekly Wins picture | Verified (web render); PDF/share Built but unverified | Numbers checked against records by unit test. PDF and image sharing need a phone. |
| Android APK 1.2.0 | Built, signature checked; install on a phone unverified | EAS build FINISHED; pksigner verify ok; manifest 1.2.0 / code 7 / arm64. Not yet opened on a phone by me. |
| Web build | Verified locally | `expo export --platform web`; hosting not set up (see DEPLOYMENT.md). |

---
## Build 1.3.0: store-ready (2026-10-25)
| Item | State | Evidence |
|---|---|---|
| Native app proof | Verified | Hermes bytecode, native libs, no web-wrapper libs (see BUILD_REPORT) |
| Android bundle (.aab) for Play, targetSdk 36 | Built, unverified on Play | EAS build FINISHED; not uploaded anywhere yet |
| APK 1.3.0 targetSdk 36 | Built; manifest checked | Not yet installed by me on a phone |
| New app icon, splash, store graphics | Verified (viewed) | Replaced the framework-default icon that 1.2.0 still had |
| Privacy policy, deletion page, in-app links | Built; pages published once pushed | In-app Settings and sign-in link to them |
| Play listing pack, Data safety answers, master prompt, steps | Written | play-store-pack folder |
| Google Play developer account, fee, closed test, review | **Needs my action** (owner) | About USD 25 one-time; see PLAY_STORE_STEPS.md |