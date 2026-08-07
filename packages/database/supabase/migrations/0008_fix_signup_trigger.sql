-- Signup was failing with "Database error creating new user" because the
-- auth.users trigger could not insert into public.users / user_roles under RLS.
-- Profile + role assignment is handled in app code via service role after createUser.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Keep function for manual use / future re-enable, but hardened.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_role_id UUID;
  meta JSONB;
BEGIN
  meta := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);

  INSERT INTO public.users (
    id, email, full_name, avatar_url, phone, roll_number, branch, member_id, avatar_color, bio
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(meta->>'full_name', meta->>'name'),
    meta->>'avatar_url',
    meta->>'phone',
    meta->>'roll_number',
    meta->>'branch',
    public.generate_member_id(),
    COALESCE(meta->>'avatar_color', '#033565'),
    CASE
      WHEN meta->>'roll_number' IS NOT NULL AND meta->>'branch' IS NOT NULL
      THEN 'Roll No: ' || (meta->>'roll_number') || ' · ' || (meta->>'branch')
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO member_role_id FROM public.roles WHERE slug = 'member' LIMIT 1;
  IF member_role_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role_id)
    VALUES (NEW.id, member_role_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Allow service role to manage profiles (used by signup server code)
DROP POLICY IF EXISTS users_service_all ON public.users;
CREATE POLICY users_service_all ON public.users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS user_roles_service_all ON public.user_roles;
CREATE POLICY user_roles_service_all ON public.user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
