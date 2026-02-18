-- ==========================================
-- JOB STATUS CHANGE NOTIFICATION TRIGGER
-- ==========================================

-- 1. Create the Function
-- This function runs every time a row in the 'jobs' table is updated.
CREATE OR REPLACE FUNCTION public.handle_job_status_change()
RETURNS TRIGGER AS $$
DECLARE
  dispatcher_id uuid;
BEGIN
  -- We only care if the status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- OPTIONAL: Find who should get this notification.
    -- For now, we will send it to ALL users with role 'dispatcher' or 'admin' 
    -- who belong to the same company as the job.
    
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      data,
      read
    )
    SELECT
      id,
      'job_status_change',
      'Job Update: ' || COALESCE(NEW.job_number, 'Unknown'),
      'Status changed from ' || COALESCE(OLD.status, 'pending') || ' to ' || NEW.status,
      jsonb_build_object('job_id', NEW.id),
      false
    FROM public.profiles
    WHERE 
      (role = 'dispatcher' OR role = 'admin') 
      AND (company_id = NEW.company_id OR is_platform_admin = true);
      
  END IF;
  return NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the Trigger
DROP TRIGGER IF EXISTS on_job_status_change ON public.jobs;

CREATE TRIGGER on_job_status_change
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_job_status_change();
