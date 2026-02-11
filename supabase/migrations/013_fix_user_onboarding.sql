-- ============================================
-- FIX USER ONBOARDING LOGIC (Text Role Fix)
-- ============================================

-- 1. Drop the dependent trigger (if exists) to allow dropping the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Recreate the function using TEXT for role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  matched_company_id uuid;
  assigned_role text; -- Using text as the table uses text with check constraint
  meta_role text;
  meta_company_id text;
BEGIN
  -- Extract metadata safely
  meta_role := new.raw_user_meta_data->>'role';
  meta_company_id := new.raw_user_meta_data->>'company_id';

  -- 1. Try to find local company by email
  SELECT id INTO matched_company_id 
  FROM public.companies 
  WHERE email = new.email 
  LIMIT 1;

  -- 2. Determine Role safely
  -- We validate against known roles to ensure we don't violate the table constraint
  IF matched_company_id IS NOT NULL THEN
    assigned_role := 'admin';
  ELSIF meta_role IS NOT NULL AND meta_role = ANY(ARRAY['admin', 'fleet_manager', 'dispatcher', 'driver', 'accountant']) THEN
    assigned_role := meta_role;
  ELSE
    assigned_role := 'driver';
  END IF;

  -- 3. Insert Profile
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    company_id, 
    role,
    is_platform_admin
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    -- Safe cast for UUID
    CASE 
      WHEN meta_company_id IS NOT NULL AND meta_company_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN meta_company_id::uuid
      ELSE matched_company_id
    END,
    assigned_role,
    false
  );
  
  RETURN new;
END;
$$;

-- 4. Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
