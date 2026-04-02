import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ─────────────────────────────────────────────────────────────────────────────
// DAILY MAINTENANCE ALERTS — Vercel Cron Job
// Runs every day at 08:00 UTC (configured in vercel.json)
//
// What it does:
//  1. Updates vehicle_service_programs.status → triggers DB notification trigger
//  2. Sends email digest via Resend to admins/fleet_managers per company
//
// Required environment variables:
//   RESEND_API_KEY  — from resend.com (free tier: 100 emails/day)
//   NEXT_PUBLIC_APP_URL — your deployed URL e.g. https://truckerscall.com
// ─────────────────────────────────────────────────────────────────────────────

const DUE_SOON_DAYS = 7
const DUE_SOON_MILES = 500

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
    // Allow: (1) Vercel cron with CRON_SECRET, (2) logged-in admin/fleet_manager
    const authHeader = req.headers.get('authorization')
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

    if (!isCron) {
        // Check for a valid Supabase session (manual "Test Alerts Now" from settings)
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
        if (!profile || !['admin', 'fleet_manager'].includes(profile.role)) {
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
    const todayStr = today.toISOString().split('T')[0]
    const dueSoonDate = new Date(today)
    dueSoonDate.setDate(dueSoonDate.getDate() + DUE_SOON_DAYS)
    const dueSoonStr = dueSoonDate.toISOString().split('T')[0]

    // ─── Step 1: Update vehicle_service_programs.status ───────────────────────
    const { data: programs } = await supabase
        .from('vehicle_service_programs')
        .select(`
            id, status, next_due_odometer, next_due_date,
            vehicles ( id, odometer_reading, make, model, license_plate, company_id ),
            service_programs ( name )
        `)

    type AlertItem = { vehicleName: string; programName: string; reason: string; severity: 'overdue' | 'due' }
    const emailAlerts: Record<string, AlertItem[]> = {}

    for (const prog of (programs ?? [])) {
        const vehicle = prog.vehicles as any
        if (!vehicle?.company_id) continue

        const currentOdo: number = vehicle.odometer_reading ?? 0
        const nextDueOdo: number = prog.next_due_odometer ?? 0
        const nextDueDate: string | null = prog.next_due_date

        let newStatus = 'ok'
        let reason = ''

        // Odometer-based check
        if (nextDueOdo > 0) {
            if (currentOdo >= nextDueOdo) {
                newStatus = 'overdue'
                reason = `${currentOdo.toLocaleString()} mi (due at ${nextDueOdo.toLocaleString()} mi)`
            } else if (currentOdo >= nextDueOdo - DUE_SOON_MILES) {
                newStatus = 'due'
                reason = `${(nextDueOdo - currentOdo).toLocaleString()} mi remaining`
            }
        }

        // Date-based check (escalates if worse)
        if (nextDueDate) {
            if (nextDueDate < todayStr) {
                const daysLate = Math.floor((today.getTime() - new Date(nextDueDate).getTime()) / 86400000)
                if (newStatus !== 'overdue') {
                    newStatus = 'overdue'
                    reason = `${daysLate} day${daysLate !== 1 ? 's' : ''} overdue`
                }
            } else if (nextDueDate <= dueSoonStr && newStatus === 'ok') {
                const daysLeft = Math.ceil((new Date(nextDueDate).getTime() - today.getTime()) / 86400000)
                newStatus = 'due'
                reason = `due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`
            }
        }

        // Update DB if changed — triggers DB notification trigger → in-app notifications
        if (newStatus !== prog.status) {
            await supabase
                .from('vehicle_service_programs')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', prog.id)
        }

        // Collect for email
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

    // ─── Step 2: Add standalone maintenance_records alerts ────────────────────
    const { data: overdueRecords } = await supabase
        .from('maintenance_records')
        .select('description, next_service_date, vehicles(make, model, license_plate, company_id)')
        .neq('status', 'completed')
        .lt('next_service_date', todayStr)
        .not('next_service_date', 'is', null)
        .is('program_id', null)

    const { data: dueSoonRecords } = await supabase
        .from('maintenance_records')
        .select('description, next_service_date, vehicles(make, model, license_plate, company_id)')
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

    // ─── Step 3: Send email digest via Resend ─────────────────────────────────
    let emailsSent = 0

    if (resendApiKey && Object.keys(emailAlerts).length > 0) {
        const { data: admins } = await supabase
            .from('profiles')
            .select('email, company_id, companies(name, settings)')
            .in('company_id', Object.keys(emailAlerts))
            .in('role', ['admin', 'fleet_manager'])
            .not('email', 'is', null)

        type Meta = { emails: string[]; name: string; alertsEnabled: boolean }
        const meta: Record<string, Meta> = {}

        for (const a of (admins ?? [])) {
            if (!a.email || !a.company_id) continue
            const settings = (a.companies as any)?.settings as Record<string, any> | null
            const alertsEnabled = settings?.maintenanceAlerts?.enabled !== false // default on
            if (!meta[a.company_id]) {
                meta[a.company_id] = {
                    emails: [],
                    name: (a.companies as any)?.name ?? 'Your Fleet',
                    alertsEnabled,
                }
            }
            meta[a.company_id].emails.push(a.email)
        }

        for (const [cid, alerts] of Object.entries(emailAlerts)) {
            const m = meta[cid]
            if (!m || !m.alertsEnabled || m.emails.length === 0) continue

            const overdue = alerts.filter(a => a.severity === 'overdue')
            const dueSoon = alerts.filter(a => a.severity === 'due')

            const subject = overdue.length > 0
                ? `🚨 ${overdue.length} overdue + ${dueSoon.length} due soon — Fleet Maintenance`
                : `⏰ ${dueSoon.length} vehicle${dueSoon.length > 1 ? 's' : ''} due for maintenance soon`

            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: 'Truckerscall Alerts <alerts@truckerscall.com>',
                    to: m.emails,
                    subject,
                    html: buildEmailHtml(m.name, overdue, dueSoon, appUrl),
                }),
            })

            if (res.ok) emailsSent += m.emails.length
            else console.error(`Email failed for ${cid}:`, await res.text())
        }
    }

    return NextResponse.json({
        ok: true,
        programs_checked: programs?.length ?? 0,
        overdue_records: overdueRecords?.length ?? 0,
        due_soon_records: dueSoonRecords?.length ?? 0,
        companies_with_alerts: Object.keys(emailAlerts).length,
        emails_sent: emailsSent,
        email_enabled: !!resendApiKey,
        run_at: today.toISOString(),
    })
}

// ─── Email Template ───────────────────────────────────────────────────────────
type AlertItem = { vehicleName: string; programName: string; reason: string; severity: 'overdue' | 'due' }

function buildEmailHtml(
    companyName: string,
    overdue: AlertItem[],
    dueSoon: AlertItem[],
    appUrl: string
): string {
    const rows = (items: AlertItem[], borderColor: string) =>
        items.map(a => `
            <tr>
                <td style="padding:10px 14px;border-bottom:1px solid ${borderColor};">
                    <div style="font-weight:600;font-size:14px;color:#111827;">${a.vehicleName}</div>
                    <div style="font-size:12px;color:#6B7280;margin-top:2px;">${a.programName}</div>
                </td>
                <td style="padding:10px 14px;border-bottom:1px solid ${borderColor};font-size:13px;color:${a.severity === 'overdue' ? '#DC2626' : '#D97706'};white-space:nowrap;vertical-align:middle;">
                    ${a.reason}
                </td>
            </tr>`).join('')

    const overdueSection = overdue.length > 0 ? `
        <div style="margin-bottom:24px;">
            <h3 style="margin:0 0 10px;font-size:15px;font-weight:700;color:#DC2626;">🚨 Overdue — ${overdue.length} vehicle${overdue.length > 1 ? 's' : ''}</h3>
            <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;background:#FEF2F2;">
                <tbody>${rows(overdue, '#FEE2E2')}</tbody>
            </table>
        </div>` : ''

    const dueSoonSection = dueSoon.length > 0 ? `
        <div style="margin-bottom:24px;">
            <h3 style="margin:0 0 10px;font-size:15px;font-weight:700;color:#D97706;">⏰ Due Soon — ${dueSoon.length} vehicle${dueSoon.length > 1 ? 's' : ''}</h3>
            <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;background:#FFFBEB;">
                <tbody>${rows(dueSoon, '#FEF3C7')}</tbody>
            </table>
        </div>` : ''

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.07);">
    <div style="background:linear-gradient(135deg,#1E293B 0%,#334155 100%);padding:28px 32px;">
      <p style="margin:0 0 4px;font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">Fleet Maintenance Alert</p>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#F8FAFC;">🔧 ${companyName}</h1>
      <p style="margin:6px 0 0;font-size:13px;color:#94A3B8;">${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
    <div style="padding:28px 32px;">
      <p style="margin:0 0 20px;font-size:14px;color:#64748B;line-height:1.6;">Your daily maintenance digest. The following vehicles need attention:</p>
      ${overdueSection}
      ${dueSoonSection}
      <div style="text-align:center;margin-top:8px;">
        <a href="${appUrl}/dashboard/maintenance" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
          Open Maintenance Dashboard →
        </a>
      </div>
    </div>
    <div style="background:#F8FAFC;padding:16px 32px;border-top:1px solid #E2E8F0;">
      <p style="margin:0;font-size:12px;color:#94A3B8;text-align:center;">
        Sent by <strong>Truckerscall</strong> · Daily at 8:00 AM UTC ·
        <a href="${appUrl}/dashboard/settings" style="color:#94A3B8;">Manage Alerts</a>
      </p>
    </div>
  </div>
</body></html>`
}

// needed for the template — close over today
const today = new Date()
