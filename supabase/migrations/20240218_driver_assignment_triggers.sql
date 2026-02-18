-- =========================================================
-- DRIVER ASSIGNMENT NOTIFICATIONS (Single Job & Manifest)
-- =========================================================

-- ---------------------------------------------------------
-- 1. SINGLE JOB ASSIGNMENT TRIGGER
-- ---------------------------------------------------------
-- Notifies driver ONLY if job is NOT part of a manifest
-- Prevents 5+ notifications when a manifest with 5 jobs is assigned

CREATE OR REPLACE FUNCTION public.handle_job_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_info text;
BEGIN
  -- CHECK: Driver is assigned (NOT NULL) AND Driver Changed AND Not part of a Manifest
  IF NEW.driver_id IS NOT NULL 
     AND (OLD.driver_id IS DISTINCT FROM NEW.driver_id)
     AND NEW.manifest_id IS NULL THEN
     
     -- Get vehicle info if assigned
     IF NEW.vehicle_id IS NOT NULL THEN
       SELECT 'Vehicle: ' || make || ' ' || model || ' (' || license_plate || ')'
       INTO v_vehicle_info
       FROM public.vehicles
       WHERE id = NEW.vehicle_id;
     END IF;

     -- Send Notification to DRIVER
     INSERT INTO public.notifications (
       user_id,
       type,
       title,
       message,
       data,
       read
     ) VALUES (
       NEW.driver_id,
       'job_assigned',
       'New Job Assigned: ' || COALESCE(NEW.job_number, 'Unknown'),
       'You have been assigned a new job.' || COALESCE(' ' || v_vehicle_info, ''),
       jsonb_build_object('job_id', NEW.id),
       false
     );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger (Jobs)
DROP TRIGGER IF EXISTS on_job_assignment ON public.jobs;
CREATE TRIGGER on_job_assignment
  AFTER UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_job_assignment();


-- ---------------------------------------------------------
-- 2. MANIFEST ASSIGNMENT TRIGGER
-- ---------------------------------------------------------
-- Notifies driver when a Manifest is dispatched or assigned to them

CREATE OR REPLACE FUNCTION public.handle_manifest_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_job_count integer;
BEGIN
  -- CHECK: Driver is assigned AND (Driver changed OR Status changed to dispatched)
  IF NEW.driver_id IS NOT NULL AND 
     ((OLD.driver_id IS DISTINCT FROM NEW.driver_id) OR 
      (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'dispatched')) THEN
      
      -- Count jobs in this manifest
      SELECT count(*) INTO v_job_count FROM public.jobs WHERE manifest_id = NEW.id;

      -- Send Notification to DRIVER
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data,
        read
      ) VALUES (
        NEW.driver_id,
        'manifest_dispatch',
        'New Manifest Assigned: ' || COALESCE(NEW.manifest_number, 'Unknown'),
        'You have been assigned a manifest with ' || v_job_count || ' jobs.',
        jsonb_build_object('manifest_id', NEW.id),
        false
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger (Manifests)
DROP TRIGGER IF EXISTS on_manifest_assignment ON public.manifests;
CREATE TRIGGER on_manifest_assignment
  AFTER UPDATE ON public.manifests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_manifest_assignment();
