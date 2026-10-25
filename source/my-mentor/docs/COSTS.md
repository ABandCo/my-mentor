# Costs — target ₹0 per month

Figures come from 2026 sources and change often. Re-check the official pricing pages before relying on them.

| Service | Use | Free-tier limit (approx.) | What happens at the limit | Card needed? | How we monitor |
|---|---|---|---|---|---|
| Supabase Free | Database, sign-in, edge functions, cron | 2 projects, 500 MB DB, 1 GB files, 5 GB egress, ~500k function calls/month; **pauses after 7 days idle** | Writes may be restricted; paused project must be restored from dashboard | No | Supabase dashboard usage page; weekly keep-alive |
| Google Gemini API (free tier) | Mentor AI | Flash-class models only; roughly 15 requests/min and ~1,500/day (varies by model; check AI Studio) | Requests fail with "429"; app falls back to offline mode | No | In-app free-quota meter + per-user daily caps |
| Expo EAS Build (Free) | Building the APK | ~15 Android builds/month, low-priority queue | Wait until next month or use GitHub Actions | No | expo.dev account usage page |
| Expo Push Service | Server push delivery | Free | — | No | Delivery receipts stored in DB |
| Firebase (Spark plan) | Only the FCM push credential | Free | — | No | — |
| GitHub | Source code | Free private repos | — | No | — |
| Fonts (Fraunces, Plus Jakarta Sans, Noto Sans Devanagari) | Typography | Open licence (OFL) | — | No | — |

## One-time vs recurring
| Item | One-time | Recurring |
|---|---|---|
| Everything above | ₹0 | ₹0 |

## Biggest risks to staying free
1. **Gemini free quota** being cut or changed (it was reduced in April 2026). Mitigation: daily caps, offline mode, quota meter.
2. **Supabase auto-pause** after 7 idle days. Mitigation: hourly cron activity + weekly keep-alive.
3. **EAS build limit**. Mitigation: build only at checkpoints; GitHub Actions fallback.

Nothing in this list will be upgraded or billed without written approval.
