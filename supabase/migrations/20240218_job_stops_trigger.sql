-- =========================================================
-- JOB STOPS NOTIFICATION TRIGGER (Arrived, Completed, etc.)
-- =========================================================
-- This trigger handles granular updates when a driver interacts with a specific stop.
-- It covers:
-- 1. Arrival at a stop (when actual_arrival_time is set)
-- 2. Completion of a stop (when status becomes 'completed')

CREATE OR REPLACE FUNCTION public.handle_job_stop_update()
RETURNS TRIGGER AS $$
DECLARE
  v_job_id uuid;
  v_job_number text;
  v_company_id uuid;
  v_driver_id uuid;
  v_driver_name text;
  v_notification_type text;
  v_title text;
  v_message text;
BEGIN
  -- We need job details to know which company and driver this belongs to
  SELECT id, job_number, company_id, driver_id
  INTO v_job_id, v_job_number, v_company_id, v_driver_id
  FROM public.jobs
  WHERE id = NEW.job_id;

  -- If for some reason job is not found, exit
  IF v_job_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch driver name
  SELECT full_name INTO v_driver_name
  FROM public.profiles
  WHERE id = v_driver_id;
  
  IF v_driver_name IS NULL THEN v_driver_name := 'Driver'; END IF;

  -- ------------------------------------------------------------------
  -- SCENARIO 1: Driver Arrived (actual_arrival_time changes from NULL to Value)
  -- ------------------------------------------------------------------
  IF OLD.actual_arrival_time IS NULL AND NEW.actual_arrival_time IS NOT NULL THEN
    v_notification_type := 'stop_arrived';
    v_title := 'Driver Arrived: ' || COALESCE(v_job_number, 'Unknown Job');
    
    -- Message variations based on stop type
    IF NEW.type = 'pickup' THEN
      v_message := v_driver_name || ' arrived at Pickup location.';
    ELSIF NEW.type = 'dropoff' THEN
      v_message := v_driver_name || ' arrived at Dropoff location.';
    ELSE
      v_message := v_driver_name || ' arrived at Stop #' || NEW.sequence_order;
    END IF;

    -- Insert notification for Dispatchers/Admins
    INSERT INTO public.notifications (user_id, type, title, message, data, read)
    SELECT
      id,
      v_notification_type,
      v_title,
      v_message,
      jsonb_build_object('job_id', v_job_id, 'stop_id', NEW.id),
      false
    FROM public.profiles
    WHERE (role = 'dispatcher' OR role = 'admin' OR role = 'fleet_manager') 
      AND (company_id = v_company_id OR is_platform_admin = true);
  END IF;

  -- ------------------------------------------------------------------
  -- SCENARIO 2: Stop Completed (status changes to 'completed')
  -- ------------------------------------------------------------------
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
    v_notification_type := 'stop_completed';
    v_title := 'Stop Completed: ' || COALESCE(v_job_number, 'Unknown Job');

    -- Message variations based on stop type
    IF NEW.type = 'pickup' THEN
      v_message := v_driver_name || ' completed Pickup.';
    ELSIF NEW.type = 'dropoff' THEN
      v_message := v_driver_name || ' completed Delivery.';
    ELSE
      v_message := v_driver_name || ' completed Stop #' || NEW.sequence_order;
    END IF;

    -- Insert notification for Dispatchers/Admins
    INSERT INTO public.notifications (user_id, type, title, message, data, read)
    SELECT
      id,
      v_notification_type,
      v_title,
      v_message,
      jsonb_build_object('job_id', v_job_id, 'stop_id', NEW.id),
      false
    FROM public.profiles
    WHERE (role = 'dispatcher' OR role = 'admin' OR role = 'fleet_manager') 
      AND (company_id = v_company_id OR is_platform_admin = true);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the Trigger
DROP TRIGGER IF EXISTS on_job_stop_update ON public.job_stops;

CREATE TRIGGER on_job_stop_update
  AFTER UPDATE ON public.job_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_job_stop_update();
