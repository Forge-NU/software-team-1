
begin;

select plan(7);

-- checks if northeastern emails are allowed
select is(
  public.check_school_email(
    '{"user":{"email":"student@northeastern.edu"}}'::jsonb
  ),
  '{}'::jsonb,
  'allows northeastern email'
);

-- checks if uppercase emails still work
select is(
  public.check_school_email(
    '{"user":{"email":"STUDENT@NORTHEASTERN.EDU"}}'::jsonb
  ),
  '{}'::jsonb,
  'allows uppercase emails'
);

-- makes sure gmail emails get rejected
select ok(
  public.check_school_email(
    '{"user":{"email":"student@gmail.com"}}'::jsonb
  ) ? 'error',
  'rejects gmail'
);

-- checks if other schools are blocked
select ok(
  public.check_school_email(
    '{"user":{"email":"student@harvard.edu"}}'::jsonb
  ) ? 'error',
  'rejects unapproved schools'
);

-- makes sure fake northeastern domains don't work
select ok(
  public.check_school_email(
    '{"user":{"email":"student@northeastern.edu.fake.com"}}'::jsonb
  ) ? 'error',
  'rejects fake domains'
);

-- checks if an empty email gets rejected
select ok(
  public.check_school_email(
    '{"user":{"email":""}}'::jsonb
  ) ? 'error',
  'rejects empty emails'
);

-- checks if new schools can be added without updating the app
insert into public.allowed_signup_domains(domain)
values ('example.edu');

select is(
  public.check_school_email(
    '{"user":{"email":"student@example.edu"}}'::jsonb
  ),
  '{}'::jsonb,
  'allows newly added domains'
);

select * from finish();

rollback;
