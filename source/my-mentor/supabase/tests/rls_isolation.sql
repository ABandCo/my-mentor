-- Two-user isolation test. Runs inside a transaction and ROLLS BACK: leaves no data behind.
-- Returns one row per check with pass = true/false.
begin;

create temp table results (check_name text, pass boolean) on commit drop;
grant all on results to authenticated;

insert into auth.users (id, email, aud, role, instance_id)
values ('00000000-0000-0000-0000-00000000000a', 'rls-a@test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
       ('00000000-0000-0000-0000-00000000000b', 'rls-b@test.invalid', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

insert into results select 'profile trigger created both profiles', count(*) = 2 from public.profiles
  where user_id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');

-- Act as user A
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
insert into public.habits (id, name) values ('h1', 'A private habit');
insert into public.habit_logs (habit_id, day, status) values ('h1', '2026-10-17', 'done');
insert into public.day_plans (day, one_thing) values ('2026-10-17', 'A secret plan');
insert into results select 'A sees own habit', count(*) = 1 from public.habits;
insert into results select 'A sees only own profile', count(*) = 1 from public.profiles;

-- A tries to write a row owned by B
do $$ begin
  insert into public.habits (user_id, id, name) values ('00000000-0000-0000-0000-00000000000b', 'evil', 'planted');
  insert into results values ('A cannot insert as B', false);
exception when insufficient_privilege or check_violation then
  insert into results values ('A cannot insert as B', true);
end $$;

-- Act as user B
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
insert into results select 'B cannot read A habits', count(*) = 0 from public.habits;
insert into results select 'B cannot read A logs', count(*) = 0 from public.habit_logs;
insert into results select 'B cannot read A day plans', count(*) = 0 from public.day_plans;
insert into results select 'B sees only own profile', count(*) = 1 from public.profiles;
with u as (update public.habits set name = 'hacked' where id = 'h1' returning 1)
  insert into results select 'B cannot update A habit', count(*) = 0 from u;
with d as (delete from public.day_plans returning 1)
  insert into results select 'B cannot delete A day plan', count(*) = 0 from d;

-- Anonymous (signed out)
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  perform count(*) from public.habits;
  insert into results select 'anon reads nothing', (select count(*) = 0 from public.habits);
exception when insufficient_privilege then
  insert into results values ('anon reads nothing', true);
end $$;

reset role;
insert into results select 'A data intact after B attempts', (select name = 'A private habit' from public.habits where id = 'h1')
  and (select count(*) = 1 from public.day_plans where one_thing = 'A secret plan');

select * from results;
rollback;
