
-- B-13: Only approved school domains can create accounts.

create table if not exists public.allowed_signup_domains (
  domain text primary key,
  constraint valid_domain check (
    domain = lower(trim(domain))
    and domain ~ '^[a-z0-9-]+(\.[a-z0-9-]+)+$'
  )
);

-- Initial approved school
insert into public.allowed_signup_domains(domain)
values ('northeastern.edu')
on conflict do nothing;

-- Prevent app users from editing the domain list
revoke all on table public.allowed_signup_domains
from public, anon, authenticated;

grant select on table public.allowed_signup_domains
to supabase_auth_admin;

-- Called by Supabase before user creation
create or replace function public.check_school_email(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  input_email text;
  email_domain text;
begin
  input_email := lower(
    trim(coalesce(event->'user'->>'email', ''))
  );

  -- Reject missing or malformed email addresses
  if input_email !~ '^[^@[:space:]]+@[^@[:space:]]+$' then
    return jsonb_build_object(
      'error',
      jsonb_build_object(
        'http_code', 403,
        'message', 'Use an approved school email address.'
      )
    );
  end if;

  email_domain := split_part(input_email, '@', 2);

  -- Only allow domains in our database
  if exists (
    select 1
    from public.allowed_signup_domains
    where domain = email_domain
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error',
    jsonb_build_object(
      'http_code', 403,
      'message', 'Use an approved school email address.'
    )
  );
end;
$$;

-- Only Supabase Auth can execute this hook
revoke all on function public.check_school_email(jsonb)
from public, anon, authenticated;

grant execute on function public.check_school_email(jsonb)
to supabase_auth_admin;
