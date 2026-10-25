# Building the APK on GitHub (no Expo, no Firebase)

**How it works:** pushing app code to the working branch (or Actions → *Build Android APK* → *Run workflow*) builds the app on GitHub's machines (about 11 minutes of compile) and attaches `My-Mentor.apk` to the run as the download **My-Mentor-APK** (a zip with the APK inside; kept 30 days).

**Download:** github.com/ABandCo/my-mentor → *Actions* → the latest green *Build Android APK* run → *Artifacts* → **My-Mentor-APK**. You must be signed in to GitHub. Unzip, then install `My-Mentor.apk`.

**Signing key:** created on the first build and kept only in GitHub's private build cache (key `mm-signing-v2`), never in the repo; its password is masked in logs. Same key = the app updates in place. GitHub clears caches not used for 7 days: if that happens the next build makes a new key and the phones need one reinstall. To make the key permanent, store it as repository secrets and extend the workflow (ask for this when you want it).

**Checked on the 1.4.0 build:** package com.arpanbohra.mymentor, versionCode 9, targetSdk 34, APK Signature Scheme v2 verified. Scheme v1 is off (Android 7+ does not need it). If a phone ever shows "problem parsing the package", ask for a re-sign with v1 enabled.

**Nudges:** without Firebase, nudges are scheduled on the phone for the 3 days after each app open. The server nudge function stays dormant (it only sends to phones registered through Expo push).
