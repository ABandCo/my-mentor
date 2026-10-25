-- My Mentor — core schema (Phase 2)
-- Every table is private per user, enforced by Row Level Security in the database.

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  language text not null default 'en' check (language in ('en','hi','hinglish')),
  coaching_style text not null default 'strict'
    check (coaching_style in ('strict','balanced','gentle','reflective','communication','business')),
  focus_areas text[] not null default '{accountability,communication,practice,health}',
  wake_time time not null default '06:30',
  sleep_time time not null default '22:30',
  intensive_start time not null default '09:00',
  intensive_end time not null default '20:00',
  quiet_start time not null default '22:30',
  quiet_end time not null default '06:30',
  timezone text not null default 'Asia/Kolkata',
  ai_consent_general boolean not null default false,
  ai_consent_sensitive boolean not null default false,
  baselines jsonb not null default '{}'::jsonb, -- only numbers the user typed; never estimated
  onboarded_at timestamptz,
  xp integer not null default 0 check (xp >= 0),
  updated_at timestamptz not null default now()
);

create table public.habits (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  name text not null check (length(name) between 1 and 120),
  emoji text not null default '✨',
  target text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.habit_logs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id text not null,
  day date not null,
  status text not null check (status in ('done','partial','missed','rest','na')),
  miss_reason text,
  updated_at timestamptz not null default now(),
  primary key (user_id, habit_id, day),
  foreign key (user_id, habit_id) references public.habits(user_id, id) on delete cascade
);

create table public.day_plans (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  one_thing text,
  one_thing_done boolean not null default false,
  mood smallint check (mood between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table public.hour_checkins (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  hour smallint not null check (hour between 0 and 23),
  plan text not null default '',
  status text check (status in ('done','partly','missed')),
  answered_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, day, hour)
);

create table public.commitments (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null,
  text text not null check (length(text) between 1 and 500),
  due timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Row Level Security: owner-only on every table.
do $$
declare t text;
begin
  foreach t in array array['profiles','habits','habit_logs','day_plans','hour_checkins','commitments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format($p$create policy "%s_owner_select" on public.%I for select to authenticated using (user_id = (select auth.uid()))$p$, t, t);
    execute format($p$create policy "%s_owner_insert" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))$p$, t, t);
    execute format($p$create policy "%s_owner_update" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))$p$, t, t);
    execute format($p$create policy "%s_owner_delete" on public.%I for delete to authenticated using (user_id = (select auth.uid()))$p$, t, t);
  end loop;
end $$;

-- Explicit API grants: signed-in users only (RLS still limits them to their own rows); nothing for anonymous.
revoke all on public.profiles, public.habits, public.habit_logs, public.day_plans, public.hour_checkins, public.commitments from anon;
grant select, insert, update, delete on public.profiles, public.habits, public.habit_logs, public.day_plans, public.hour_checkins, public.commitments to authenticated;

-- Profile row is created automatically at sign-up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Full self-service deletion (used by Settings → Delete my data).
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
