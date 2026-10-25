# Architecture — My Mentor

Plain-English record of every technical decision and why. Last updated 2026-10-17.

## The stack in one paragraph
The app is built with **Expo (SDK 58) + React Native + TypeScript**, using **Expo Router** for screens. Data lives in **Supabase** (a hosted Postgres database with built-in sign-in and per-user security rules) in the **Mumbai (ap-south-1)** region. AI runs through **Google Gemini's free API tier**, called only from a Supabase **Edge Function** (a small server program) so the AI key never sits inside the phone app. Hourly check-ins use **local scheduled notifications on the phone** as the main path, plus **server push via Expo's free push service** for things the server decides. The APK is built in the cloud with **EAS Build (Expo's free plan)**.

## Decisions and reasons

| # | Decision | Why | Verified? |
|---|---|---|---|
| D1 | Expo SDK 58, TypeScript, Expo Router | One codebase for Android now and iOS later; no Android Studio needed on this PC; cloud builds. | Scaffold created 2026-10-17 |
| D2 | Supabase free plan, Mumbai region | Real Postgres with Row Level Security (database-enforced "you can only see your own rows"), auth, edge functions and cron (scheduled jobs) all on the free plan with no card. Firebase's server functions need the paid Blaze plan, which breaks the ₹0 rule. | Free-plan limits from third-party 2026 sources; confirm on supabase.com/pricing before launch. Mumbai availability on free plan: **to confirm when creating the project.** |
| D3 | Avoid Supabase auto-pause | Free projects pause after 7 days without activity. Our hourly cron job and daily app use count as activity. A weekly "keep-alive" query is added as a safety net. | Not yet tested |
| D4 | Gemini (Flash-class model) via Edge Function | Only legitimately free official AI API. Key stored as an Edge Function secret. | Not connected yet |
| D5 | Claude / OpenAI / Perplexity adapters built but **disabled** | Requested; no paid usage allowed. A consumer chat subscription is not API access. | n/a |
| D6 | Local notifications first, server push second | Hourly check-ins scheduled on the device keep working offline and don't depend on the server. Server push (Expo Push → Firebase Cloud Messaging) handles server-decided nudges. FCM needs a free Firebase project (Spark plan, no card) just for the push credential. | Not yet tested on device |
| D7 | On-device speech: Android speech-to-text + `expo-speech` text-to-speech, en-IN and hi-IN | Free, private, supports Hindi. AI does the thinking in text. | Not yet tested |
| D8 | EAS Build free plan for the APK | ~15 Android builds/month, low-priority queue (can wait some minutes). Simpler than maintaining a GitHub Actions Android toolchain. EAS also stores the release keystore securely. GitHub Actions is the fallback. | Not yet run |
| D9 | Offline-first local store (AsyncStorage) syncing to Supabase | Check-ins, journal and the daily plan must work with no internet or no AI quota. | Local store built; sync not yet |
| D10 | Windows path workaround | The Windows user folder contains "&", which breaks npm's command shims. All commands run from the 8.3 short path `C:\Users\ARPANB~1\...` and npm's cache is pointed there. Long-term, keep the project in a folder without "&" in its path. | Verified 2026-10-17 |

| D11 | Email + password sign-in (Supabase Auth) | Works without deep-link setup on Android; each spouse has a separate account. | Not yet tested |
| D12 | Sync = persisted outbox of operations, flushed in order; pull + merge on sign-in | Offline-first: every tap is saved on the phone instantly and uploaded later. If a different account signs in on the same phone, local data is wiped first so two people's data never mix. | Queueing verified; upload not yet |
| D14 | Check-ins are **local scheduled notifications** for the next 3 days, rescheduled on every app open/settings change | Works offline and needs no Firebase/FCM setup. If the app isn't opened for 3 days, nudges stop (ignored nudges don't help). Uses Android "best effort" timing: may arrive a few minutes late under battery saving. | Unit-tested; device test pending |
| D15 | EAS CLI installed in `tools/` beside the project | Expo recommends not installing it as a project dependency; global install breaks on the "&" path. | Verified |
| D13 | Expo typed routes disabled | Generator produced wrong routes (likely due to "&" in path). Purely a developer convenience. | Verified |

## Gemini privacy tradeoff (must be shown to users)
Google's free tier terms allow content sent on the free tier to be **used to improve Google products, and may be read by human reviewers**. Therefore:
- Sensitive categories (health, family, journal, couple) are **off by default** for AI.
- Every entry can be marked "never send to AI".
- Client names are replaced with placeholders before sending.
- A small "Leaving device → AI" indicator appears whenever data is sent.
Confirm the current wording at ai.google.dev/gemini-api/terms before connecting.

## Folder map
```
src/app/            screens (Expo Router)
src/theme/          design tokens (colours, type, spacing, shadows)
src/components/     reusable UI (Orb, Card, Button, HabitTile, ProgressRing…)
src/lib/            local store, AI layer, notifications, metrics
supabase/           database migrations and edge functions (phase 2+)
docs/               all project documentation
```
