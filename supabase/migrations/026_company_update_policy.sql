-- Add policy to allow company users to update their own company details
-- Previously, only platform admins had UPDATE permissions on the companies table.

CREATE POLICY "Company users can update own company" ON public.companies
  FOR UPDATE USING (id = get_user_company_id());
