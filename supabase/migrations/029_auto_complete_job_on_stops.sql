-- ================================================================
-- AUTO-COMPLETE JOB WHEN ALL STOPS ARE DONE
-- When every stop on a job reaches 'completed' or 'skipped',
-- the job itself is automatically moved to 'completed'.
--
-- This removes the requirement for dispatchers/drivers to manually
-- press "Complete Job" after finishing every stop.
-- ================================================================

CREATE OR REPLACE FUNCTION handle_auto_complete_job_on_stops()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_job_status    TEXT;
  v_total_stops   INT;
  v_done_stops    INT;
BEGIN
  -- Only react when a stop is newly marked 'completed' or 'skipped'
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('completed', 'skipped') THEN

    -- Get the current job status
    SELECT status INTO v_job_status
    FROM jobs
    WHERE id = NEW.job_id;

    -- Only auto-complete jobs that are actively in progress
    IF v_job_status = 'in_progress' THEN

      SELECT COUNT(*)  INTO v_total_stops FROM job_stops WHERE job_id = NEW.job_id;
      SELECT COUNT(*)  INTO v_done_stops  FROM job_stops WHERE job_id = NEW.job_id
                                                           AND status IN ('completed', 'skipped');

      -- All stops are done — complete the job
      IF v_total_stops > 0 AND v_done_stops = v_total_stops THEN
        UPDATE jobs
        SET status     = 'completed',
            updated_at = NOW()
        WHERE id = NEW.job_id;
      END IF;

    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_complete_job_on_stops ON job_stops;
CREATE TRIGGER trg_auto_complete_job_on_stops
  AFTER UPDATE OF status ON job_stops
  FOR EACH ROW EXECUTE FUNCTION handle_auto_complete_job_on_stops();
