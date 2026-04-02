-- ============================================================
-- Notification trigger: job financial_status → pending_review
-- Fires when a job transitions to pending_review and sends
-- in-app notifications to all admins and dispatchers in the
-- same company so they know a job is awaiting financial sign-off.
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_job_pending_review()
RETURNS TRIGGER AS $$
DECLARE
    v_job_number   text;
    v_company_id   uuid;
    v_recipient    record;
    v_title        text;
    v_message      text;
BEGIN
    -- Only fire when financial_status changes TO pending_review
    IF NEW.financial_status = 'pending_review' AND
       (OLD.financial_status IS DISTINCT FROM 'pending_review') THEN

        v_job_number := NEW.job_number;
        v_company_id := NEW.company_id;

        v_title   := 'Job Ready for Financial Review';
        v_message := 'Job ' || v_job_number || ' has been completed and is awaiting financial approval.';

        -- Notify all admins and dispatchers in this company
        FOR v_recipient IN
            SELECT id
            FROM public.profiles
            WHERE company_id = v_company_id
              AND role IN ('admin', 'dispatcher', 'fleet_manager')
        LOOP
            INSERT INTO public.notifications (
                user_id,
                type,
                title,
                message,
                data,
                read
            ) VALUES (
                v_recipient.id,
                'pending_review',
                v_title,
                v_message,
                jsonb_build_object(
                    'job_id',     NEW.id,
                    'job_number', v_job_number,
                    'financial_status', 'pending_review'
                ),
                false
            );
        END LOOP;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to jobs table
DROP TRIGGER IF EXISTS trg_job_pending_review_notification ON public.jobs;

CREATE TRIGGER trg_job_pending_review_notification
    AFTER UPDATE ON public.jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_job_pending_review();
