-- Fix missing company_id in drivers table by syncing from profiles
-- This fixes "ghost" drivers that were created without a company_id
UPDATE public.drivers d
SET company_id = p.company_id
FROM public.profiles p
WHERE d.id = p.id
AND d.company_id IS NULL;

-- Also verify no profiles have null company_id (cleanup)
-- If a profile has no company_id (e.g. created by admin incorrectly), we can't fix it easily without manual intervention
-- but we can at least ensure all drivers match their profiles.
