'use server'

/**
 * Server-side manifest notification actions.
 * Called from client hooks (useManifests) after Supabase mutations succeed.
 */

import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
    sendEmail,
    isEmailEnabled,
    getRecipients,
    createNotifications,
} from '@/lib/email'
import { buildManifestDispatchedEmail } from '@/lib/email/templates/manifest-dispatched'
import { buildManifestCancelledEmail } from '@/lib/email/templates/manifest-cancelled'
import { buildCustomerJobCompletedEmail } from '@/lib/email/templates/customer-job-completed'

function getServiceDb() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
}

async function fetchManifestContext(manifestId: string) {
    const db = getServiceDb()
    const { data } = await db
        .from('manifests')
        .select(`
            id, manifest_number, status, company_id,
            scheduled_date, notes,
            driver_id, vehicle_id,
            drivers:driver_id (
                id,
                profiles (id, full_name, email)
            ),
            vehicles:vehicle_id (make, model, license_plate),
            companies:company_id (id, name),
            jobs (
                id, job_number, customer_id, customer_name, customer_email,
                job_stops (type, address, sequence_order),
                customers:customer_id (id, name, email)
            )
        `)
        .eq('id', manifestId)
        .single()

    return data as any
}

// ─── Manifest Dispatched ──────────────────────────────────────────────────────

/**
 * Sends dispatch email to the assigned driver and in-app notifications to the ops team.
 * This supersedes per-job assignment emails for all jobs in this manifest.
 */
export async function notifyManifestDispatched(manifestId: string): Promise<void> {
    const manifest = await fetchManifestContext(manifestId)
    if (!manifest) return

    const companyId: string = manifest.company_id
    const companyName: string = manifest.companies?.name ?? 'Your Company'
    const driverProfile = manifest.drivers?.profiles
    const driverEmail: string | null = driverProfile?.email ?? null
    const driverName: string = driverProfile?.full_name ?? 'Driver'
    const driverId: string | null = manifest.driver_id

    const jobs: any[] = manifest.jobs ?? []
    const totalJobs = jobs.length

    // First pickup address (from first job's first pickup stop)
    const firstJobStops = (jobs[0]?.job_stops ?? []).sort((a: any, b: any) => a.sequence_order - b.sequence_order)
    const firstPickup = firstJobStops.find((s: any) => s.type === 'pickup')?.address

    // ── In-app notifications ──────────────────────────────────────────────────
    const notifications: any[] = []

    // Driver
    if (driverId) {
        notifications.push({
            user_id: driverId,
            type: 'manifest_dispatched',
            title: `Manifest #${manifest.manifest_number} Dispatched`,
            message: `You have been dispatched with ${totalJobs} job${totalJobs !== 1 ? 's' : ''}${manifest.scheduled_date ? ` on ${manifest.scheduled_date}` : ''}.`,
            data: { manifest_id: manifestId, manifest_number: manifest.manifest_number, total_jobs: totalJobs },
        })
    }

    // Ops team
    const ops = await getRecipients(companyId, ['dispatcher', 'fleet_manager', 'admin'])
    for (const r of ops) {
        if (r.id !== driverId) {
            notifications.push({
                user_id: r.id,
                type: 'manifest_dispatched',
                title: `Manifest #${manifest.manifest_number} Dispatched to ${driverName}`,
                message: `${totalJobs} job${totalJobs !== 1 ? 's' : ''} dispatched to ${driverName}.`,
                data: { manifest_id: manifestId, manifest_number: manifest.manifest_number },
            })
        }
    }

    await createNotifications(notifications)

    // ── Email to driver ───────────────────────────────────────────────────────
    const emailEnabled = await isEmailEnabled(companyId, 'manifestEmails')
    if (!emailEnabled || !driverEmail) return

    const vehicle = manifest.vehicles
    const { subject, html } = buildManifestDispatchedEmail({
        driverName,
        driverEmail,
        companyName,
        manifestNumber: manifest.manifest_number,
        manifestId,
        scheduledDate: manifest.scheduled_date ?? undefined,
        totalJobs,
        firstPickupAddress: firstPickup,
        vehicleMake: vehicle?.make ?? undefined,
        vehicleModel: vehicle?.model ?? undefined,
        vehiclePlate: vehicle?.license_plate ?? undefined,
        notes: manifest.notes ?? undefined,
    })

    await sendEmail({ to: driverEmail, subject, html })
}

// ─── Manifest Cancelled ───────────────────────────────────────────────────────

/**
 * Sends cancellation emails to driver, dispatchers, and admins.
 */
export async function notifyManifestCancelled(manifestId: string): Promise<void> {
    const manifest = await fetchManifestContext(manifestId)
    if (!manifest) return

    const companyId: string = manifest.company_id
    const companyName: string = manifest.companies?.name ?? 'Your Company'
    const driverProfile = manifest.drivers?.profiles
    const driverEmail: string | null = driverProfile?.email ?? null
    const driverName: string = driverProfile?.full_name ?? 'Driver'
    const driverId: string | null = manifest.driver_id
    const jobs: any[] = manifest.jobs ?? []

    // ── In-app notifications ──────────────────────────────────────────────────
    const notifications: any[] = []
    const ops = await getRecipients(companyId, ['admin', 'fleet_manager', 'dispatcher'])
    for (const r of ops) {
        notifications.push({
            user_id: r.id,
            type: 'manifest_cancelled',
            title: `Manifest #${manifest.manifest_number} Cancelled`,
            message: `Manifest #${manifest.manifest_number} has been cancelled.`,
            data: { manifest_id: manifestId, manifest_number: manifest.manifest_number },
        })
    }
    if (driverId) {
        notifications.push({
            user_id: driverId,
            type: 'manifest_cancelled',
            title: `Manifest #${manifest.manifest_number} Cancelled`,
            message: `Your manifest #${manifest.manifest_number} has been cancelled. Please check with your dispatcher.`,
            data: { manifest_id: manifestId, manifest_number: manifest.manifest_number },
        })
    }
    await createNotifications(notifications)

    // ── Emails ────────────────────────────────────────────────────────────────
    const emailEnabled = await isEmailEnabled(companyId, 'manifestEmails')
    if (!emailEnabled) return

    const commonData = {
        companyName,
        manifestNumber: manifest.manifest_number,
        manifestId,
        scheduledDate: manifest.scheduled_date ?? undefined,
        totalJobs: jobs.length,
    }

    // Driver
    if (driverEmail) {
        const { subject, html } = buildManifestCancelledEmail({
            ...commonData,
            recipientName: driverName,
            recipientType: 'driver',
        })
        await sendEmail({ to: driverEmail, subject, html })
    }

    // Dispatchers & admins
    for (const r of ops) {
        if (!r.email) continue
        const { subject, html } = buildManifestCancelledEmail({
            ...commonData,
            recipientName: r.full_name,
            recipientType: 'dispatcher',
        })
        await sendEmail({ to: r.email, subject, html })
    }
}

// ─── Manifest Completed ───────────────────────────────────────────────────────

/**
 * Sends completion emails to each unique customer whose jobs are in this manifest.
 * One email per unique customer email address.
 */
export async function notifyManifestCompleted(manifestId: string): Promise<void> {
    const manifest = await fetchManifestContext(manifestId)
    if (!manifest) return

    const companyId: string = manifest.company_id
    const companyName: string = manifest.companies?.name ?? 'Your Company'

    const customerEnabled = await isEmailEnabled(companyId, 'customerEmails')
    if (!customerEnabled) return

    const jobs: any[] = manifest.jobs ?? []

    // Collect unique customers (by email)
    const seen = new Set<string>()
    const customers: { email: string; name: string; jobNumber: string; pickup?: string; delivery?: string }[] = []

    for (const job of jobs) {
        const email = job.customers?.email ?? job.customer_email
        const name = job.customers?.name ?? job.customer_name ?? 'Valued Customer'
        if (!email || seen.has(email)) continue
        seen.add(email)

        const stops = (job.job_stops ?? []).sort((a: any, b: any) => a.sequence_order - b.sequence_order)
        const pickup = stops.find((s: any) => s.type === 'pickup')?.address
        const delivery = stops.filter((s: any) => s.type === 'dropoff').at(-1)?.address

        customers.push({ email, name, jobNumber: job.job_number, pickup, delivery })
    }

    const completedAt = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    for (const customer of customers) {
        const { subject, html } = buildCustomerJobCompletedEmail({
            customerName: customer.name,
            customerEmail: customer.email,
            companyName,
            jobNumber: customer.jobNumber,
            completedAt,
            pickupAddress: customer.pickup,
            deliveryAddress: customer.delivery,
        })
        await sendEmail({
            to: customer.email,
            subject,
            html,
            from: `${companyName} via TruckersCall <alerts@truckerscall.com>`,
        })
    }

    // In-app for ops team
    const ops = await getRecipients(companyId, ['admin', 'fleet_manager', 'dispatcher'])
    await createNotifications(ops.map(r => ({
        user_id: r.id,
        type: 'manifest_completed',
        title: `Manifest #${manifest.manifest_number} Completed`,
        message: `All ${jobs.length} job${jobs.length !== 1 ? 's' : ''} in manifest #${manifest.manifest_number} have been completed.`,
        data: { manifest_id: manifestId, manifest_number: manifest.manifest_number },
    })))
}
