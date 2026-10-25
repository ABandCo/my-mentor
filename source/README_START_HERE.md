# My Mentor: source code handover (version 1.4.0, 25 Oct 2026)

Complete source of the app, the server code, the build workflow and the notes. No build output, no private keys.

## What is inside
| Folder | What |
|---|---|
| `my-mentor/` | The app (React Native with Expo, TypeScript). Run everything from here. |
| `my-mentor/src/app` | Screens: Today, Habits, Mentor (Krishna), Grow, Me, Goals, Planner, Communication Lab, Work, Couple, Reports, Settings, Memory, sign-in |
| `my-mentor/src/lib` | Logic. New in 1.4.0: `discipline.ts` (water, wake log, evening check-in, score), `nudges.ts` (Hindi/English nudges for Arpan and Priya, Sunday plan), `wisdom.ts` (Krishna's lessons), `todo.ts` (Now/Next/Later), `billing.ts`, `network.ts`, `pipeline.ts`, `summary.ts`, `calendar.ts`, `push.ts` |
| `my-mentor/supabase` | Migrations 0001 to 0004, Edge Functions `mentor` (the AI, live version 6) and `nudge` (server nudges), SQL security tests |
| `my-mentor/tests` | 131 unit tests (`npm test`) |
| `my-mentor/docs` | Architecture, security, GITHUB_BUILD.md (how to build), GOOGLE_CALENDAR.md, BUILD_AND_PUSH_STEPS.md, progress notes |
| `.github/workflows/build-apk.yml` | Builds the APK on GitHub (copy this into a repo at `.github/workflows/`) |
| `play-store-pack/`, `tools/` | Play Store texts and graphics, helper scripts (from 1.3.0) |

## Rebuild the APK (no Expo, no Firebase)
1. Put this whole folder in a GitHub repo: the app at `source/my-mentor/` and the workflow at `.github/workflows/build-apk.yml` (the workflow expects that path; edit `working-directory` if you move it). Change the branch name in the workflow's `on.push.branches`.
2. Push. GitHub builds in about 15 minutes (Actions tab). Open the green run, then *Artifacts → My-Mentor-APK*, unzip, install `My-Mentor.apk`.
3. The signing key is created on the first build and kept in GitHub's private cache (`mm-signing-v2`). If the cache is ever cleared, the next build makes a new key and phones must reinstall.

## Work on the code on a computer
```bash
cd my-mentor
npm install
npm test                                   # 131 tests
node node_modules/typescript/bin/tsc --noEmit
node node_modules/expo/bin/cli export --platform web --output-dir dist-web   # web build
```
Needs Node 22+. The `.env` here holds only the public Supabase address and public (publishable) key.

## Live backend (Supabase project `soueweipaljxbpupiqed`, Mumbai)
- Tables with owner-only security: profiles, habits, planner, goals, journal_entries (also stores water, wake, billing, people, pipeline, settings), couples, couple_items, push_devices, push_log and more.
- Edge Function `mentor` (Gemini key stays only as the secret `GEMINI_API_KEY`), Edge Function `nudge` (runs every 15 minutes through pg_cron; sends only to phones registered for Expo push, so it is dormant without Firebase).
- After editing `src/lib/nudges.ts`, run `node scripts/sync-nudge-copy.mjs` (a test checks the server copy).

## Key facts
- Offline-first: data is on the phone and syncs to Supabase when signed in.
- Roles: each phone picks Arpan or Priya in Settings → Discipline & nudges (language Hindi / English / Both). Priya's nudges always name Arpan and ask the two questions; the tests enforce it.
- Nudges without Firebase are scheduled on the phone for 3 days after each open.
- Not done: Google Calendar needs a Google Cloud OAuth client (docs/GOOGLE_CALENDAR.md); server push needs Firebase (docs/BUILD_AND_PUSH_STEPS.md Part B); the website at abandco.github.io/my-mentor is still the older web build.
