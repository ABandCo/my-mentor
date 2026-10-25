# How to put My Mentor on the Google Play Store (plain steps)

## First, two facts
1. **My Mentor is already a real native Android app.** It is not a website in a box. The file contains Android native libraries and compiled app code, and no web-wrapper parts (checked, see the report). So you do **not** need PWABuilder, and the "web apps get rejected" worry does not apply. The web version on GitHub is just an extra way to open it.
2. **Play Store wants an .aab file, not .apk.** The .aab is the file you upload. The .apk is for installing directly on a phone. Both are in this pack.

## What it costs (honest)
- Google Play developer account: **one-time fee of about USD 25** (about Rs 2,100). This is the only unavoidable cost, and it is not free. Everything else we use is free.
- Free alternatives that need no Google account: share the QR / link (what you have now). Other app stores (Samsung Galaxy Store, Amazon Appstore, Huawei AppGallery) have their own sign-up rules; check each one's current fee before relying on them.

## Choose your account type (this matters)
| | Personal account | Organization account |
|---|---|---|
| Who it is | You as an individual | Arpan Bohra & Co. as a business |
| Extra needs | ID verification | ID verification plus a **D-U-N-S number** (free from Dun & Bradstreet, can take days to weeks) and a business website |
| Required test before going public | **Yes: 12 testers must stay opted in for 14 days in a closed test** (accounts created after 13 Nov 2023) | Widely reported as not required. Check Google's page when you sign up. |
| Developer name shown | Your name | Your firm's name |
Recommendation: the Organization account, because the firm already exists and avoids the 14-day tester gate. If you go Personal, gather 12 to 15 people (staff, family, friends) with Gmail addresses before you start.

## Steps
1. **Create the developer account** at play.google.com/console and pay the fee. You do this yourself (it needs your ID and payment).
2. **Create app**: name "My Mentor: Habits and Growth", English (India), App, Free. Accept the declarations.
3. **Fill the "Set up your app" tasks** by copy-paste from `LISTING.md`: privacy policy URL, ads (none), app access, content rating, target audience (18+), Data safety, health apps declaration if shown.
4. **Store listing**: paste the descriptions, upload `play-icon-512.png`, `play-feature-graphic-1024x500.png` and 4 to 8 phone screenshots (take them from the test APK on your phone).
5. **Upload the bundle**: Testing > Internal testing (or Closed testing) > Create release > upload `My-Mentor-1.3.0.aab`. Let Google manage the signing key ("Play App Signing": accept the default).
6. **Test first**: add yourself and your wife as testers, install from the Play link, check sign-in, reminders and voice.
7. **Personal account only**: run the closed test with 12+ testers for 14 days, then click "Apply for production access" in the dashboard.
8. **Production**: Production > Create release > choose the same bundle > send for review. First reviews usually take a few days.

## After it is live
- Updates: increase the version number, make a new .aab, upload it. (Ask your assistant; this is one command.)
- Nothing in the app needs renewing. See `docs/LONG_TERM.md` for the one thing to watch (the free database pause) and what protects it.

## Things only you can do
- Pay the fee and verify identity with Google.
- Decide the public contact email (the pack uses office.abandco.ai@gmail.com).
- Take the screenshots, and add testers.
- Add your Gemini key to the server if you want the AI mentor live (the app runs without it).
