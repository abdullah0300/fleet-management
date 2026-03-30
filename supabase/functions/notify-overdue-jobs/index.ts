import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

// ================================================================
// DAILY OVERDUE JOBS NOTIFICATION
//
// Call this function once per day via a Supabase cron job:
//   select cron.schedule(
//     'notify-overdue-jobs-daily',
//     '0 8 * * *',   -- every day at 8 AM UTC
//     $$ select net.http_post(
//         url := '<YOUR_SUPABASE_URL>/functions/v1/notify-overdue-jobs',
//         headers := '{"Authorization": "Bearer <YOUR_ANON_KEY>"}'::jsonb
//     ) $$
//   );
//
// It finds all jobs where:
//   - scheduled_date < today
//   - status is still 'pending' or 'assigned'
// and sends one notification per company to all dispatchers/admins
// summarising how many jobs are overdue.
// ================================================================

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

        const supabase = createClient(supabaseUrl, serviceRoleKey)

        // Today's date at midnight UTC (used as the cutoff)
        const today = new Date()
        today.setUTCHours(0, 0, 0, 0)
        const todayISO = today.toISOString().split('T')[0] // 'YYYY-MM-DD'

        // Fetch all overdue jobs grouped by company
        const { data: overdueJobs, error: jobsError } = await supabase
            .from('jobs')
            .select('id, job_number, scheduled_date, status, company_id')
            .lt('scheduled_date', todayISO)
            .in('status', ['pending', 'assigned'])
            .order('scheduled_date', { ascending: true })

        if (jobsError) throw jobsError

        if (!overdueJobs || overdueJobs.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No overdue jobs found', notified: 0 }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Group overdue jobs by company_id
        const byCompany: Record<string, typeof overdueJobs> = {}
        for (const job of overdueJobs) {
            if (!job.company_id) continue
            if (!byCompany[job.company_id]) byCompany[job.company_id] = []
            byCompany[job.company_id].push(job)
        }

        let totalNotifications = 0

        for (const [companyId, jobs] of Object.entries(byCompany)) {
            const count = jobs.length
            const oldest = jobs[0] // already sorted oldest first
            const daysOld = Math.floor(
                (Date.now() - new Date(oldest.scheduled_date).getTime()) / 86400000
            )

            const title = `${count} Overdue Job${count > 1 ? 's' : ''} Need Attention`
            const message =
                count === 1
                    ? `Job ${oldest.job_number} was scheduled ${daysOld} day${daysOld !== 1 ? 's' : ''} ago and has not been started.`
                    : `${count} jobs are overdue. The oldest (${oldest.job_number}) was scheduled ${daysOld} day${daysOld !== 1 ? 's' : ''} ago.`

            // Fetch all dispatchers, fleet_managers, and admins for this company
            const { data: recipients, error: recError } = await supabase
                .from('profiles')
                .select('id')
                .eq('company_id', companyId)
                .in('role', ['dispatcher', 'fleet_manager', 'admin'])

            if (recError || !recipients || recipients.length === 0) continue

            // Insert one notification per recipient
            const notifications = recipients.map((r) => ({
                user_id: r.id,
                type: 'overdue_jobs',
                title,
                message,
                data: {
                    overdue_count: count,
                    oldest_job_id: oldest.id,
                    oldest_job_number: oldest.job_number,
                },
                read: false,
            }))

            const { error: insertError } = await supabase
                .from('notifications')
                .insert(notifications)

            if (insertError) {
                console.error(`Failed to notify company ${companyId}:`, insertError)
            } else {
                totalNotifications += notifications.length
            }
        }

        return new Response(
            JSON.stringify({
                message: 'Overdue notifications sent',
                overdue_jobs: overdueJobs.length,
                notifications_sent: totalNotifications,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Unhandled error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
