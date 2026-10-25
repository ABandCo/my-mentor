# Build report: My Mentor 1.3.0 (2026-10-25)

## Files
| File | Size | SHA-256 |
|---|---|---|
| My-Mentor-1.3.0.aab (upload to Play Console) | 41,252,090 | 951B1172C4E7294A7AC16821DE0FB6D485E3237BD8F12044D61EB08C012CC040 |
| My-Mentor-1.3.0.apk (install on a phone) | 45,959,503 | 256BDE6E4AE98DDC4FD80FCCBCC6D3BCF32634EFB739F6BE5E9944D3CE52B7B2 |

## Checked
- Native, not web: the APK holds native libraries (Hermes engine, JSI, Expo modules; arm64-v8a) and a compiled Hermes bytecode bundle (header C6 1F BC 03 C1 03 19 1F). No Custom Tabs or Trusted Web Activity libraries. The AAB holds the same bundle (same header) and the Hermes library.
- Manifest of the APK: package com.arpanbohra.mymentor, versionName 1.3.0, versionCode 8, minSdk 24, targetSdk 36 (Google's requirement for new apps from 31 Aug 2026), signed with the v2 scheme.
- 107 of 107 unit tests passed before the build. Typecheck clean.
- Web version re-exported with the new icon and privacy links.

## Not checked
- Installing and opening this build on a real phone (earlier builds installed; this one not yet).
- The AAB's own manifest was not read independently; it was built by the same profile as the APK (targetSdk 36).
- Google Play review itself, and Gemini AI (needs your free key).
- Whether Supabase counts the self-ping as activity.