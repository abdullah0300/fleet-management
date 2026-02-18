-- ==========================================
-- JOB STATUS CHANGE NOTIFICATION TRIGGER (ENHANCED)
-- ==========================================

-- 1. Create the Function
CREATE OR REPLACE FUNCTION public.handle_job_status_change()
RETURNS TRIGGER AS $$
DECLARE
  driver_name text;
  notification_title text;
  notification_message text;
BEGIN
  -- We only care if the status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Fetch the driver's name if a driver is assigned
    SELECT full_name INTO driver_name
    FROM public.profiles
    WHERE id = NEW.driver_id;
    
    -- Fallback if no driver name found
    IF driver_name IS NULL THEN
      driver_name := 'A driver';
    END IF;

    -- Construct enhanced message
    notification_title := 'Job Update: ' || COALESCE(NEW.job_number, 'Unknown');
    notification_message := driver_name || ' updated status to ' || NEW.status;

    -- Insert notification for dispatchers/admins
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
      notification_title,
      notification_message,
      jsonb_build_object('job_id', NEW.id, 'status', NEW.status),
      false
    FROM public.profiles
    WHERE 
      (role = 'dispatcher' OR role = 'admin' OR role = 'fleet_manager') 
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
