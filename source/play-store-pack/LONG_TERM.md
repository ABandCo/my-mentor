# Long-term plan: nothing to renew

Goal: after handover, the owner never has to log in anywhere, rebuild, or renew anything. This lists every piece that could expire, stop, or change, what protects it, and the honest remaining risks. Status as of 2026-10-18.

## Live addresses (permanent)
| What | Address |
|---|---|
| Web app | https://abandco.github.io/my-mentor/ |
| Download page with QR | https://abandco.github.io/my-mentor/get.html |
| Android file (direct) | https://abandco.github.io/my-mentor/download/My-Mentor.apk |
| Code and files | https://github.com/ABandCo/my-mentor (public, holds the built site only, no source and no secrets) |

## What can expire or stop, and what we did
| Piece | Can it expire? | Protection | Remaining risk |
|---|---|---|---|
| Web app and APK hosting (GitHub Pages) | No expiry. Static files, no server code. | Verified live: page 200, APK 200, byte-identical to the build (SHA-256 701D2F35…6B01). | GitHub could change its free terms or the account could be closed. Mitigation: the full site is also kept in the staging folder and can be re-hosted on any free static host in minutes. |
| Upload sign-in to GitHub | Not used any more. No token was created. | Git signed in through the browser. Nothing stored by the app. | none |
| APK installed on phones | Never expires. Android does not time-limit sideloaded apps. | Signed by the Expo-held key; same key will be used for any update. | If the Expo account is lost, future updates would need a fresh install (data would be backed up in the cloud account). |
| Expo download link | Expires 1 Nov 2026 | **Not used.** The QR now points to GitHub Pages. | none |
| Supabase database (free) | **Pauses after 7 days of no activity.** | Database pings itself every 2 days (pg_cron + pg_net, job `mymentor-keepalive`); checked: the ping returns HTTP 200. The public key it uses expires in 2107. | Not proven yet that Supabase counts this as activity; to be re-checked after a week of no use. If it ever pauses: a paused project can be restored from the dashboard for 90 days with no data loss. The app keeps working on the phone while paused (data is stored locally; only backup, sign-in, Couple Space and AI stop). |
| Gemini free key (AI) | Does not expire by date. | The app works without AI (rules-based coach). | Google can change free limits. Not set up yet (needs the owner's key). |
| Email confirmation / sign-in | n/a | Optional. App works with no account. | Supabase free email sending is rate-limited. |
| Reminders on phone | Scheduled for the next 3 days each time the app opens | Fully on-device, no server. | If the app is not opened for 3 days, reminders stop by design. |

## If something stops (plain steps)
1. App will not open on the phone: reinstall from the QR. Data is safe in the cloud if signed in, otherwise export first (Me, Export).
2. Web page not loading: open https://github.com/ABandCo/my-mentor/settings/pages and check the source is "main / root".
3. "Cloud not reachable" in the app: open the Supabase dashboard, click Restore project.
