-- Add company_id to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Backfill: if there's only one company, assign all existing customers to it
DO $$
DECLARE
  single_company_id uuid;
BEGIN
  SELECT id INTO single_company_id FROM public.companies LIMIT 1;
  IF single_company_id IS NOT NULL THEN
    UPDATE public.customers SET company_id = single_company_id WHERE company_id IS NULL;
  END IF;
END $$;

-- Make company_id required going forward
ALTER TABLE public.customers ALTER COLUMN company_id SET NOT NULL;

-- Drop old wildcard RLS policies
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can delete customers" ON public.customers;

-- Create proper company-scoped RLS policies
CREATE POLICY "Company users can view own customers"
  ON public.customers FOR SELECT
  USING (is_platform_admin() OR company_id = get_user_company_id());

CREATE POLICY "Company users can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (is_platform_admin() OR company_id = get_user_company_id());

CREATE POLICY "Company users can update own customers"
  ON public.customers FOR UPDATE
  USING (is_platform_admin() OR company_id = get_user_company_id());

CREATE POLICY "Company users can delete own customers"
  ON public.customers FOR DELETE
  USING (is_platform_admin() OR company_id = get_user_company_id());

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);
