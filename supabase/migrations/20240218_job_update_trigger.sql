-- =========================================================
-- JOB UPDATE NOTIFICATIONS (Schedule, Notes, Priority)
-- =========================================================
-- Notifies driver when critical job details change
-- Matches industry standard (Samsara, Rose Rocket)

CREATE OR REPLACE FUNCTION public.handle_job_update_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_changes text := '';
BEGIN
  -- 1. Check if Driver is assigned
  IF NEW.driver_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 2. Check for specific changes
  
  -- Date Change
  IF OLD.scheduled_date IS DISTINCT FROM NEW.scheduled_date THEN
    v_changes := v_changes || 'Date changed to ' || NEW.scheduled_date || '. ';
  END IF;

  -- Time Change (if scheduled_time exists and changed)
  IF OLD.scheduled_time IS DISTINCT FROM NEW.scheduled_time THEN
    v_changes := v_changes || 'Time changed to ' || NEW.scheduled_time || '. ';
  END IF;

  -- Notes Change
  IF OLD.notes IS DISTINCT FROM NEW.notes AND NEW.notes IS NOT NULL THEN
    v_changes := v_changes || 'Notes updated. ';
  END IF;
  
  -- Priority Change
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    v_changes := v_changes || 'Priority set to ' || NEW.priority || '. ';
  END IF;

  -- 4. status Change (Cancelled)
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN
     INSERT INTO public.notifications (
       user_id,
       type,
       title,
       message,
       data,
       read
     ) VALUES (
       NEW.driver_id,
       'job_cancelled',
       'Job Cancelled: ' || COALESCE(NEW.job_number, 'Unknown'),
       'This job has been cancelled by the dispatcher.',
       jsonb_build_object('job_id', NEW.id),
       false
     );
     -- Return early to avoid sending a generic update notification as well
     RETURN NEW;
  END IF;

  -- 3. Send Notification if there are relevant changes
  IF length(v_changes) > 0 THEN
     INSERT INTO public.notifications (
       user_id,
       type,
       title,
       message,
       data,
       read
     ) VALUES (
       NEW.driver_id,
       'job_updated',
       'Job Update: ' || COALESCE(NEW.job_number, 'Unknown'),
       'Job details updated: ' || v_changes,
       jsonb_build_object('job_id', NEW.id),
       false
     );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger
DROP TRIGGER IF EXISTS on_job_update_notification ON public.jobs;
CREATE TRIGGER on_job_update_notification
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_job_update_notification();
