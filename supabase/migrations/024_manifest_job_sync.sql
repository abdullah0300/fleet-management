-- Migration 024: Manifest and Job Two-Way Sync
-- This trigger handles the "bottom-up" synchronization where Job status changes 
-- automatically update the parent Manifest.

CREATE OR REPLACE FUNCTION public.handle_manifest_job_sync()
RETURNS TRIGGER AS $$
DECLARE
    v_manifest_id UUID;
    v_manifest_status VARCHAR;
    v_total_jobs INT;
    v_completed_jobs INT;
    v_active_trip_id UUID;
BEGIN
    -- Only proceed if the job belongs to a manifest
    IF NEW.manifest_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_manifest_id := NEW.manifest_id;

    -- Get current manifest status
    SELECT status INTO v_manifest_status
    FROM public.manifests
    WHERE id = v_manifest_id;

    -- Auto-Start Manifest: If any job becomes in_progress and manifest is not already in_transit or completed
    IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
        IF v_manifest_status IN ('scheduled', 'dispatched') THEN
            UPDATE public.manifests
            SET status = 'in_transit', updated_at = NOW()
            WHERE id = v_manifest_id;
        END IF;
    END IF;

    -- Auto-Complete Manifest & Trip: Check if all jobs are now completed
    -- We do this check any time a job's status changes to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Count total jobs in this manifest
        SELECT COUNT(*) INTO v_total_jobs
        FROM public.jobs
        WHERE manifest_id = v_manifest_id;

        -- Count completed jobs in this manifest
        -- We include the NEW row in this count since the trigger might run BEFORE UPDATE
        -- or we just use a subquery that factors in NEW if necessary.
        -- Assuming AFTER UPDATE trigger for simplicity, we count directly from table.
        SELECT COUNT(*) INTO v_completed_jobs
        FROM public.jobs
        WHERE manifest_id = v_manifest_id AND status = 'completed';

        -- If ALL jobs are completed
        IF v_total_jobs > 0 AND v_total_jobs = v_completed_jobs THEN
            -- 1. Complete the Manifest
            UPDATE public.manifests
            SET status = 'completed', completed_at = NOW(), updated_at = NOW()
            WHERE id = v_manifest_id AND status != 'completed';

            -- 2. Complete the active Trip associated with this Manifest
            -- We find any 'in_progress' trip for this manifest
            SELECT id INTO v_active_trip_id
            FROM public.trips
            WHERE manifest_id = v_manifest_id AND status = 'in_progress'
            ORDER BY created_at DESC
            LIMIT 1;

            IF FOUND THEN
                UPDATE public.trips
                SET status = 'completed', end_time = NOW(), updated_at = NOW()
                WHERE id = v_active_trip_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to prevent errors on recreation
DROP TRIGGER IF EXISTS trg_manifest_job_sync ON public.jobs;

-- Create the AFTER UPDATE trigger on jobs
CREATE TRIGGER trg_manifest_job_sync
AFTER UPDATE OF status ON public.jobs
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.handle_manifest_job_sync();
