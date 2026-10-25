# Security & privacy

## Rules (enforced as the build progresses)
- Every table has Row Level Security: a user can read/write only rows where `user_id = auth.uid()`. Couple-shared rows additionally require an active consent row from **both** spouses.
- No AI or service keys in the app. Only the public Supabase URL + anon key ship in the APK; everything else is an Edge Function secret.
- Logs never contain conversation, journal or health content.
- Voice audio is transcribed on the device and discarded; transcript retention is user-controlled.
- Sensitive categories (health, family, journal, couple) are not sent to AI unless the user turns that on. Client names are replaced with placeholders. Entries can be flagged "never send to AI".
- Release keystore is generated and stored by EAS; never committed, never pasted in chat. Backup: download from expo.dev → Project → Credentials, store in a password manager.

## Hardening checklist (Phase 9)
- [ ] RLS test: user A cannot select/update user B rows
- [ ] RLS test: revoked couple share invisible
- [ ] Secrets scan of repo
- [ ] Rate limits + daily AI caps per user
- [ ] Export produces complete JSON; delete removes all rows + auth user


## 1.2.0 additions
- Document collections (`goals`, `habit_meta`, `planner_items`, `comm_attempts`, `time_logs`, `biz_log`, `compliance_items`, `xp_events`, `badges`, `journal_entries`): owner-only RLS, forced, anon revoked.
- Couple Space: `couples` readable only by its two members; no direct writes (RPCs only). `couple_items` readable only while the link is active; only the author can write. Ending the link hides everything for both. Tested with 3 users.
- Nothing from the personal journal or Krishna chats is sent to Couple Space. Only what a person posts there.
- No sign-in wall: without an account, all data stays on the device. AI needs an account (the Gemini key lives only in the server function).
- Advisor warnings (SECURITY DEFINER RPCs callable by signed-in users) are intentional and each function checks `auth.uid()`.