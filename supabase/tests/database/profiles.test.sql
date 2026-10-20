-- Tests for B-2: profile auto-creation and RLS on profiles.
-- Runs on the LOCAL database only, and everything is rolled back at the end.
 
begin;
create extension if not exists pgtap with schema extensions;
select plan(5);
 
-- Pretend five people sign up.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'hari@test.com',   '{"display_name": "Hari"}'),
  ('22222222-2222-2222-2222-222222222222', 'angel@test.com',  '{"display_name": "Angel"}'),
  ('33333333-3333-3333-3333-333333333333', 'sohum@test.com',  '{"display_name": "Sohum"}'),
  ('44444444-4444-4444-4444-444444444444', 'manan@test.com',  '{"display_name": "Manan"}'),
  ('55555555-5555-5555-5555-555555555555', 'paarth@test.com', '{"display_name": "Paarth"}');
 
-- Test 1: every sign-up got a profile.
select is(
  (select count(*)::int from public.profiles),
  5,
  'Every sign-up creates a profile'
);
 
-- Test 2: the trigger saved Hari's display name.
select is(
  (select display_name from public.profiles
   where id = '11111111-1111-1111-1111-111111111111'),
  'Hari',
  'Sign-up creates a profile with the display name entered'
);
 
-- From here on, act as Hari: a signed-in app user, not an admin.
set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111"}';
 
-- Test 3: Hari can update his own profile.
update public.profiles
set display_name = 'Hari Updated'
where id = '11111111-1111-1111-1111-111111111111';
 
select is(
  (select display_name from public.profiles
   where id = '11111111-1111-1111-1111-111111111111'),
  'Hari Updated',
  'A user can update their own profile'
);
 
-- Test 4: Hari tries to rename Angel. RLS silently blocks it (no error),
-- so we check that Angel's name did NOT change.
update public.profiles
set display_name = 'Hacked'
where id = '22222222-2222-2222-2222-222222222222';
 
select is(
  (select display_name from public.profiles
   where id = '22222222-2222-2222-2222-222222222222'),
  'Angel',
  'A user cannot edit another user''s profile'
);
 
-- Test 5: Hari can't change protected columns, even on his own profile.
select throws_ok(
  $$ update public.profiles
     set created_at = now() - interval '1 year'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'A user cannot change protected columns like created_at'
);
 
select * from finish();
rollback;