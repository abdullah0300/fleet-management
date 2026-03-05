-- ============================================
-- Job Financial Status & Verification Workflow
-- ============================================

-- 1. Add financial_status column to jobs
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS financial_status text 
DEFAULT 'pending'::text 
CHECK (financial_status = ANY (ARRAY['pending'::text, 'pending_review'::text, 'approved'::text]));

-- 2. Backfill existing completed jobs so they don't clog the new review queue
UPDATE public.jobs
SET financial_status = 'approved'
WHERE status = 'completed' AND financial_status = 'pending';

-- 3. Create a trigger function to automatically set financial_status to pending_review 
-- when a job is marked as completed by the mobile app.
CREATE OR REPLACE FUNCTION public.handle_job_completion_financials()
RETURNS TRIGGER AS $$
BEGIN
    -- If the status changed to completed, and financial_status isn't already approved
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        IF NEW.financial_status != 'approved' THEN
            NEW.financial_status := 'pending_review';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach the trigger to the jobs table
DROP TRIGGER IF EXISTS trigger_job_completion_financials ON public.jobs;

CREATE TRIGGER trigger_job_completion_financials
    BEFORE UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_job_completion_financials();
