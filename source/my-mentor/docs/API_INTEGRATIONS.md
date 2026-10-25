# API integrations

| Provider | Status | Notes |
|---|---|---|
| Supabase | Verified (connection) | Project `soueweipaljxbpupiqed`, Mumbai, Free. Auth: email + password with email confirmation. Sign-in round trip not yet tested with a real account. |
| Google Gemini (free tier) | Needs my action | Get key at aistudio.google.com → "Get API key". Free tier: Flash-class models; content may be used by Google to improve products. |
| Anthropic Claude | Disabled | Adapter only; requires approved paid API. |
| OpenAI | Disabled | Adapter only. |
| Perplexity | Disabled | Adapter only. |
| Expo Push | Not started | Needs FCM credential from a free Firebase project. |


## Edge Function modes (v2)
`chat`, `plan_day`, `extract`, `weekly_review`, plus `comm_score` (5-criterion scoring + rewrite), `goal_plan` (milestones) and `biz_plan` (weekly business plan). All return validated JSON or an honest error code; the app falls back to rules-based versions. Voice uses the phone's own speech recogniser and TTS (no paid API).