-- Phase 4-8: document-style collections (goals, planner, communication lab, work log, compliance, XP, badges, habit settings)
-- plus Couple Space (two linked accounts, server-enforced sharing).
-- Every personal table is owner-only via RLS. Couple tables are visible only to the two linked members while the link is active.

-- ---------- 1. Personal document collections ----------
do $$
declare t text;
begin
  foreach t in array array['goals','habit_meta','planner_items','comm_attempts','time_logs','biz_log','compliance_items','xp_events','badges','journal_entries'] loop
    execute format($f$create table public.%I (
      user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
      id text not null,
      data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 20000),
      deleted_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      primary key (user_id, id)
    )$f$, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format($p$create policy "%s_owner_select" on public.%I for select to authenticated using (user_id = (select auth.uid()))$p$, t, t);
    execute format($p$create policy "%s_owner_insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))$p$, t, t);
    execute format($p$create policy "%s_owner_update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))$p$, t, t);
    execute format($p$create policy "%s_owner_delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))$p$, t, t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------- 2. Couple Space ----------
create table public.couples (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid references auth.users(id) on delete cascade,
  invite_code text not null unique,
  status text not null default 'pending' check (status in ('pending','active','ended')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ended_at timestamptz,
  check (user_b is null or user_a <> user_b)
);
create unique index couples_one_open_per_a on public.couples (user_a) where status in ('pending','active');
create unique index couples_one_active_per_b on public.couples (user_b) where status = 'active';

create table public.couple_items (
  couple_id uuid not null references public.couples(id) on delete cascade,
  id text not null,
  author uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('note','gratitude','goal','goal_agree','habit','habit_agree','checkin','reflection','milestone','ritual')),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 8000),
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (couple_id, id)
);

-- Who is in an active couple (helper used by policies; SECURITY DEFINER so policies do not recurse).
create function public.in_active_couple(p_couple uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.couples c
    where c.id = p_couple and c.status = 'active' and (select auth.uid()) in (c.user_a, c.user_b)
  );
$$;
revoke all on function public.in_active_couple(uuid) from public, anon;
grant execute on function public.in_active_couple(uuid) to authenticated;

alter table public.couples enable row level security;
alter table public.couples force row level security;
alter table public.couple_items enable row level security;
alter table public.couple_items force row level security;

create policy couples_member_select on public.couples for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
-- No direct insert/update/delete: all changes go through the RPCs below.

create policy couple_items_member_select on public.couple_items for select to authenticated
  using (public.in_active_couple(couple_id));
create policy couple_items_member_insert on public.couple_items for insert to authenticated
  with check (author = (select auth.uid()) and public.in_active_couple(couple_id));
create policy couple_items_author_update on public.couple_items for update to authenticated
  using (author = (select auth.uid()) and public.in_active_couple(couple_id))
  with check (author = (select auth.uid()) and public.in_active_couple(couple_id));
create policy couple_items_author_delete on public.couple_items for delete to authenticated
  using (author = (select auth.uid()) and public.in_active_couple(couple_id));

revoke all on public.couples, public.couple_items from anon;
grant select on public.couples to authenticated;
grant select, insert, update, delete on public.couple_items to authenticated;

-- Create an invite (consent #1: the inviter). Returns the code to share with the partner in person.
create function public.couple_create_invite() returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_code text; v_try int := 0;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.couples where status in ('pending','active') and v_uid in (user_a, user_b)) then
    raise exception 'already linked or invited';
  end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.couples where invite_code = v_code);
    v_try := v_try + 1; if v_try > 5 then raise exception 'try again'; end if;
  end loop;
  insert into public.couples (user_a, invite_code) values (v_uid, v_code);
  return v_code;
end $$;

-- Accept an invite (consent #2: the partner).
create function public.couple_accept(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_id uuid;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.couples where status in ('pending','active') and v_uid in (user_a, user_b)) then
    raise exception 'already linked or invited';
  end if;
  update public.couples set user_b = v_uid, status = 'active', accepted_at = now()
   where invite_code = upper(trim(p_code)) and status = 'pending' and user_a <> v_uid
   returning id into v_id;
  if v_id is null then raise exception 'invalid or used code'; end if;
  return v_id;
end $$;

-- Either member can end the link at any time. Shared items become invisible to both immediately.
create function public.couple_end() returns void
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  update public.couples set status = 'ended', ended_at = now()
   where status in ('pending','active') and v_uid in (user_a, user_b);
end $$;

-- Partner's display name only (never anything else from their profile).
create function public.couple_partner_name() returns text
language sql stable security definer set search_path = '' as $$
  select p.display_name from public.couples c
  join public.profiles p on p.user_id = case when c.user_a = (select auth.uid()) then c.user_b else c.user_a end
  where c.status = 'active' and (select auth.uid()) in (c.user_a, c.user_b) limit 1;
$$;

revoke all on function public.couple_create_invite(), public.couple_accept(text), public.couple_end(), public.couple_partner_name() from public, anon;
grant execute on function public.couple_create_invite(), public.couple_accept(text), public.couple_end(), public.couple_partner_name() to authenticated;
