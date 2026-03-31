-- ================================================================
-- JOB CANCELLATION CLEANUP
-- When a job is cancelled, automatically reset the driver and vehicle
-- status to 'available' — but only if they have no other active jobs.
--
-- Also cleans up when a driver or vehicle is removed from a manifest
-- without a replacement, so they are not permanently stuck on 'on_trip'.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. TRIGGER FUNCTION: Job Cancelled → Reset Driver + Vehicle
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_job_cancellation_cleanup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_active_count INT;
BEGIN
  -- Only fire when status transitions TO 'cancelled'
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'cancelled' THEN

    -- Reset driver to 'available' if they have no other active jobs
    IF NEW.driver_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_active_count
      FROM jobs
      WHERE driver_id = NEW.driver_id
        AND id != NEW.id
        AND status IN ('assigned', 'in_progress');

      IF v_active_count = 0 THEN
        UPDATE drivers
        SET status = 'available'
        WHERE id = NEW.driver_id;
      END IF;
    END IF;

    -- Reset vehicle to 'available' + clear current_driver_id if no other active jobs
    IF NEW.vehicle_id IS NOT NULL THEN
      SELECT COUNT(*) INTO v_active_count
      FROM jobs
      WHERE vehicle_id = NEW.vehicle_id
        AND id != NEW.id
        AND status IN ('assigned', 'in_progress');

      IF v_active_count = 0 THEN
        UPDATE vehicles
        SET status = 'available',
            current_driver_id = NULL
        WHERE id = NEW.vehicle_id;
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_cancellation_cleanup ON jobs;
CREATE TRIGGER trg_job_cancellation_cleanup
  AFTER UPDATE OF status ON jobs
  FOR EACH ROW EXECUTE FUNCTION handle_job_cancellation_cleanup();


-- ----------------------------------------------------------------
-- 2. TRIGGER FUNCTION: Manifest Driver Removed → Reset Driver Status
-- When a dispatcher clears the driver from a manifest, the driver
-- should return to 'available' if they have no remaining active jobs.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_manifest_driver_removal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_active_count INT;
BEGIN
  -- Only fire when driver_id goes from a value to NULL
  IF OLD.driver_id IS NOT NULL AND NEW.driver_id IS NULL THEN

    SELECT COUNT(*) INTO v_active_count
    FROM jobs
    WHERE driver_id = OLD.driver_id
      AND status IN ('assigned', 'in_progress');

    IF v_active_count = 0 THEN
      UPDATE drivers
      SET status = 'available'
      WHERE id = OLD.driver_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_manifest_driver_removal ON manifests;
CREATE TRIGGER trg_manifest_driver_removal
  AFTER UPDATE OF driver_id ON manifests
  FOR EACH ROW EXECUTE FUNCTION handle_manifest_driver_removal();


-- ----------------------------------------------------------------
-- 3. TRIGGER FUNCTION: Manifest Vehicle Removed → Reset Vehicle Status
-- When a dispatcher clears the vehicle from a manifest, the vehicle
-- should return to 'available' if it has no remaining active jobs.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_manifest_vehicle_removal()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_active_count INT;
BEGIN
  -- Only fire when vehicle_id goes from a value to NULL
  IF OLD.vehicle_id IS NOT NULL AND NEW.vehicle_id IS NULL THEN

    SELECT COUNT(*) INTO v_active_count
    FROM jobs
    WHERE vehicle_id = OLD.vehicle_id
      AND status IN ('assigned', 'in_progress');

    IF v_active_count = 0 THEN
      UPDATE vehicles
      SET status = 'available',
          current_driver_id = NULL
      WHERE id = OLD.vehicle_id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_manifest_vehicle_removal ON manifests;
CREATE TRIGGER trg_manifest_vehicle_removal
  AFTER UPDATE OF vehicle_id ON manifests
  FOR EACH ROW EXECUTE FUNCTION handle_manifest_vehicle_removal();
