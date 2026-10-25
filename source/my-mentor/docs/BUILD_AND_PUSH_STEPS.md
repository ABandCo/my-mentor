# Build the new app and switch on server nudges: simple steps

Everything here is click-by-click. You do each part once. Nothing here needs coding.

## Part A. Make the new app file (APK), about 10 minutes of your time

1. Open https://expo.dev and sign in (your account is **arpan25**, project **my-mentor**).
2. Click your **profile picture → Access tokens → Create token**. Name it `github`. Copy the token (it is shown once).
3. Open https://github.com/ABandCo/my-mentor → **Settings → Secrets and variables → Actions → New repository secret**.
   Name: `EXPO_TOKEN`  Value: the token you copied. Save.
4. Open the **Actions** tab → **Build Android APK** → **Run workflow** → choose **preview** → **Run workflow**.
   The tests run first. If they pass, the build starts on Expo's servers.
5. Go to https://expo.dev → project **my-mentor → Builds**. In about 15 to 30 minutes the new build shows **Finished**. Open it and use **Install** (QR code) on your phone, or download the APK.
6. Send the same APK to Priya. On her phone: **Settings → Discipline & nudges → Priya**, and she switches nudges on herself.

If a step shows an error, take a screenshot and send it to me.

## Part B. Switch on nudges that arrive even when the app is not opened

The server side is already live and working: a timer in your Supabase project runs every 15 minutes and sends each person their own nudges. Android phones need one extra free setup from Google (Firebase) so the messages can reach the phone. Without it the app still works and sends its nudges from the phone itself (for the next 2 to 3 days after each open).

1. Open https://console.firebase.google.com → **Add project** → name it `my-mentor` → continue (you can turn Google Analytics off) → create.
2. In the project, click the **Android icon** (Add app). Android package name: `com.arpanbohra.mymentor`. Click **Register app**. Click **Download google-services.json**. Skip the remaining steps.
3. Click the **gear icon → Project settings → Service accounts → Generate new private key → Generate key**. A JSON file downloads. Keep it private: it is a password for sending messages.
4. Go to https://expo.dev → project **my-mentor → Credentials → Android → (your application id) → Service Credentials → FCM V1 service account key → Add a service account key** → upload the JSON file from step 3.
5. Also on expo.dev: project **my-mentor → Environment variables → Create**. Name `GOOGLE_SERVICES_JSON`, visibility **Secret**, type **File**, upload the `google-services.json` from step 2. Environments: Preview, Production.
6. Run **Part A** again to make a new APK, and install it.
7. In the app: sign in, open **Settings → Discipline & nudges → switch nudges on**. If everything is right, nudges now come from the server.

Safe to know:
- Only people who chose Arpan or Priya **and** switched nudges on get anything.
- Nothing is sent before 6 AM or after 11 PM India time, and not while the app is open.
- If nudges are ignored, they slow down by themselves. After many ignored ones it is at most one every 3 hours, never a flood.

## Part C. Google Calendar (optional, do later)

It needs a Google Cloud project and a Google sign-in setup. Skip it for now. When you are ready, follow `docs/GOOGLE_CALENDAR.md` and send me the two IDs it produces.

## Part D. Update the website version (needs your OK)

The web version at https://abandco.github.io/my-mentor/ is the old build. I can prepare the new web build and the APK download file as a pull request for you to approve. Say "update the website" when you want it.
