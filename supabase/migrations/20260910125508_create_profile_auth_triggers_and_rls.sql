-- KyntriX Auth & Profile Integration Migration
-- Target: public.profiles (already exists in production)

-- 1. Helper function for updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- Trigger for updating updated_at on public.profiles
DROP TRIGGER IF EXISTS on_profiles_updated_at ON public.profiles;
CREATE TRIGGER on_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 2. SECURITY DEFINER function to handle new auth users and safely create profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
  v_full_name text;
  v_username text;
  v_role text;
  v_institution text;
  v_avatar_url text;
  v_base_username text;
  v_counter int := 1;
BEGIN
  -- Extract full_name: prefer metadata full_name, name, or fallback to email local part
  v_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- Extract or generate username
  v_username := COALESCE(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'preferred_username'
  );

  -- If username is null or whitespace, generate from full_name or email
  IF v_username IS NULL OR trim(v_username) = '' THEN
    v_base_username := lower(regexp_replace(COALESCE(v_full_name, 'user'), '[^a-zA-Z0-9_]', '', 'g'));
    IF v_base_username IS NULL OR v_base_username = '' THEN
      v_base_username := 'user';
    END IF;
    v_username := v_base_username;

    -- Ensure uniqueness for generated username
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
      v_username := v_base_username || '_' || v_counter;
      v_counter := v_counter + 1;
    END LOOP;
  END IF;

  -- Default registrations strictly to 'student' (VULN-04 fix: lock vertical privilege escalation)
  v_role := 'student';

  -- Extract institution
  v_institution := new.raw_user_meta_data->>'institution';

  -- Extract avatar_url
  v_avatar_url := COALESCE(
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'picture'
  );

  -- Insert profile, or update non-empty fields on conflict
  INSERT INTO public.profiles (
    id,
    full_name,
    username,
    role,
    institution,
    avatar_url,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    v_full_name,
    v_username,
    v_role,
    v_institution,
    v_avatar_url,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  RETURN new;
END;
$$;

-- Trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Row Level Security (RLS) Policies on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- 4. Lock role column modifications to strictly prevent privilege escalation
CREATE OR REPLACE FUNCTION public.lock_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog, pg_temp
AS $$
BEGIN
  IF new.role IS DISTINCT FROM old.role THEN
    RAISE EXCEPTION 'Vertical privilege escalation prohibited: profile roles are locked.';
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_lock_profile_role ON public.profiles;
CREATE TRIGGER on_lock_profile_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.lock_profile_role();

