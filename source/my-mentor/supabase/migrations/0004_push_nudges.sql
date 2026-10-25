-- Server-sent nudges: phone registrations, a send log, and a 15-minute schedule that calls the `nudge` Edge Function.
-- Everything is owner-only. The cron secret lives in Vault and is read by the function itself (never in a request body or in the app).

-- ---------- 1. Phones registered for push ----------
create table public.push_devices (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token text not null check (length(token) < 300),
  platform text,
  last_open_at timestamptz not null default now(),
  last_sent_at timestamptz,
  sent_since_open integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);
alter table public.push_devices enable row level security;
alter table public.push_devices force row level security;
create policy push_devices_owner_select on public.push_devices for select to authenticated using (user_id = (select auth.uid()));
create policy push_devices_owner_insert on public.push_devices for insert to authenticated with check (user_id = (select auth.uid()));
create policy push_devices_owner_update on public.push_devices for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy push_devices_owner_delete on public.push_devices for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.push_devices from anon;
grant select, insert, update, delete on public.push_devices to authenticated;

-- ---------- 2. What was already sent (idempotency for fixed prompts, daily cap, partner pushes) ----------
create table public.push_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.push_log enable row level security;
alter table public.push_log force row level security;
-- No policies on purpose: only the service role (the Edge Function) reads or writes this table.
revoke all on public.push_log from anon, authenticated;

-- ---------- 3. Cron secret in Vault, readable only by the service role ----------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'nudge_cron_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'nudge_cron_secret', 'Shared secret between pg_cron and the nudge Edge Function');
  end if;
end $$;

create or replace function public.get_nudge_secret() returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'nudge_cron_secret' limit 1;
$$;
revoke all on function public.get_nudge_secret() from public, anon, authenticated;
grant execute on function public.get_nudge_secret() to service_role;

-- ---------- 4. Schedules ----------
select cron.schedule(
  'mymentor-nudges',
  '*/15 * * * *',
  $$ select net.http_post(
       url := 'https://soueweipaljxbpupiqed.supabase.co/functions/v1/nudge',
       headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'nudge_cron_secret' limit 1)),
       body := '{}'::jsonb,
       timeout_milliseconds := 25000
     ) $$
);
select cron.schedule('mymentor-push-log-cleanup', '23 2 * * *', $$ delete from public.push_log where sent_at < now() - interval '14 days' $$);
