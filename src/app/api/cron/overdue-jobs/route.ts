import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ─────────────────────────────────────────────────────────────────────────────
// DAILY OVERDUE JOBS ALERTS — Vercel Cron Job
// Runs every day at 08:00 UTC (configured in vercel.json)
//
// What it does:
//  1. Finds jobs where scheduled_date < today AND status in (pending, assigned)
//  2. Creates in-app notifications for dispatchers/fleet_managers/admins per company
//  3. Sends email digest via Resend (if RESEND_API_KEY is set)
// ─────────────────────────────────────────────────────────────────────────────

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
    // Allow: (1) Vercel cron with CRON_SECRET, (2) logged-in admin/fleet_manager/dispatcher
    const authHeader = req.headers.get('authorization')
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

    if (!isCron) {
        const cookieStore = await cookies()
        const sessionClient = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll: () => cookieStore.getAll() } }
        )
        const { data: { user } } = await sessionClient.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
        const { data: profile } = await sessionClient
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        if (!profile || !['admin', 'fleet_manager', 'dispatcher'].includes(profile.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const resendApiKey = process.env.RESEND_API_KEY
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://truckerscall.com'

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const todayISO = today.toISOString().split('T')[0]

    // ─── Step 1: Find all overdue jobs ────────────────────────────────────────
    const { data: overdueJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, job_number, scheduled_date, status, company_id')
        .lt('scheduled_date', todayISO)
        .in('status', ['pending', 'assigned'])
        .order('scheduled_date', { ascending: true })

    if (jobsError) {
        return NextResponse.json({ error: jobsError.message }, { status: 500 })
    }

    if (!overdueJobs || overdueJobs.length === 0) {
        return NextResponse.json({ ok: true, overdue_jobs: 0, notifications_sent: 0, emails_sent: 0 })
    }

    // Group by company
    const byCompany: Record<string, typeof overdueJobs> = {}
    for (const job of overdueJobs) {
        if (!job.company_id) continue
        if (!byCompany[job.company_id]) byCompany[job.company_id] = []
        byCompany[job.company_id].push(job)
    }

    let totalNotifications = 0
    let emailsSent = 0

    for (const [companyId, jobs] of Object.entries(byCompany)) {
        const count = jobs.length
        const oldest = jobs[0]
        const daysOld = Math.floor(
            (Date.now() - new Date(oldest.scheduled_date).getTime()) / 86400000
        )

        const title = `${count} Overdue Job${count > 1 ? 's' : ''} Need Attention`
        const message =
            count === 1
                ? `Job ${oldest.job_number} was scheduled ${daysOld} day${daysOld !== 1 ? 's' : ''} ago and has not been started.`
                : `${count} jobs are overdue. The oldest (${oldest.job_number}) was scheduled ${daysOld} day${daysOld !== 1 ? 's' : ''} ago.`

        // Fetch recipients
        const { data: recipients } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('company_id', companyId)
            .in('role', ['dispatcher', 'fleet_manager', 'admin'])

        if (!recipients || recipients.length === 0) continue

        // ─── Step 2: In-app notifications ─────────────────────────────────────
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

        if (!insertError) totalNotifications += notifications.length

        // ─── Step 3: Email digest via Resend ──────────────────────────────────
        if (!resendApiKey) continue

        // Check company email alerts setting
        const { data: company } = await supabase
            .from('companies')
            .select('name, settings')
            .eq('id', companyId)
            .single()

        const alertsEnabled = company?.settings?.jobAlerts?.enabled !== false
        if (!alertsEnabled) continue

        const recipientEmails = recipients
            .filter((r) => r.email)
            .map((r) => r.email as string)

        if (recipientEmails.length === 0) continue

        const tableRows = jobs
            .slice(0, 15) // cap at 15 rows in email
            .map((j) => {
                const days = Math.floor(
                    (Date.now() - new Date(j.scheduled_date).getTime()) / 86400000
                )
                return `<tr>
                    <td style="padding:8px 12px;border-bottom:1px solid #fee2e2;font-weight:600;">${j.job_number}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #fee2e2;">${j.scheduled_date}</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #fee2e2;color:#dc2626;">${days} day${days !== 1 ? 's' : ''} overdue</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #fee2e2;">${j.status}</td>
                </tr>`
            })
            .join('')

        const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:#dc2626;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">🚨 ${count} Overdue Job${count > 1 ? 's' : ''}</h1>
      <p style="margin:4px 0 0;color:#fecaca;font-size:14px;">${company?.name ?? 'Your Fleet'} · ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
    <div style="padding:24px 32px;">
      <p style="margin:0 0 16px;color:#374151;">The following jobs were scheduled in the past but have not been started or completed:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background:#fef2f2;">
            <th style="padding:8px 12px;text-align:left;color:#991b1b;font-weight:600;">Job #</th>
            <th style="padding:8px 12px;text-align:left;color:#991b1b;font-weight:600;">Scheduled</th>
            <th style="padding:8px 12px;text-align:left;color:#991b1b;font-weight:600;">Overdue By</th>
            <th style="padding:8px 12px;text-align:left;color:#991b1b;font-weight:600;">Status</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      ${jobs.length > 15 ? `<p style="margin:12px 0 0;color:#6b7280;font-size:13px;">…and ${jobs.length - 15} more jobs.</p>` : ''}
      <div style="margin-top:24px;text-align:center;">
        <a href="${appUrl}/dashboard/jobs" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">View Jobs Dashboard</a>
      </div>
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
        You're receiving this because you manage jobs for ${company?.name ?? 'your company'}.<br>
        Manage alert settings in <a href="${appUrl}/dashboard/settings" style="color:#6b7280;">Settings → Fleet</a>.
      </p>
    </div>
  </div>
</body>
</html>`

        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'alerts@truckerscall.com',
                to: recipientEmails,
                subject: `🚨 ${count} Overdue Job${count > 1 ? 's' : ''} — ${company?.name ?? 'Fleet Alert'}`,
                html: emailHtml,
            }),
        })

        emailsSent++
    }

    return NextResponse.json({
        ok: true,
        overdue_jobs: overdueJobs.length,
        notifications_sent: totalNotifications,
        emails_sent: emailsSent,
    })
}
