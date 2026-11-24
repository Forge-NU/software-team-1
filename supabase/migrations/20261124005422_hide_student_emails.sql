
-- Remove table-level SELECT access.
REVOKE SELECT ON TABLE public.users
FROM PUBLIC, anon, authenticated;

-- Remove any existing email column permissions.
REVOKE SELECT (email) ON TABLE public.users
FROM PUBLIC, anon, authenticated;

-- Allow signed-in users to read public profile information.
GRANT SELECT (user_id, name, created_at)
ON TABLE public.users TO authenticated;

-- Stop using email prefixes as default display names.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (user_id, name, email)
  VALUES (
    new.id,
    CASE
      WHEN NULLIF(TRIM(new.raw_user_meta_data ->> 'name'), '') IS NULL
        THEN 'Student'
      WHEN LOWER(TRIM(new.raw_user_meta_data ->> 'name'))
        = LOWER(split_part(new.email, '@', 1))
        THEN 'Student'
      WHEN LOWER(TRIM(new.raw_user_meta_data ->> 'name'))
        = LOWER(new.email)
        THEN 'Student'
      ELSE TRIM(new.raw_user_meta_data ->> 'name')
    END,
    new.email
  );
  RETURN new;
END;
$$;

-- Fix existing users whose display names expose their emails.
UPDATE public.users
SET name = 'Student'
WHERE LOWER(TRIM(name)) = LOWER(split_part(email, '@', 1))
   OR LOWER(TRIM(name)) = LOWER(email);
