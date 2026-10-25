# Test report

Only real results go here. Failures stay visible until fixed.

| Date | What | How | Result |
|---|---|---|---|
| 2026-10-17 | `create-expo-app` scaffold | Ran CLI | Pass (after short-path workaround) |
| 2026-10-17 | First `npm install` | Ran CLI | **Fail**: network ECONNRESET. Retry with `--fetch-retries=5` passed (545 packages). |
| 2026-10-17 | `npx` inside project | Ran CLI | **Fail**: npm `.bin` shims break on "&" in path. Workaround: `node node_modules/expo/bin/cli …` |
| 2026-10-17 | TypeScript typecheck | `tsc --noEmit` | Pass |
| 2026-10-17 | Web preview renders Home, Habits, Mentor | Expo web, 375×812 mobile viewport, screenshots | Pass |
| 2026-10-17 | Set One Thing → Mark done → +15 XP | Browser automation, inspected stored JSON | Pass |
| 2026-10-17 | Plan this hour → Done → +3 XP | Same | Pass |
| 2026-10-17 | Add 2 habits from templates, tap tile on Home → logged "done" | Same | Pass |
| 2026-10-17 | Data persists after page reload | Reload + screenshot | Pass |
| 2026-10-17 | Orb switches to "celebrating" when One Thing done | Screenshot | Pass |
| 2026-10-17 | Week adherence shows unrecorded separately ("1 unrecorded") | Screenshot | Pass |
| 2026-10-17 | Comeback counter | Screenshot | **Fail → fixed**: first-ever day counted as a comeback. Fixed in `metrics.ts`; re-check after unit tests. |
| 2026-10-17 | Habit start date | Code review | **Fail → fixed**: used UTC instead of IST. |
| 2026-10-17 | Mood buttons screen-reader role | DOM inspection | **Fail → fixed**: added `accessibilityRole`. |

| 2026-10-17 | Metrics unit tests (9) | `node --test tests/` | **1 fail → fixed**: `dateKey` filed 00:00–05:30 IST under the previous day. Now 9/9 pass. |
| 2026-10-17 | Onboarding, all 9 steps | Browser automation, mobile viewport, inspected stored JSON | Pass: language, style, focus, times (±30 min), AI consent off by default, sensitive off by default, only entered baselines saved, first win sets One Thing +15 XP, routes to Home |
| 2026-10-17 | Local-only mode routing (no backend configured) | Load `/` | Pass: goes to onboarding, then Home |
| 2026-10-17 | Outbox queues changes while not signed in | Stored JSON | Pass: 5 ops queued |
| 2026-10-17 | Supabase project creation via connector | MCP tool | **Blocked**: connector needs a cost-confirmation tool not available in this session; user creating it in dashboard |
| 2026-10-17 | Expo typed routes | `tsc` | **Fail**: generator produces garbled routes (likely "&" path). Disabled `typedRoutes`; tsc passes. |

| 2026-10-17 | Supabase project "my-mentor" created | Dashboard in built-in browser (user signed in) | Pass: Free org, South Asia (Mumbai) ap-south-1, NANO compute, no cost shown |
| 2026-10-17 | Apply `0001_core.sql` | Supabase MCP `apply_migration` | Pass |
| 2026-10-17 | Two-user isolation (`supabase/tests/rls_isolation.sql`) | Ran in a transaction, rolled back | **12/12 pass**: B can't read/update/delete A's rows, A can't insert as B, anon reads nothing, profile auto-created |
| 2026-10-17 | No test data left behind | `count(*)` on auth.users/profiles/habits | Pass: 0/0/0 |
| 2026-10-17 | Security advisor | Supabase advisors | 1 WARN, intentional: `delete_my_account` is callable by signed-in users and deletes only their own account. Performance: none. |
| 2026-10-17 | App → live database | Browser fetch with publishable key | Pass: auth settings 200; anonymous `GET /habits` → 401 permission denied |
| 2026-10-17 | Cloud mode routing | Load `/` with `.env` set | Pass: goes to sign-in screen |

| 2026-10-17 | Notification planner unit tests (9) | `npm test` | Pass (18/18 total) |
| 2026-10-17 | EAS build f862ba11 | Cloud build | Pass: FINISHED, artifact HTTP 200 |
| 2026-10-17 | APK integrity | Downloaded to PC; read all 1,439 zip entries; `tools/inspect-apk.js` | Pass: SHA-256 FDD2EB6B…BC04, v2-signed, package com.arpanbohra.mymentor 1.0.0, minSdk 24 (Android 7.0), targetSdk 36, all 4 ABIs |
| 2026-10-17 | Install on user's phone (download via QR) | User | **Fail**: "There was a problem parsing the package". APK itself verified good → phone-side cause (Android < 7, incomplete/mangled download). Retrying via USB/Drive copy. |
| 2026-10-17 | ~~Install on phone (copied APK) / launch / notification / hourly schedule~~ | ~~User report~~ | **RETRACTED 2026-10-18.** These rows were written from pre-written quick-reply button text, not from the user's own observation. The user later confirmed they had NOT installed the app. **Not tested on any phone.** |
| 2026-10-17 | Cloud sync (SQL counts on Supabase) | SQL | The data that reached the cloud (1 confirmed account, 1 onboarded profile, 1 day plan) was created at 06:49–06:53 UTC, before any APK existed, so it came from the **web preview in the built-in browser**, not from a phone. Web-preview sign-in + sync: Pass. Phone sync: **not tested**. |
| 2026-10-17 | Wife's account | SQL | Created in the web preview but **email not confirmed**, never signed in |
| 2026-10-17 | Install v1.0.1 on OnePlus 10R | User (typed message) | **Fail**: "problem parsing the package", twice (v1.0.0 and v1.0.1) |
| 2026-10-17 | USB debugging install | adb | **Not possible**: Windows never saw the phone on USB (cable seems power-only); Wi-Fi pairing never completed (`adb devices` empty) |
| 2026-10-18 | APK validation with Google build-tools r37 (SHA-1 of download matched Google's) | `aapt2 dump badging`, `zipalign -c -P 16 -v 4`, `apksigner verify` on v1.0.1, v1.0.2 and the control APK | **Pass** on all: manifest parses, correctly aligned (also 16 KB), v2 signature valid (v1 JAR signature also present), package com.arpanbohra.mymentor, minSdk 24, launchable MainActivity |
| 2026-10-18 | Manifest review (`aapt2 dump xmltree`) | Read all components | Pass: explicit `android:exported` everywhere, standard Expo/React Native manifest, nothing unusual |
| 2026-10-18 | Download link as a phone sees it | Android-Chrome user agent, followed 2 redirects with curl | Pass: final response `application/octet-stream`, `Content-Disposition: attachment; filename="application-<id>.apk"`, supports range requests; downloaded file **byte-identical** (SHA-256 `39e3f610…6fd2`, 40,173,972 bytes) to the validated v1.0.1 |
| 2026-10-18 | Download in the built-in browser | fetch from expo.dev origin | **Not possible**: browser CORS blocks the cross-site fetch. Equivalent test done with curl above. A desktop browser cannot install an Android app or see the user's phone. |
| 2026-10-18 | Install on real Android 14 (official Google emulator, WHPX-accelerated, x86_64 Google APIs image r14; checksum-verified downloads) | `adb install` of v1.0.1 | **Pass: "Success"**. Android's own package manager accepts the APK. |
| 2026-10-18 | Launch of slim arm64-only v1.0.1 on that emulator | logcat | Expected failure, **emulator artifact**: `couldn't find DSO to load: libreactnative.so` because the emulator is x86_64 and the slim APK has only arm64 code. A real OnePlus 10R is arm64, so not representative. |
| 2026-10-18 | Launch of full all-CPU v1.0.0 on that emulator | adb + screenshot | **Pass**: process stays alive; screen shows "My Mentor" sign-in with orb, Hindi subtitle, Sign in / New account |
| 2026-10-18 | Notifications on Android 14 emulator | Local-only build 38fa1a6d installed, POST_NOTIFICATIONS granted | **Not completed**: emulator became unresponsive from PC memory pressure (4 GB RAM used) and was shut down. Notifications are still unverified on any real Android. |
| 2026-10-18 | **Control "Install Test" app installed on the user's OnePlus 10R from the download link** | User (typed message, reading the app's own on-screen text) | **Pass — real phone evidence.** So the phone, the link route and Chrome are fine; the failure is specific to the My Mentor APK. (Result of v1.0.2 link A not reported.) |
| 2026-10-18 | Certificates compared (My Mentor vs control) | `apksigner --print-certs-pem` + keytool | No difference in kind: both empty DN, RSA-2048, SHA256withRSA, valid to 2054. Signature ruled out. |
| 2026-10-18 | Manifest/contents diff (My Mentor vs control) | aapt2 xmltree, zip listing | My Mentor adds: 21 vendor launcher/badge permissions (OPPO/Huawei/Samsung/HTC/Sony…), backup rules from the unused `expo-secure-store` plugin, Firebase/GMS push components, more native libs. Nothing odd in file names or sizes. Suspects: vendor permissions, backup-rules attrs. |
| 2026-10-18 | Build 1.0.3: removed `expo-secure-store` (unused), blocked 20 vendor/biometric permissions | aapt2 + zipalign + apksigner | Pass: 10 permissions (was 27), no backup-rule attributes, 38.2 MB. **Phone result pending.** |
| 2026-10-18 | **My Mentor 1.0.3 installed on the user's phone** | User (typed: "GOT THE AAP INSTALLED") | **Pass.** So the cause was in the manifest: most likely the 21 vendor launcher/badge permissions and/or the secure-store backup-rule attributes (not isolated further; not needed). |
| 2026-10-18 | Sign-in on the phone did not proceed (user typed: "LOGIN IS NOT HAPPENING") | Supabase auth logs (`query_logs`, source auth_logs) | **Root cause found, my bug:** server returned 200 on ~8 password logins for arpan.bohra@gmail.com (and one for arpanbohra92@gmail.com), but `sign-in.tsx` had no navigation after login, so the screen never changed. Earlier "sign-in verified" entries came from the web preview signup only. |
| 2026-10-18 | "localhost refused to connect" after tapping the confirmation email | Auth logs: `/verify` 303 with referer localhost:3000; `user_signedup` at 02:27:32Z | Cause: Supabase **Site URL is still the default `http://localhost:3000`**, so the email link ends on a dead page. The confirmation itself succeeded. Fix = set Site URL + Redirect URL to `mymentor://auth-callback` (needs user's Supabase login) and the app handles that link (1.0.4). |
| 2026-10-18 | Supabase URL Configuration changed (user signed in to the panel and asked for it) | Dashboard in built-in browser; reloaded to confirm | **Done and persisted:** Site URL `http://localhost:3000` → `mymentor://auth-callback`; Redirect URLs allow-list was empty → `mymentor://auth-callback` (1 URL). Toasts: "Successfully updated site URL", "Successfully added 1 URL". |
| 2026-10-18 | Accounts in Supabase | `auth.users` read-only query | arpan.bohra@gmail.com: confirmed, password set, onboarded, last sign-in 02:28Z. arpanbohra92@gmail.com: confirmed, password set, not onboarded (test account made during the failed login). cs.priyanandwana@gmail.com: **unconfirmed**, never signed in. |
| 2026-10-18 | Build 1.0.4 (30c08669): sign-in fix + email-link handling + Forgot password | Google tools + signing-key comparison | Pass: 38.2 MB, versionCode 5, 10 permissions, `mymentor` scheme present, **same signing key as 1.0.3** (installs as an update). **Phone result pending.** |
| 2026-10-18 | Auth link parser | `tests/auth-links.test.ts` | 9/9 pass (27/27 total) |
| 2026-10-18 | Web preview of 1.0.4 screens | Browser: sign-in shows "Forgot password?"; empty email prompts; `/auth-callback#error=…otp_expired` shows "That link didn't work / expired or already used"; junk token shows a clear error; `/reset-password` without a session redirects to sign-in | Pass. **Not tested**: a real login → home (needs a real password, which I must not type), real email link round-trip. |
| 2026-10-18 | Accidental BOM added to package.json by PowerShell `Set-Content -Encoding utf8` | Expo dev server crash | Found and fixed immediately; use Write/Edit tools (no BOM) for JSON. |
| 2026-10-18 | The user's phone said "problem parsing the package" for My Mentor 1.0.0 / 1.0.1 | User | Resolved in 1.0.3 (above). Original entry: The APK and link are proven sound, so the cause is on the phone or its installer (OxygenOS install flow, in-app browser, or file path). Next: wireless-debug pairing to install directly and read the real error. |

## Not yet tested
Anything on a real Android device (install, launch, performance, haptics, fonts, sign-in, notifications). AI. Full-day hourly delivery.

| 2026-10-18 | Unit tests after all features | `npm test` | **107 / 107 pass** (habit proposals, goals, push coach, comm lab, compliance dates, delegation advice, couple logic, rewards, reports, mentor JSON modes, reminders extras) |
| 2026-10-18 | Notification planner extras | Unit tests | 1 existing test failed because Sunday now adds a weekly-review reminder; test updated and 3 new tests added. Pass. |
| 2026-10-18 | Habit stats on web with seeded settings | Browser | **Fail → fixed**: the settings row's `createdAt` overwrote the habit's start date (stats showed 0%). Fixed in `habits.ts`; regression test added. |
| 2026-10-18 | Communication Lab on web | Typed answer, scored | Pass; **Fail → fixed**: "+0 vs last try" compared the attempt with itself. |
| 2026-10-18 | Couple Space RLS (3 users) | SQL, rolled back | Pass: outsiders see nothing, no self-accept, wrong code fails, partner can read but not edit/delete/forge, link end hides items |
| 2026-10-18 | Supabase security advisors | `get_advisors` | 6 warnings, all intentional: the couple RPCs, `delete_my_account` and the `in_active_couple` helper are callable by signed-in users by design and scope themselves with `auth.uid()`. Leaked-password protection is a paid feature. |
| 2026-10-18 | Edge Function `mentor` v2 deployed | MCP | ACTIVE. New modes `comm_score`, `goal_plan`, `biz_plan` validated by unit tests; **live calls not tested** (no Gemini key) |
| 2026-10-18 | Web export | `expo export --platform web` | Pass; 12 routes load in the browser with no console errors |