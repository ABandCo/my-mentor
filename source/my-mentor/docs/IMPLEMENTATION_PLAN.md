# Implementation plan

One complete release, built in ordered phases. A phase is "done" only when its checks in TEST_REPORT.md pass.

| Phase | Scope | Exit check |
|---|---|---|
| 1 Foundation | Environment, scaffold, docs, design tokens, architecture | Docs exist; app renders |
| 2 Core app | Supabase project (Mumbai), auth for 2 users, profiles, RLS, sync of local store, onboarding, Home, goals, habits detail, daily planner | Two accounts cannot read each other's rows (SQL test) |
| 3 AI mentor | Provider interface + Gemini adapter in Edge Function; disabled Claude/OpenAI/Perplexity adapters; router; memory; summaries + action extraction; quota meter; offline fallback | Real authorised Gemini call; quota-exhausted path tested |
| 4 Voice + Communication Lab | On-device STT/TTS en-IN/hi-IN; scenario library; fixed rubric; retry; trends | Same answer scores consistently across 3 runs |
| 5 Accountability | Local hourly schedule within window, quiet hours, pause modes; server push via pg_cron → Edge Function → Expo Push; receipts | Notification received on real phone; delivery recorded |
| 6 Work & Business | Venture dashboards, pipeline board, follow-up alerts, weekly plan, monthly review, anonymised client names | Metrics computed from entered data only |
| 7 Couple Space | Consent-based sharing, Sharing Controls, revoke | RLS test: revoked items invisible to spouse |
| 8 Reports + gamification | Weekly/monthly/30-day reports, "How this is calculated", PDF export, badges, Weekly Wins | Calculation unit tests pass |
| 9 Hardening | Security review, a11y, perf on mid-range phone, failure handling, export/delete | Checklist in SECURITY.md complete |
| 10 Android build | EAS signed APK, install on both phones | APK file exists, installs, launches, notification received |
