-- Tests for B-2: a users row is auto-created on sign-up, and RLS on users.
-- Runs on the LOCAL database only, and everything is rolled back at the end.

begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

-- Pretend five people sign up. Paarth signs up without a name.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'hari@test.com',   '{"name": "Hari"}'),
  ('22222222-2222-2222-2222-222222222222', 'angel@test.com',  '{"name": "Angel"}'),
  ('33333333-3333-3333-3333-333333333333', 'sohum@test.com',  '{"name": "Sohum"}'),
  ('44444444-4444-4444-4444-444444444444', 'manan@test.com',  '{"name": "Manan"}'),
  ('55555555-5555-5555-5555-555555555555', 'paarth@test.com', '{}');

-- Test 1: every sign-up got a users row.
select is(
  (select count(*)::int from public.users
   where user_id in (
     '11111111-1111-1111-1111-111111111111',
     '22222222-2222-2222-2222-222222222222',
     '33333333-3333-3333-3333-333333333333',
     '44444444-4444-4444-4444-444444444444',
     '55555555-5555-5555-5555-555555555555'
   )),
  5,
  'Every sign-up creates a users row'
);

-- Test 2: the name from sign-up is saved.
select is(
  (select name from public.users
   where user_id = '11111111-1111-1111-1111-111111111111'),
  'Hari',
  'Sign-up saves the name entered'
);

-- Test 3: with no name, it falls back to the part of the email before the @.
select is(
  (select name from public.users
   where user_id = '55555555-5555-5555-5555-555555555555'),
  'paarth',
  'Sign-up without a name falls back to the email prefix'
);

-- From here on, act as Hari: a signed-in app user, not an admin.
set local role authenticated;
set local request.jwt.claims to '{"sub": "11111111-1111-1111-1111-111111111111"}';

-- Test 4: Hari can update his own name.
update public.users
set name = 'Hari Updated'
where user_id = '11111111-1111-1111-1111-111111111111';

select is(
  (select name from public.users
   where user_id = '11111111-1111-1111-1111-111111111111'),
  'Hari Updated',
  'A user can update their own name'
);

-- Test 5: Hari tries to rename Angel. RLS silently blocks it (no error),
-- so we check that Angel's name did NOT change.
update public.users
set name = 'Changed By Hari'
where user_id = '22222222-2222-2222-2222-222222222222';

select is(
  (select name from public.users
   where user_id = '22222222-2222-2222-2222-222222222222'),
  'Angel',
  'A user cannot edit another user''s name'
);

-- Test 6: Hari can't change protected columns, even on his own row.
select throws_ok(
  $$ update public.users
     set email = 'someone-else@test.com'
     where user_id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  null,
  'A user cannot change protected columns like email'
);

select * from finish();
rollback;