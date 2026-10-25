-- Couple Space sharing rules. Run in the Supabase SQL editor (or execute_sql). Everything rolls back: the block ends by
-- raising ALL_COUPLE_RLS_TESTS_PASSED, which is the success signal. Any other error message is a failing check.
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
 code text; cid uuid; n int;
begin
  insert into auth.users (id, instance_id, aud, role, email) values
   (a,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.invalid'),
   (b,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.invalid'),
   (c,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','c@test.invalid');
  perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true);
  execute 'set local role authenticated';
  code := public.couple_create_invite();                                  -- A invites
  reset role; perform set_config('request.jwt.claims', json_build_object('sub',c,'role','authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into n from public.couples; if n<>0 then raise exception 'FAIL outsider sees couple'; end if;
  reset role; perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true); execute 'set local role authenticated';
  begin perform public.couple_accept(code); raise exception 'FAIL self accept'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  select id into cid from public.couples where user_a=a;
  begin insert into public.couple_items(couple_id,id,kind) values (cid,'x','note'); raise exception 'FAIL insert while pending'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  reset role; perform set_config('request.jwt.claims', json_build_object('sub',b,'role','authenticated')::text, true); execute 'set local role authenticated';
  begin perform public.couple_accept('WRONG123'); raise exception 'FAIL wrong code'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  perform public.couple_accept(code);                                     -- B accepts: the second consent
  insert into public.couple_items(couple_id,id,kind,data) values (cid,'n1','note','{"t":"hi"}');
  reset role; perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into n from public.couple_items; if n<>1 then raise exception 'FAIL A cannot see B item'; end if;
  update public.couple_items set data='{"t":"hacked"}' where id='n1'; get diagnostics n = row_count; if n<>0 then raise exception 'FAIL A edited B item'; end if;
  delete from public.couple_items where id='n1'; get diagnostics n = row_count; if n<>0 then raise exception 'FAIL A deleted B item'; end if;
  begin insert into public.couple_items(couple_id,id,kind,author) values (cid,'f1','note',b); raise exception 'FAIL forged author'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  reset role; perform set_config('request.jwt.claims', json_build_object('sub',c,'role','authenticated')::text, true); execute 'set local role authenticated';
  select count(*) into n from public.couple_items; if n<>0 then raise exception 'FAIL outsider sees items'; end if;
  begin insert into public.couple_items(couple_id,id,kind) values (cid,'z','note'); raise exception 'FAIL outsider insert'; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  begin update public.couples set user_b=c; get diagnostics n = row_count; if n<>0 then raise exception 'FAIL direct update couples'; end if; exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
  reset role; perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true); execute 'set local role authenticated';
  perform public.couple_end();                                            -- either person can end the link
  select count(*) into n from public.couple_items; if n<>0 then raise exception 'FAIL items visible after end'; end if;
  reset role;
  raise exception 'ALL_COUPLE_RLS_TESTS_PASSED';
end $$;
