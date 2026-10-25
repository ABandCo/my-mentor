-- Phase 3: Krishna (AI mentor) — memory, session summaries, free-quota meter.
-- Owner-only RLS on everything. Usage counters are written only by the Edge Function (service role).

create table public.mentor_memory (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  kind text not null check (kind in ('fact','goal','preference','obstacle','lesson','decision','priority','commitment')),
  text text not null check (length(text) between 1 and 400),
  source text not null default 'user' check (source in ('user','mentor','session')),
  confirmed boolean not null default true,
  never_send_ai boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.mentor_sessions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  mode text not null default 'chat' check (mode in ('chat','plan_day','weekly_review','procrastination','review')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  summary text check (summary is null or length(summary) <= 2000),
  actions jsonb not null default '[]'::jsonb,
  message_count integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  requests integer not null default 0,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  primary key (user_id, day)
);

do $$
declare t text;
begin
  foreach t in array array['mentor_memory','mentor_sessions','ai_usage'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format($p$create policy "%s_owner_select" on public.%I for select to authenticated using (user_id = (select auth.uid()))$p$, t, t);
  end loop;
  foreach t in array array['mentor_memory','mentor_sessions'] loop
    execute format($p$create policy "%s_owner_insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))$p$, t, t);
    execute format($p$create policy "%s_owner_update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))$p$, t, t);
    execute format($p$create policy "%s_owner_delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))$p$, t, t);
  end loop;
end $$;

revoke all on public.mentor_memory, public.mentor_sessions, public.ai_usage from anon;
grant select, insert, update, delete on public.mentor_memory, public.mentor_sessions to authenticated;
grant select on public.ai_usage to authenticated;   -- read-only for users: they cannot reset their own counter

-- Called only by the Edge Function (service role) after each AI call.
create function public.bump_ai_usage(p_user uuid, p_in integer, p_out integer) returns void
language sql security definer set search_path = '' as $$
  insert into public.ai_usage (user_id, day, requests, tokens_in, tokens_out)
  values (p_user, (now() at time zone 'Asia/Kolkata')::date, 1, greatest(p_in,0), greatest(p_out,0))
  on conflict (user_id, day) do update
    set requests = public.ai_usage.requests + 1,
        tokens_in = public.ai_usage.tokens_in + greatest(p_in,0),
        tokens_out = public.ai_usage.tokens_out + greatest(p_out,0);
$$;
revoke all on function public.bump_ai_usage(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.bump_ai_usage(uuid, integer, integer) to service_role;
