# Google Calendar sync: setup (one time, about 20 minutes)

The app code is ready (`src/lib/calendar.ts`, `src/components/calendar-card.tsx`). It is unit-tested against a fake Google, but **not yet run against the real Google Calendar**. Until you add the two client IDs below, Settings shows "Setup baaki hai" instead of a Connect button.

## Steps
1. Open https://console.cloud.google.com and create a project named **My Mentor** (use the Gmail you run the business with).
2. **APIs & Services → Library →** search **Google Calendar API → Enable**.
3. **Google Auth Platform (OAuth consent screen):** user type **External**; app name *My Mentor*; support email; developer contact email.
   - **Data access → Add scope:** `https://www.googleapis.com/auth/calendar.events`
   - **Audience → Test users:** add Arpan's and Priya's Gmail addresses (up to 100). Keep the app in **Testing** at first.
4. **Credentials → Create credentials → OAuth client ID → Android:**
   - Package name: `com.arpanbohra.mymentor`
   - SHA-1: the signing key of the build you install. For EAS builds run `eas credentials` (Android → your keystore) and copy the SHA-1. If you publish through Google Play with Play App Signing, create a **second** Android client with the SHA-1 from Play Console → App integrity → App signing.
5. **Create credentials → OAuth client ID → Web application** (for the web version):
   - Authorized JavaScript origin: `https://abandco.github.io`
   - Authorized redirect URI: `https://abandco.github.io/my-mentor/`
6. Put the client IDs in the build environment (EAS secrets or `.env`, never committed):
   - `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<android client id>`
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client id>`
7. Rebuild the app. In Settings → Google Calendar → **Connect Google Calendar**, sign in, allow calendar events, then **Sync now**.

## What review is needed (corrects the earlier note)
- `calendar.events` is a **sensitive scope**. While the consent screen is in **Testing**, no Google review is needed, but sign-ins expire after 7 days (reconnect weekly) and only listed test users can connect. That is fine for two people.
- To remove the 7-day expiry or to let anyone connect, publish the consent screen and pass **Google's OAuth app verification** (privacy policy URL, a short demo video, justification of the scope). This is Google's review, not the Play Store's.
- Separately, if the app is on Google Play, update the **Data safety** form to say calendar events are read and written with the user's permission.

## How the sync behaves
- Window: today to 14 days ahead. Timed planner items become timed events (duration from the item, default 30 minutes); untimed items become all-day events.
- New events made in Google appear in the planner as items marked from Google; new planner items are created in Google.
- If both sides were edited, the newer edit wins. Deleting in one place deletes in the other. Items outside the window are never touched.
- Only event data is read or written. Nothing from the calendar is sent to the AI.
