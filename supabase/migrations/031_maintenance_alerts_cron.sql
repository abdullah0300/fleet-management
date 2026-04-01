-- ============================================================
-- Schedule the maintenance-alerts edge function to run
-- every day at 8:00 AM UTC via pg_cron + pg_net
-- ============================================================

-- Remove old job if it exists
SELECT cron.unschedule('maintenance-alerts-daily')
WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'maintenance-alerts-daily'
);

-- Schedule daily at 08:00 UTC
SELECT cron.schedule(
    'maintenance-alerts-daily',
    '0 8 * * *',
    $$
    SELECT net.http_post(
        url     := (SELECT value FROM vault.secrets WHERE name = 'supabase_url') || '/functions/v1/maintenance-alerts',
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            'Authorization', 'Bearer ' || (SELECT value FROM vault.secrets WHERE name = 'service_role_key')
        ),
        body    := '{}'::jsonb
    )
    $$
);
