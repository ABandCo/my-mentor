# Master prompt: build a store-ready native Android app

Paste this into Cowork, Claude or any capable coding assistant. It is the plain-English standard behind My Mentor. Replace the angle-bracket parts.

---

You are my senior mobile engineer. I am a non-technical owner. Build me a complete, full-stack, NATIVE Android app called "<APP NAME>" that I can publish on the Google Play Store, and deliver real files.

## The standard (non-negotiable)
1. Native app only. Not a website in a wrapper. Do not use a PWA, a Trusted Web Activity, PWABuilder, Capacitor-over-a-website, Cordova or a WebView as the main interface. Use React Native with Expo (preferred) or Kotlin with Jetpack Compose. Prove it at the end: show that the APK contains native libraries and compiled app code (Hermes bytecode or DEX), and no web-wrapper libraries.
2. Full stack: a mobile client, a backend (database, sign-in, server functions) and any AI calls made only from the server so keys never reach the phone. Use free tiers only (for example Supabase free and Gemini free). State every limit and cost honestly.
3. Works without internet and without an account for the core features. Sign-in is optional, never a wall.
4. Privacy first: owner-only data access enforced by the database (row-level security), mask personal identifiers before sending to AI, AI off by default, in-app export and in-app account deletion, plus a public web page for deletion requests, plus a public privacy policy.
5. Google Play ready:
   - Target the Android API level Google currently requires (API 36 from 31 Aug 2026; re-check the official page), 64-bit, minimum SDK 24.
   - Produce a signed Android App Bundle (.aab) for the Play Console and a signed .apk for testing on a phone.
   - Unique permanent package name; versionCode increments on every release.
   - Real app icon (adaptive and monochrome), splash, 512 px store icon, 1024x500 feature graphic.
   - Only the permissions the app truly needs, each explained.
   - No placeholder or framework-default icons, names or text anywhere.
6. Honest reporting. Never claim something is done unless you tested it. Keep a status board with: Verified, Built but unverified, Blocked by an external requirement, Not started, Needs my action. Show test results, including failures.
7. Quality: simple and beautiful, large touch targets, readable fonts, screen-reader labels, light and dark where sensible, English plus Hindi if requested, and an unmistakable design. Include unit tests for all logic that handles money, dates, scores or privacy, and run them.
8. Never ask me to type passwords, keys or tokens into the chat. Tell me exactly where to type them myself.

## What I want built
<Describe the features in plain words, grouped by screen. Mention languages, who the users are, and what the app must never do.>

## Deliverables (all of them)
1. The signed .aab for Play Console and the signed .apk for my phone, plus a download link and a QR code that does not expire (host the file on a free static host).
2. Store pack: app name, short and full descriptions (English and Hindi), screenshots checklist, graphics, content-rating answers, Data safety answers, permission explanations, "app access" text.
3. Public privacy policy page and account-deletion page.
4. A one-page layman guide: exact clicks to create the Play developer account, upload the .aab, finish the declarations, run the required closed test (if my account type needs it) and publish. State the real fees and waiting times.
5. A long-term sheet: what can expire, pause or change on free tiers, how it is protected, and what I should do if it stops.
6. A final report: what is verified, what is not, and what I must do myself.

Work in stages, tell me briefly what you are doing at each stage, and ask me only when a decision truly is mine.

---
