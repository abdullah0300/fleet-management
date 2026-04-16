'use server'

/**
 * Server-side job notification actions.
 * Called from client hooks (useJobs) after Supabase mutations succeed.
 * Each function fetches the full job context using the service role client,
 * then sends the appropriate in-app + email notifications.
 */

import { createClient as createServiceClient } from '@supabase/supabase-js'
import {
    sendEmail,
    isEmailEnabled,
    getRecipients,
    createNotifications,
    APP_URL,
} from '@/lib/email'
import { buildJobAssignedEmail } from '@/lib/email/templates/job-assigned'
import { buildJobCancelledEmail } from '@/lib/email/templates/job-cancelled'
import { buildCustomerJobStartedEmail } from '@/lib/email/templates/customer-job-started'
import { buildCustomerJobCompletedEmail } from '@/lib/email/templates/customer-job-completed'
import { buildCustomerJobCancelledEmail } from '@/lib/email/templates/customer-job-cancelled'

function getServiceDb() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
}

// ─── Helper: fetch job with all needed relations ──────────────────────────────

async function fetchJobContext(jobId: string) {
    const db = getServiceDb()
    const { data } = await db
        .from('jobs')
        .select(`
            id, job_number, status, manifest_id, company_id,
            scheduled_date, scheduled_time, notes,
            customer_id, customer_name, customer_email,
            driver_id,
            vehicle_id,
            job_stops (type, address, sequence_order),
            drivers:driver_id (
                id,
                profiles (id, full_name, email)
            ),
            vehicles:vehicle_id (make, model, license_plate),
            companies:company_id (id, name),
            customers:customer_id (id, name, email)
        `)
        .eq('id', jobId)
        .single()

    return data as any
}

// ─── Job Assigned ─────────────────────────────────────────────────────────────

/**
 * Called when a standalone job (no manifest) is assigned to a driver.
 * Emails the driver. Sends in-app to driver + dispatcher/fleet_manager.
 * Skipped automatically if job belongs to a manifest (manifest dispatch handles it).
 */
export async function notifyJobAssigned(jobId: string): Promise<void> {
    const job = await fetchJobContext(jobId)
    if (!job) return

    // Skip — manifest dispatch email supersedes individual job emails
    if (job.manifest_id) return

    const companyId: string = job.company_id
    const companyName: string = job.companies?.name ?? 'Your Company'
    const driverProfile = job.drivers?.profiles
    const driverEmail: string | null = driverProfile?.email ?? null
    const driverName: string = driverProfile?.full_name ?? 'Driver'
    const driverId: string | null = job.driver_id

    // Sort stops for pickup/delivery addresses
    const stops = (job.job_stops ?? []).sort((a: any, b: any) => a.sequence_order - b.sequence_order)
    const pickup = stops.find((s: any) => s.type === 'pickup')?.address
    const delivery = stops.filter((s: any) => s.type === 'dropoff').at(-1)?.address

    // ── In-app notification for driver ────────────────────────────────────────
    const notifications: any[] = []
    if (driverId) {
        notifications.push({
            user_id: driverId,
            type: 'job_assigned',
            title: `Job #${job.job_number} Assigned`,
            message: `You have been assigned job #${job.job_number}${job.scheduled_date ? ` scheduled for ${job.scheduled_date}` : ''}.`,
            data: { job_id: jobId, job_number: job.job_number },
        })
    }

    // ── In-app notifications for dispatchers/fleet managers ───────────────────
    const ops = await getRecipients(companyId, ['dispatcher', 'fleet_manager'])
    for (const r of ops) {
        if (r.id !== driverId) {
            notifications.push({
                user_id: r.id,
                type: 'job_assigned',
                title: `Job #${job.job_number} Assigned to ${driverName}`,
                message: `Job #${job.job_number} has been assigned to ${driverName}.`,
                data: { job_id: jobId, job_number: job.job_number },
            })
        }
    }

    await createNotifications(notifications)

    // ── Email to driver ───────────────────────────────────────────────────────
    const emailEnabled = await isEmailEnabled(companyId, 'jobAssignmentEmails')
    if (!emailEnabled || !driverEmail) return

    const vehicle = job.vehicles
    const { subject, html } = buildJobAssignedEmail({
        driverName,
        driverEmail,
        companyName,
        jobNumber: job.job_number,
        jobId,
        scheduledDate: job.scheduled_date ?? undefined,
        scheduledTime: job.scheduled_time ?? undefined,
        pickupAddress: pickup,
        deliveryAddress: delivery,
        customerName: job.customers?.name ?? job.customer_name ?? undefined,
        notes: job.notes ?? undefined,
        vehicleMake: vehicle?.make ?? undefined,
        vehicleModel: vehicle?.model ?? undefined,
        vehiclePlate: vehicle?.license_plate ?? undefined,
    })

    await sendEmail({ to: driverEmail, subject, html })
}

// ─── Job Cancelled ────────────────────────────────────────────────────────────

/**
 * Called when a job is cancelled.
 * Emails driver (if assigned), dispatchers, admins, and customer (if email on record).
 * NOT sent to accountants or platform admins.
 */
export async function notifyJobCancelled(jobId: string): Promise<void> {
    const job = await fetchJobContext(jobId)
    if (!job) return

    const companyId: string = job.company_id
    const companyName: string = job.companies?.name ?? 'Your Company'
    const driverProfile = job.drivers?.profiles
    const driverEmail: string | null = driverProfile?.email ?? null
    const driverName: string = driverProfile?.full_name ?? 'Driver'
    const driverId: string | null = job.driver_id

    const stops = (job.job_stops ?? []).sort((a: any, b: any) => a.sequence_order - b.sequence_order)
    const pickup = stops.find((s: any) => s.type === 'pickup')?.address
    const delivery = stops.filter((s: any) => s.type === 'dropoff').at(-1)?.address

    // ── In-app notifications ──────────────────────────────────────────────────
    const notifications: any[] = []
    const ops = await getRecipients(companyId, ['admin', 'fleet_manager', 'dispatcher'])

    for (const r of ops) {
        notifications.push({
            user_id: r.id,
            type: 'job_cancelled',
            title: `Job #${job.job_number} Cancelled`,
            message: `Job #${job.job_number} has been cancelled.`,
            data: { job_id: jobId, job_number: job.job_number },
        })
    }
    if (driverId) {
        notifications.push({
            user_id: driverId,
            type: 'job_cancelled',
            title: `Job #${job.job_number} Cancelled`,
            message: `Your assigned job #${job.job_number} has been cancelled.`,
            data: { job_id: jobId, job_number: job.job_number },
        })
    }
    await createNotifications(notifications)

    // ── Emails ────────────────────────────────────────────────────────────────
    const emailEnabled = await isEmailEnabled(companyId, 'jobAssignmentEmails')
    if (!emailEnabled) return

    const commonData = {
        companyName,
        jobNumber: job.job_number,
        jobId,
        scheduledDate: job.scheduled_date ?? undefined,
        pickupAddress: pickup,
        deliveryAddress: delivery,
        customerName: job.customers?.name ?? job.customer_name ?? undefined,
    }

    // Driver
    if (driverEmail) {
        const { subject, html } = buildJobCancelledEmail({
            ...commonData,
            recipientName: driverName,
            recipientType: 'driver',
        })
        await sendEmail({ to: driverEmail, subject, html })
    }

    // Dispatchers & admins
    for (const r of ops) {
        if (!r.email) continue
        const { subject, html } = buildJobCancelledEmail({
            ...commonData,
            recipientName: r.full_name,
            recipientType: r.id === r.id ? 'dispatcher' : 'admin',
        })
        await sendEmail({ to: r.email, subject, html })
    }

    // Customer email (external — no login required)
    const customerEmail = job.customers?.email ?? job.customer_email
    const customerName = job.customers?.name ?? job.customer_name
    if (customerEmail) {
        const customerEnabled = await isEmailEnabled(companyId, 'customerEmails')
        if (customerEnabled) {
            const { subject, html } = buildCustomerJobCancelledEmail({
                customerName: customerName ?? 'Valued Customer',
                customerEmail,
                companyName,
                jobNumber: job.job_number,
                scheduledDate: job.scheduled_date ?? undefined,
                pickupAddress: pickup,
                deliveryAddress: delivery,
            })
            await sendEmail({
                to: customerEmail,
                subject,
                html,
                from: `${companyName} via TruckersCall <alerts@truckerscall.com>`,
            })
        }
    }
}

// ─── Job Completed ────────────────────────────────────────────────────────────

/**
 * Called when a job is marked as completed.
 * Sends in-app to dispatchers/fleet_managers/admin.
 * Emails customer if they have an email address.
 */
export async function notifyJobCompleted(jobId: string): Promise<void> {
    const job = await fetchJobContext(jobId)
    if (!job) return

    const companyId: string = job.company_id
    const companyName: string = job.companies?.name ?? 'Your Company'

    const stops = (job.job_stops ?? []).sort((a: any, b: any) => a.sequence_order - b.sequence_order)
    const pickup = stops.find((s: any) => s.type === 'pickup')?.address
    const delivery = stops.filter((s: any) => s.type === 'dropoff').at(-1)?.address

    // ── In-app notifications for ops team ─────────────────────────────────────
    const ops = await getRecipients(companyId, ['admin', 'fleet_manager', 'dispatcher'])
    await createNotifications(ops.map(r => ({
        user_id: r.id,
        type: 'job_completed',
        title: `Job #${job.job_number} Completed`,
        message: `Job #${job.job_number} has been marked as completed.`,
        data: { job_id: jobId, job_number: job.job_number },
    })))

    // ── Customer email ────────────────────────────────────────────────────────
    const customerEmail = job.customers?.email ?? job.customer_email
    const customerName = job.customers?.name ?? job.customer_name

    if (!customerEmail) return

    const customerEnabled = await isEmailEnabled(companyId, 'customerEmails')
    if (!customerEnabled) return

    const driverProfile = job.drivers?.profiles
    const { subject, html } = buildCustomerJobCompletedEmail({
        customerName: customerName ?? 'Valued Customer',
        customerEmail,
        companyName,
        jobNumber: job.job_number,
        completedAt: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        pickupAddress: pickup,
        deliveryAddress: delivery,
        driverName: driverProfile?.full_name ?? undefined,
    })

    await sendEmail({
        to: customerEmail,
        subject,
        html,
        from: `${companyName} via TruckersCall <alerts@truckerscall.com>`,
    })
}

// ─── Customer Job Started ─────────────────────────────────────────────────────

/**
 * Called when a job moves to in_progress status.
 * Only sends external customer email — no in-app (handled by existing flow).
 */
export async function notifyCustomerJobStarted(jobId: string): Promise<void> {
    const job = await fetchJobContext(jobId)
    if (!job) return

    const companyId: string = job.company_id
    const companyName: string = job.companies?.name ?? 'Your Company'
    const customerEmail = job.customers?.email ?? job.customer_email
    const customerName = job.customers?.name ?? job.customer_name

    if (!customerEmail) return

    const customerEnabled = await isEmailEnabled(companyId, 'customerEmails')
    if (!customerEnabled) return

    const stops = (job.job_stops ?? []).sort((a: any, b: any) => a.sequence_order - b.sequence_order)
    const pickup = stops.find((s: any) => s.type === 'pickup')?.address
    const delivery = stops.filter((s: any) => s.type === 'dropoff').at(-1)?.address
    const driverProfile = job.drivers?.profiles

    const { subject, html } = buildCustomerJobStartedEmail({
        customerName: customerName ?? 'Valued Customer',
        customerEmail,
        companyName,
        jobNumber: job.job_number,
        scheduledDate: job.scheduled_date ?? undefined,
        scheduledTime: job.scheduled_time ?? undefined,
        pickupAddress: pickup,
        deliveryAddress: delivery,
        driverName: driverProfile?.full_name ?? undefined,
    })

    await sendEmail({
        to: customerEmail,
        subject,
        html,
        from: `${companyName} via TruckersCall <alerts@truckerscall.com>`,
    })
}
