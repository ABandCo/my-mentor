# My Mentor: source code handover (version 1.3.0, 25 Oct 2026)

Complete source of the app, the server code and the notes, without build output and without any secret keys.

## What is inside
| Folder | What |
|---|---|
| `my-mentor/` | The app (React Native with Expo, TypeScript). Run everything from here. |
| `my-mentor/src/app` | Screens (Home, Habits, Mentor, Grow, Me, Goals, Planner, Communication Lab, Work, Couple, Reports, Settings, Memory, sign-in) |
| `my-mentor/src/lib` | Logic: store and sync, metrics, habits, goals, push coach, reports, rewards, Communication Lab, business, couple, notifications, voice, AI client and masking |
| `my-mentor/src/components` | Shared UI |
| `my-mentor/supabase` | Database migrations (0001 to 0003 plus the keep-alive notes in `docs/LONG_TERM.md`), the `mentor` Edge Function (server side of the AI), SQL security tests |
| `my-mentor/tests` | 107 unit tests (`npm test`) |
| `my-mentor/docs` | Architecture, security, costs, test report, progress board, long-term plan, deployment history |
| `tools/` | Helper scripts used for building (icon generator, build watcher, APK inspector) |
| `play-store-pack/` | Listing text, Data safety answers, steps, master prompt, graphics, privacy pages |

## Not included on purpose
- `node_modules` (run `npm install`), build outputs, the APK and AAB files.
- Any private key. The Gemini key lives only as a Supabase Edge Function secret named `GEMINI_API_KEY`. The `.env` here holds only the public Supabase address and public (publishable) key.

## To work on it
Windows note: this project was built from a folder whose path contains "&", so use short paths or call node scripts directly: `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/expo/bin/cli ...`.

```bash
cd my-mentor
npm install
npm test                       # 107 tests
node node_modules/typescript/bin/tsc --noEmit
node node_modules/expo/bin/cli export --platform web --output-dir dist-web   # web build
```

Builds run in Expo's cloud (EAS, free tier): profiles in `eas.json`: `preview` (APK, sideload), `play` (AAB for Google Play, targetSdk 36), `play-test-apk`, `emulator-local`. The Expo account and project id are in `app.json`. The signing key is held by Expo.

## Key facts for the next developer
- Offline-first: local store with a sync outbox to Supabase when signed in. No sign-in wall.
- Backend project: Supabase `soueweipaljxbpupiqed` (Mumbai, free). Tables: owner-only RLS. Couple Space uses two-consent RPCs.
- AI: only through the `mentor` Edge Function (Gemini). Names, PAN, GSTIN, phone and similar are masked on the phone and again on the server. Modes: chat, plan_day, extract, weekly_review, comm_score, goal_plan, biz_plan.
- Status and open items are in `my-mentor/docs/PROGRESS.md` and `docs/TEST_REPORT.md`. Open at handover: the live Gemini key was still being fixed ("API key not valid"), phone install test of 1.3.0, Google Play account and review.
- Live addresses: web app and APK at https://abandco.github.io/my-mentor/ (GitHub repo ABandCo/my-mentor holds the built site only).
- Business CRM (leads, pipeline, fees) was deliberately left out; it is planned as a separate app.
