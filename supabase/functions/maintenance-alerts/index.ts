import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

// ================================================================
// DAILY MAINTENANCE ALERTS
//
// Scheduled via pg_cron — runs every day at 8 AM UTC:
//   select cron.schedule(
//     'maintenance-alerts-daily',
//     '0 8 * * *',
//     $$ select net.http_post(
//         url := '<SUPABASE_URL>/functions/v1/maintenance-alerts',
//         headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
//     ) $$
//   );
//
// What it does:
//  1. Updates vehicle_service_programs.status (ok → due → overdue)
//     based on current odometer and date thresholds.
//     The existing DB trigger then fires and creates in-app notifications.
//  2. Checks maintenance_records for date-based due/overdue items.
//  3. Sends a single email digest per company via Resend
//     (requires RESEND_API_KEY and APP_URL secrets in Supabase).
//
// Supabase secrets needed:
//   RESEND_API_KEY  — from resend.com
//   APP_URL         — e.g. https://truckerscall.com
// ================================================================

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DUE_SOON_DAYS = 7       // days before next_service_date → "due soon"
const DUE_SOON_MILES = 500    // miles before next_due_odometer → "due soon"

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        const appUrl = Deno.env.get('APP_URL') ?? 'https://truckerscall.com'

        const supabase = createClient(supabaseUrl, serviceRoleKey)

        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]
        const dueSoonDate = new Date(today)
        dueSoonDate.setDate(dueSoonDate.getDate() + DUE_SOON_DAYS)
        const dueSoonStr = dueSoonDate.toISOString().split('T')[0]

        // ─────────────────────────────────────────────────────────────
        // STEP 1: Update vehicle_service_programs.status
        //   - The existing DB trigger on this table auto-creates
        //     in-app notifications when status changes to due/overdue
        // ─────────────────────────────────────────────────────────────
        const { data: programs, error: progError } = await supabase
            .from('vehicle_service_programs')
            .select(`
                id, status, next_due_odometer, next_due_date,
                vehicles ( id, odometer_reading, make, model, license_plate, company_id ),
                service_programs ( name )
            `)

        if (progError) throw progError

        type AlertItem = { vehicleName: string; programName: string; reason: string; severity: 'overdue' | 'due' }
        const emailAlerts: Record<string, AlertItem[]> = {}

        for (const prog of (programs ?? [])) {
            const vehicle = prog.vehicles as any
            if (!vehicle?.company_id) continue

            const currentOdo = vehicle.odometer_reading ?? 0
            const nextDueOdo = prog.next_due_odometer ?? 0
            const nextDueDate = prog.next_due_date as string | null

            let newStatus = 'ok'
            let reason = ''

            // Odometer-based
            if (nextDueOdo > 0) {
                if (currentOdo >= nextDueOdo) {
                    newStatus = 'overdue'
                    reason = `${currentOdo.toLocaleString()} mi (due at ${nextDueOdo.toLocaleString()} mi)`
                } else if (currentOdo >= nextDueOdo - DUE_SOON_MILES) {
                    newStatus = 'due'
                    reason = `${(nextDueOdo - currentOdo).toLocaleString()} mi remaining`
                }
            }

            // Date-based (escalates if worse)
            if (nextDueDate) {
                if (nextDueDate < todayStr) {
                    newStatus = 'overdue'
                    const daysLate = Math.floor((today.getTime() - new Date(nextDueDate).getTime()) / 86400000)
                    reason = reason || `${daysLate} day${daysLate !== 1 ? 's' : ''} overdue`
                } else if (nextDueDate <= dueSoonStr && newStatus === 'ok') {
                    newStatus = 'due'
                    const daysLeft = Math.ceil((new Date(nextDueDate).getTime() - today.getTime()) / 86400000)
                    reason = reason || `due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
                }
            }

            // Update DB if status changed — this fires the existing notification trigger
            if (newStatus !== prog.status) {
                await supabase
                    .from('vehicle_service_programs')
                    .update({ status: newStatus, updated_at: new Date().toISOString() })
                    .eq('id', prog.id)
            }

            // Collect for email digest if due or overdue
            if (newStatus === 'due' || newStatus === 'overdue') {
                const cid = vehicle.company_id
                if (!emailAlerts[cid]) emailAlerts[cid] = []
                emailAlerts[cid].push({
                    vehicleName: `${vehicle.make} ${vehicle.model} (${vehicle.license_plate})`,
                    programName: (prog.service_programs as any)?.name ?? 'Unknown Program',
                    reason,
                    severity: newStatus as 'overdue' | 'due',
                })
            }
        }

        // ─────────────────────────────────────────────────────────────
        // STEP 2: Check maintenance_records for date-based alerts
        //   (Records not linked to service programs)
        // ─────────────────────────────────────────────────────────────
        const { data: overdueRecords } = await supabase
            .from('maintenance_records')
            .select('id, description, next_service_date, vehicles(id, make, model, license_plate, company_id)')
            .neq('status', 'completed')
            .lt('next_service_date', todayStr)
            .not('next_service_date', 'is', null)
            .is('program_id', null)  // only standalone records (programs handled above)

        const { data: dueSoonRecords } = await supabase
            .from('maintenance_records')
            .select('id, description, next_service_date, vehicles(id, make, model, license_plate, company_id)')
            .neq('status', 'completed')
            .gte('next_service_date', todayStr)
            .lte('next_service_date', dueSoonStr)
            .not('next_service_date', 'is', null)
            .is('program_id', null)

        for (const r of (overdueRecords ?? [])) {
            const v = r.vehicles as any
            if (!v?.company_id) continue
            const daysLate = Math.floor((today.getTime() - new Date(r.next_service_date).getTime()) / 86400000)
            if (!emailAlerts[v.company_id]) emailAlerts[v.company_id] = []
            emailAlerts[v.company_id].push({
                vehicleName: `${v.make} ${v.model} (${v.license_plate})`,
                programName: r.description ?? 'Scheduled Service',
                reason: `${daysLate} day${daysLate !== 1 ? 's' : ''} overdue`,
                severity: 'overdue',
            })
        }

        for (const r of (dueSoonRecords ?? [])) {
            const v = r.vehicles as any
            if (!v?.company_id) continue
            const daysLeft = Math.ceil((new Date(r.next_service_date).getTime() - today.getTime()) / 86400000)
            if (!emailAlerts[v.company_id]) emailAlerts[v.company_id] = []
            emailAlerts[v.company_id].push({
                vehicleName: `${v.make} ${v.model} (${v.license_plate})`,
                programName: r.description ?? 'Scheduled Service',
                reason: `due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
                severity: 'due',
            })
        }

        // ─────────────────────────────────────────────────────────────
        // STEP 3: Send email digest per company via Resend
        // ─────────────────────────────────────────────────────────────
        let emailsSent = 0

        if (resendApiKey && Object.keys(emailAlerts).length > 0) {
            const companyIds = Object.keys(emailAlerts)

            // Fetch admin/fleet_manager emails + company names
            const { data: admins } = await supabase
                .from('profiles')
                .select('email, company_id, companies(name, settings)')
                .in('company_id', companyIds)
                .in('role', ['admin', 'fleet_manager'])
                .not('email', 'is', null)

            // Group recipients by company
            type CompanyMeta = { emails: string[]; name: string; alertsEnabled: boolean }
            const companyMeta: Record<string, CompanyMeta> = {}

            for (const admin of (admins ?? [])) {
                if (!admin.email || !admin.company_id) continue
                const cid = admin.company_id
                const settings = (admin.companies as any)?.settings as Record<string, any> | null
                const alertsEnabled = settings?.maintenanceAlerts?.enabled !== false // default true

                if (!companyMeta[cid]) {
                    companyMeta[cid] = {
                        emails: [],
                        name: (admin.companies as any)?.name ?? 'Your Fleet',
                        alertsEnabled,
                    }
                }
                companyMeta[cid].emails.push(admin.email)
            }

            for (const [cid, alerts] of Object.entries(emailAlerts)) {
                const meta = companyMeta[cid]
                if (!meta || !meta.alertsEnabled || meta.emails.length === 0) continue

                const overdueList = alerts.filter(a => a.severity === 'overdue')
                const dueSoonList = alerts.filter(a => a.severity === 'due')
                const total = alerts.length

                const subject = overdueList.length > 0
                    ? `🚨 ${overdueList.length} overdue + ${dueSoonList.length} due soon — Fleet Maintenance`
                    : `⏰ ${dueSoonList.length} vehicle${dueSoonList.length > 1 ? 's' : ''} due for maintenance`

                const html = buildEmailHtml(meta.name, overdueList, dueSoonList, appUrl)

                const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: 'Truckerscall Alerts <alerts@truckerscall.com>',
                        to: meta.emails,
                        subject,
                        html,
                    }),
                })

                if (res.ok) emailsSent += meta.emails.length
                else {
                    const err = await res.text()
                    console.error(`Email failed for company ${cid}:`, err)
                }
            }
        }

        return new Response(
            JSON.stringify({
                message: 'Maintenance alerts processed',
                programs_checked: programs?.length ?? 0,
                overdue_records: overdueRecords?.length ?? 0,
                due_soon_records: dueSoonRecords?.length ?? 0,
                companies_alerted: Object.keys(emailAlerts).length,
                emails_sent: emailsSent,
                email_enabled: !!resendApiKey,
                run_at: today.toISOString(),
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Unhandled error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────
type AlertItem = { vehicleName: string; programName: string; reason: string; severity: 'overdue' | 'due' }

function buildEmailHtml(
    companyName: string,
    overdue: AlertItem[],
    dueSoon: AlertItem[],
    appUrl: string
): string {
    const overdueRows = overdue.map(a => `
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #FEE2E2;">
                <span style="font-weight:600;color:#111827;">${a.vehicleName}</span><br>
                <span style="font-size:13px;color:#6B7280;">${a.programName}</span>
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #FEE2E2;color:#DC2626;font-size:13px;white-space:nowrap;">
                ${a.reason}
            </td>
        </tr>`).join('')

    const dueSoonRows = dueSoon.map(a => `
        <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #FEF3C7;">
                <span style="font-weight:600;color:#111827;">${a.vehicleName}</span><br>
                <span style="font-size:13px;color:#6B7280;">${a.programName}</span>
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #FEF3C7;color:#D97706;font-size:13px;white-space:nowrap;">
                ${a.reason}
            </td>
        </tr>`).join('')

    const overdueSection = overdue.length > 0 ? `
        <div style="margin-bottom:24px;">
            <h3 style="margin:0 0 8px;font-size:15px;font-weight:700;color:#DC2626;">
                🚨 Overdue (${overdue.length})
            </h3>
            <table style="width:100%;border-collapse:collapse;background:#FEF2F2;border-radius:8px;overflow:hidden;">
                <tbody>${overdueRows}</tbody>
            </table>
        </div>` : ''

    const dueSoonSection = dueSoon.length > 0 ? `
        <div style="margin-bottom:24px;">
            <h3 style="margin:0 0 8px;font-size:15px;font-weight:700;color:#D97706;">
                ⏰ Due Soon (${dueSoon.length})
            </h3>
            <table style="width:100%;border-collapse:collapse;background:#FFFBEB;border-radius:8px;overflow:hidden;">
                <tbody>${dueSoonRows}</tbody>
            </table>
        </div>` : ''

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.07);">

        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1E293B 0%,#334155 100%);padding:28px 32px;">
            <p style="margin:0 0 4px;font-size:12px;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">Fleet Maintenance Alert</p>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#F8FAFC;">🔧 ${companyName}</h1>
            <p style="margin:6px 0 0;font-size:13px;color:#94A3B8;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <!-- Body -->
        <div style="padding:28px 32px;">
            <p style="margin:0 0 20px;font-size:14px;color:#64748B;line-height:1.6;">
                Your daily maintenance digest. The following vehicles need attention:
            </p>

            ${overdueSection}
            ${dueSoonSection}

            <!-- CTA -->
            <div style="text-align:center;margin-top:8px;">
                <a href="${appUrl}/dashboard/maintenance"
                   style="display:inline-block;background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.3px;">
                    Open Maintenance Dashboard →
                </a>
            </div>
        </div>

        <!-- Footer -->
        <div style="background:#F8FAFC;padding:16px 32px;border-top:1px solid #E2E8F0;">
            <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;">
                Sent by <strong>Truckerscall</strong> · Daily at 8:00 AM UTC ·
                <a href="${appUrl}/dashboard/settings" style="color:#94A3B8;">Manage Alerts</a>
            </p>
        </div>
    </div>
</body>
</html>`
}
