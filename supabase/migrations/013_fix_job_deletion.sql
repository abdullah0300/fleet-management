-- Fix Job Deletion Logic
-- 1. Update Foreign Keys to Cascade Delete
-- This ensures that when a Job is deleted, its generic children (Stops, PODs) are also deleted,
-- avoiding foreign key constraint violations.

-- A. Job Stops (Cascade Delete)
ALTER TABLE public.job_stops
DROP CONSTRAINT IF EXISTS job_stops_job_id_fkey;

ALTER TABLE public.job_stops
ADD CONSTRAINT job_stops_job_id_fkey
FOREIGN KEY (job_id)
REFERENCES public.jobs(id)
ON DELETE CASCADE;

-- B. Trips (Set Null - Keep history)
-- We want to keep the trip record even if the job is deleted, but unlink it.
ALTER TABLE public.trips
DROP CONSTRAINT IF EXISTS trips_job_id_fkey;

ALTER TABLE public.trips
ADD CONSTRAINT trips_job_id_fkey
FOREIGN KEY (job_id)
REFERENCES public.jobs(id)
ON DELETE SET NULL;

-- C. Proof of Delivery (Cascade Delete)
-- PODs are strictly part of the job; if the job is gone, the POD should be too.
ALTER TABLE public.proof_of_delivery
DROP CONSTRAINT IF EXISTS proof_of_delivery_job_id_fkey;

ALTER TABLE public.proof_of_delivery
ADD CONSTRAINT proof_of_delivery_job_id_fkey
FOREIGN KEY (job_id)
REFERENCES public.jobs(id)
ON DELETE CASCADE;

-- D. Cost Estimates (Cascade Delete - if exists)
-- Assuming we want to delete estimates if the job is deleted.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'cost_estimates_job_id_fkey') THEN
        ALTER TABLE public.cost_estimates DROP CONSTRAINT cost_estimates_job_id_fkey;
        ALTER TABLE public.cost_estimates
        ADD CONSTRAINT cost_estimates_job_id_fkey
        FOREIGN KEY (job_id)
        REFERENCES public.jobs(id)
        ON DELETE CASCADE;
    END IF;
END $$;


-- 2. Update RLS Policies for Proof of Delivery
-- Allow users to DELETE their own company's PODs (indirectly via Job company_id)

-- Drop existing if strictly restrictive, but usually we just add new 'allow' policies.
-- Let's ensure we have a policy for DELETE.

CREATE POLICY "Company users can delete own POD" ON public.proof_of_delivery
FOR DELETE USING (
  is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = proof_of_delivery.job_id
    AND jobs.company_id = get_user_company_id()
  )
);

-- Also ensure UPDATE is allowed (was missing in previous migration check)
CREATE POLICY "Company users can update own POD" ON public.proof_of_delivery
FOR UPDATE USING (
  is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.jobs
    WHERE jobs.id = proof_of_delivery.job_id
    AND jobs.company_id = get_user_company_id()
  )
);
