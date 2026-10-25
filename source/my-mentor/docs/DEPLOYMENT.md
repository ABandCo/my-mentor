# Deployment (how the APK gets onto your phones)

## Accounts (all free)
- **Expo:** user `arpan25` (office.abandco.ai@gmail.com). Project `@arpan25/my-mentor`, id `8aea392d-e8a7-4e13-8cdd-de96a1b0d606`. Free plan: ~15 Android builds/month, low-priority queue.
- **Supabase:** project `soueweipaljxbpupiqed` (Mumbai, Free).

## Signing key
EAS generated the Android keystore in the cloud on 2026-10-17 and stores it on Expo's servers. It never touched this PC or chat.
**Backup (do once):** expo.dev → my-mentor → Credentials → Android → Download keystore, and save it in a password manager. Losing it means future versions can't install as updates over the existing app.

## Build a new APK
The EAS CLI lives in `tools/` next to the project (not inside it). From the project folder, using the 8.3 short path:
```powershell
$env:EAS_NO_VCS = "1"
node ../tools/node_modules/eas-cli/bin/run build -p android --profile preview --non-interactive --no-wait
```
Profile `preview` (eas.json) produces an installable **.apk** and injects the public Supabase URL + key.
Before each new version, bump `android.versionCode` in app.json.
**Do not set `EAS_PROJECT_ROOT`.** With the "&" in the Windows path it makes the server look for package.json in the wrong folder (build 2a24392c failed in 14 s this way; it didn't count toward quota).

Android output (from `plugins/with-android-release.js`, since v1.0.1): arm64-v8a only, signed v1 + v2, unneeded permissions blocked in app.json. Check any APK with `node tools/inspect-apk.js <file.apk>`.

## Known install issue
On Arpan's OnePlus 10R, v1.0.0 (105 MB, v2-only signature, all ABIs) gave "There was a problem parsing the package" even with the full file present. v1.0.1 changes the signature and size to address this.

## Install on a phone
1. Open the build page link (from expo.dev → my-mentor → Builds) on the phone, or scan its QR code.
2. Tap **Install** / download the .apk.
3. Android asks to allow installs from this source (Chrome/Files): allow it once.
4. Open My Mentor → sign up / sign in → finish onboarding → **allow notifications**.
5. Settings → Apps → My Mentor → Battery → **Unrestricted** (so hourly check-ins aren't delayed).
6. Me → **Send a test notification** to confirm.

## Build history
| Date | Build | Result |
|---|---|---|
| 2026-10-17 | f862ba11-e652-4a55-b6e9-3fbfbc612170 (v1.0.0, versionCode 1) | FINISHED in ~22 min. APK exists (HTTP 200, 105.5 MB): https://expo.dev/artifacts/eas/7YbosMvBDCo6phLFljcWREVLwqWgmdoxtHoB2fQXK0o.apk. Phone: "problem parsing the package" on OnePlus 10R. |
| 2026-10-17 | 2a24392c (v1.0.1, versionCode 2) | ERRORED in 14 s: EAS_PROJECT_ROOT path mix-up. Not counted. |
| 2026-10-17 | 33ee0fb4 (v1.0.1, versionCode 2) | FINISHED (~11 min). Verified: 38.3 MB, 1,355 entries all readable, signed v1+v2, arm64-v8a only, storage/overlay permissions removed. https://expo.dev/artifacts/eas/Hs9UuWWapjmG9M5vXimR-yBmouF60YiCdNl7tg6_YQo.apk. Phone install: "problem parsing the package" on OnePlus 10R (reported twice). Same file installs on Android 14 emulator. |
| 2026-10-18 | b12c7dbc-92a4-4838-8277-1a060f17cb31 (v1.0.2, versionCode 3, **targetSdk 34** via expo-build-properties) | FINISHED. 38.3 MB, passes aapt2/zipalign/apksigner. https://expo.dev/artifacts/eas/LiSxO_kfvDjXRNI4OSoEDLcHDnGaXkxUfGNFwnQFSLs.apk. Backup variant in case the phone's installer dislikes targetSdk 36. Not yet tried on the phone. |
| 2026-10-18 | 822f9edc-9f68-43bc-8ced-17802be64235 (control app "Install Test", package com.arpanbohra.installtest, separate Expo project `mentor-install-test`) | FINISHED. 64.9 MB, empty app, built by the same pipeline. https://expo.dev/artifacts/eas/0WQNTvFobE24wCrzYDz-Z3cta0ro-VY655OcO9kn-iI.apk. Purpose: if the phone installs this but not My Mentor, the problem is in our app; if neither, it's the phone/route. Not yet tried. |
| 2026-10-18 | 38fa1a6d-1944-433c-934e-ccfd2add5a55 (`emulator-local` profile: all CPU types, local-only mode, no cloud sign-in) | FINISHED. https://expo.dev/artifacts/eas/8kPq1iUh3AAPSY2Go3KBU43BgtQRmzBnJkEvsDGatcY.apk. For emulator/notification testing only, not for the phones. |

| 2026-10-18 | 4979590c-1f16-4339-a088-b076fb3daef1 (v1.0.3, versionCode 4, targetSdk 34; removed expo-secure-store; blocked 20 vendor/biometric permissions) | FINISHED. 38.2 MB, passes aapt2/zipalign/apksigner. https://expo.dev/artifacts/eas/-80GUH-BCa88xZuLN2jrscJibw2w97Zb6P8dixVtnt4.apk. Phone result pending. |

| 2026-10-18 | 30c08669-d67c-4e02-bafd-fc0d1e9100e1 (v1.0.4, versionCode 5: sign-in now advances; email-link handling; Forgot password; Resend confirmation) | FINISHED. 38.2 MB, passes Google tools, same signing key as 1.0.3. https://expo.dev/artifacts/eas/9F58nOP23fy5RZsMXh-HtWmWQEko-9wXuhtcqeKqjsg.apk. Phone result pending. |

| 2026-10-18 | 3a016519-ddad-4f09-b73f-824122578ceb (v1.1.0, versionCode 6: **foundation build** with OTA updates, voice recognition, audio, print/share, file system, clipboard, view-shot, network) | FINISHED. 41.1 MB, passes Google tools, same signing key as 1.0.x, update URL https://u.expo.dev/8aea392d-e8a7-4e13-8cdd-de96a1b0d606, channel `preview`, runtimeVersion policy `appVersion` (=1.1.0). https://expo.dev/artifacts/eas/2wSiA-xB7XeOj8Pxx66OngbDaY9PiDwSzsI9De4RsyA.apk. Phone install pending. |

## Over-the-air updates (after 1.1.0 is installed)
JS-only changes (all remaining phases) are published without a new APK:
```powershell
$env:EAS_NO_VCS = "1"; cd my-mentor
node ../tools/node_modules/eas-cli/bin/run update --branch preview --message "<what changed>" --non-interactive
```
The app checks for updates on launch and applies them on the next open. Any change that adds native code, plugins or permissions needs a new build and a bump of `version` (runtime policy `appVersion`).

## Supabase auth settings (project soueweipaljxbpupiqed)
- Site URL: `mymentor://auth-callback`; Redirect URLs: `mymentor://auth-callback` (set 2026-10-18). The app route `src/app/auth-callback.tsx` turns the email link into a signed-in session; `reset-password.tsx` handles recovery links.
- Email confirmation is still ON. Sign-ups are still open to anyone (decide later whether to close them once both spouses have accounts).
- Do not type passwords for users; they set their own via the app's Forgot password flow.

## Install facts learned
- The OnePlus 10R installs the control "Install Test" app from an Expo download link, so the phone/Chrome/link route works. Earlier My Mentor builds failed with "problem parsing the package" even though the same files install on Android 14 (emulator). Fix attempts are in the build history; bisect further if 1.0.3 fails (next suspects: Firebase/notifications stack, router scheme, splash/icon resources).

## Tools kept in the workspace (`tools/`)
`inspect-apk.js` (signature/manifest reader), `get-emulator.ps1` + `emu-test.ps1` (official Android emulator, install + launch + screenshot), `ui.js` (tap/type/screenshot over adb), `qr-pair.ps1` (pair a phone over Wi-Fi by QR), `watch-build.ps1`. SDK pieces live in `%TEMP%\asdk` (build-tools r37, emulator, Android 14 image); they can be re-downloaded with the scripts.
Official Google downloads were checked against Google's published SHA-1 (build-tools, emulator, system image) or Authenticode signature (adb).


---
## Build 1.2.0 (2026-10-18): final package
- EAS build `2bbf5b9f-9bcb-44b9-84bd-850b7bd83789`, profile `preview`, status FINISHED.
- Download (valid until 2026-11-01): https://expo.dev/artifacts/eas/CvaK_effJTdHL8khTw9meoXcIyFhtrL1zpdRtuZJ4LE.apk
- File: `my-mentor-1.2.0.apk`, 45,890,485 bytes, SHA-256 `701D2F35AAB98A0F2912146F897832B57B91EDEC0A73B204CDD3915A286F6B01`.
- Inspected (read-only): package `com.arpanbohra.mymentor`, versionCode 7, versionName 1.2.0, minSdk 24, targetSdk 34, arm64-v8a only, `apksigner verify` passes (v2 scheme). Permissions: internet, notifications, boot, vibrate, microphone, audio settings, wake lock (+ library defaults).
- NOT done: installing it on a real phone and opening it. Previous builds installed fine on the user's phone (1.0.2 test APK confirmed); 1.2.0 is unverified on a device.
- Install over an older version: allowed (same package, higher versionCode, same signing key from EAS).
- Over-the-air updates: from this build on, `eas update --branch preview` reaches 1.2.0 installs silently (runtime version 1.2.0).

### Web version
- Build: `node node_modules/expo/bin/cli export --platform web --output-dir dist-web` (single-page app; needs "serve index.html for every path").
- Verified locally in the built-in browser on 12 routes, no console errors.
- Not yet published. Free options: EAS Hosting (`eas deploy`), Cloudflare Pages, Netlify or Vercel free tiers. Publishing makes it a public URL, so it waits for the owner's go-ahead. Anyone with the link can open it; without an account all data stays in that browser.
- Web limits: no scheduled notifications, hold-to-talk depends on the browser (Chrome works best), data lives in that browser unless signed in.