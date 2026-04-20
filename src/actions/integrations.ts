'use server'

import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { encrypt, decrypt } from '@/lib/encryption'
import { CargomaticClient } from '@/lib/integrations/cargomatic/client'
import {
    cargomaticShipmentToJobInsert,
    cargomaticStopToJobStopInsert,
    cargomaticRealStopToJobStopInsert,
} from '@/lib/integrations/cargomatic/mapper'
import { CargomaticCredentials } from '@/lib/integrations/types'
import { JobStopInsert } from '@/types/database'

// ─── Geocoding helper ─────────────────────────────────────────

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!key || !address) return null
    try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`
        const res = await fetch(url)
        const data = await res.json()
        if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
            return data.results[0].geometry.location
        }
    } catch {
        // silently skip — map just won't show route
    }
    return null
}

// ─── Service-role client (bypasses RLS for writes) ───────────
function getServiceClient() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// ─── Helpers ─────────────────────────────────────────────────

function maskUsername(username: string): string {
    if (!username) return '***'
    const at = username.indexOf('@')
    if (at > 0) {
        // looks like an email — mask middle
        const local = username.slice(0, at)
        const domain = username.slice(at)
        if (local.length <= 2) return `${local[0]}***${domain}`
        return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 4))}${domain}`
    }
    // plain username
    if (username.length <= 3) return `${username[0]}***`
    return `${username[0]}${'*'.repeat(Math.min(username.length - 1, 4))}${username.slice(-1)}`
}

function buildCargomaticNotes(payload: Record<string, unknown>, shipmentRef: string): string {
    const shipment = payload.shipment as Record<string, unknown> | undefined
    const refs = ((payload.referenceNumbers ?? shipment?.reference_numbers ?? []) as Array<{ name: string; value: string }>)
    const getRef = (name: string) => refs.find(r => r.name === name)?.value ?? ''

    const bol = getRef('master_bol')
    const orderId = getRef('order_id')

    const firstStop = (shipment?.stops as any[])?.[0]
    const eq = firstStop?.equipments?.[0]
    const container = eq
        ? `${eq.equipment_id} (${eq._equipmentSize}ft ${eq._type})`
        : getRef('equipment_id')

    const lines: string[] = [
        `Cargomatic Load: ${shipmentRef}`,
        bol && `BOL: ${bol}`,
        orderId && `Order: ${orderId}`,
        container && `Container: ${container}`,
        (shipment?.vessel_or_rail as string) && `Vessel: ${shipment?.vessel_or_rail}`,
        [shipment?.service_type, shipment?.shipment_type, shipment?.movement_type]
            .filter(Boolean).length > 0 &&
            `Service: ${[shipment?.service_type, shipment?.shipment_type, shipment?.movement_type].filter(Boolean).join(' / ')}`,
        (shipment?.shipper as any)?.company_name && `Shipper: ${(shipment?.shipper as any).company_name}`,
        shipment?.carrier_cost != null && `Rate: $${Number(shipment.carrier_cost).toFixed(2)}`,
        (shipment?.special_instructions as string) && `Instructions: ${shipment?.special_instructions}`,
    ]

    return lines.filter(Boolean).join('\n')
}

async function getAuthenticatedCompanyId(): Promise<{ companyId: string; userId: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', user.id)
        .single()

    if (!profile?.company_id) throw new Error('No company associated with this user')
    return { companyId: profile.company_id, userId: user.id }
}

// ─── Public server actions ────────────────────────────────────

/**
 * Get the current connection status for an integration (no credentials returned).
 */
export async function getIntegrationStatus(slug: string): Promise<{
    status: 'connected' | 'disconnected' | 'error'
    maskedUsername: string | null
    connectedAt: string | null
    webhookUrl: string | null
} | null> {
    const supabase = await createClient()
    const { companyId } = await getAuthenticatedCompanyId()

    const { data } = await supabase
        .from('company_integrations')
        .select('status, credentials, webhook_secret, connected_at')
        .eq('company_id', companyId)
        .eq('integration_slug', slug)
        .single()

    if (!data) return { status: 'disconnected', maskedUsername: null, connectedAt: null, webhookUrl: null }

    let maskedUsername: string | null = null
    if (data.credentials) {
        try {
            const creds: CargomaticCredentials = JSON.parse(decrypt(data.credentials))
            maskedUsername = maskUsername(creds.username)
        } catch {
            // ignore decryption errors for display purposes
        }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const webhookUrl = data.webhook_secret
        ? `${appUrl}/api/webhooks/${slug}?secret=${data.webhook_secret}`
        : null

    return {
        status: data.status as 'connected' | 'disconnected' | 'error',
        maskedUsername,
        connectedAt: data.connected_at,
        webhookUrl,
    }
}

/**
 * Connect an integration — authenticates against the broker, encrypts credentials,
 * generates a webhook secret, and saves the connection.
 */
export async function connectIntegration(
    slug: string,
    credentials: { username: string; password: string },
): Promise<{ success: boolean; webhookUrl: string; error?: string }> {
    const { companyId, userId } = await getAuthenticatedCompanyId()
    const serviceDb = getServiceClient()

    // Validate credentials by attempting authentication
    if (slug === 'cargomatic') {
        const client = new CargomaticClient(credentials)
        try {
            await client.authenticate()
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Authentication failed'
            return { success: false, webhookUrl: '', error: message }
        }
    }

    const encryptedCreds = encrypt(JSON.stringify(credentials))
    const webhookSecret = randomBytes(32).toString('hex')
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const webhookUrl = `${appUrl}/api/webhooks/${slug}?secret=${webhookSecret}`

    const { error } = await serviceDb
        .from('company_integrations')
        .upsert({
            company_id: companyId,
            integration_slug: slug,
            status: 'connected',
            credentials: encryptedCreds,
            webhook_secret: webhookSecret,
            connected_by: userId,
            connected_at: new Date().toISOString(),
        }, { onConflict: 'company_id,integration_slug' })

    if (error) {
        return { success: false, webhookUrl: '', error: error.message }
    }

    // Log connection event
    await serviceDb.from('integration_events').insert({
        company_id: companyId,
        integration_slug: slug,
        event_type: 'connect',
        direction: 'outbound',
        status: 'success',
        reference: null,
    })

    return { success: true, webhookUrl }
}

/**
 * Disconnect an integration — clears credentials and webhook secret.
 */
export async function disconnectIntegration(slug: string): Promise<{ success: boolean }> {
    const { companyId } = await getAuthenticatedCompanyId()
    const serviceDb = getServiceClient()

    await serviceDb
        .from('company_integrations')
        .update({
            status: 'disconnected',
            credentials: null,
            webhook_secret: null,
            connected_at: null,
            connected_by: null,
        })
        .eq('company_id', companyId)
        .eq('integration_slug', slug)

    await serviceDb.from('integration_events').insert({
        company_id: companyId,
        integration_slug: slug,
        event_type: 'disconnect',
        direction: 'outbound',
        status: 'success',
    })

    return { success: true }
}

/**
 * Accept a pending tender: calls Cargomatic API, creates the job, updates tender.
 */
export async function acceptTender(tenderId: string): Promise<{
    success: boolean
    jobId?: string
    error?: string
}> {
    const { companyId, userId } = await getAuthenticatedCompanyId()
    const serviceDb = getServiceClient()

    // 1. Fetch the tender
    const { data: tender, error: tenderErr } = await serviceDb
        .from('pending_tenders')
        .select('*')
        .eq('id', tenderId)
        .eq('company_id', companyId)
        .single()

    if (tenderErr || !tender) {
        return { success: false, error: 'Tender not found' }
    }
    if (tender.status !== 'pending') {
        return { success: false, error: `Tender already ${tender.status}` }
    }
    if (tender.job_id) {
        return { success: false, error: 'Tender already accepted' }
    }

    // 2. Fetch and decrypt Cargomatic credentials
    const { data: integration } = await serviceDb
        .from('company_integrations')
        .select('credentials')
        .eq('company_id', companyId)
        .eq('integration_slug', tender.integration_slug)
        .single()

    if (!integration?.credentials) {
        return { success: false, error: 'Integration not connected' }
    }

    let creds: CargomaticCredentials
    try {
        creds = JSON.parse(decrypt(integration.credentials))
    } catch {
        return { success: false, error: 'Failed to decrypt credentials' }
    }

    // 3. Call Cargomatic API to accept the shipment
    const client = new CargomaticClient(creds)
    try {
        await client.acceptShipment(tender.shipment_reference)
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Cargomatic API error'
        await serviceDb.from('integration_events').insert({
            company_id: companyId,
            integration_slug: tender.integration_slug,
            event_type: 'accept_shipment',
            direction: 'outbound',
            status: 'error',
            reference: tender.shipment_reference,
            error_message: message,
        })
        return { success: false, error: message }
    }

    // 4. Build the job from the raw payload
    const rawPayload = tender.raw_payload as Record<string, unknown>

    // Real Cargomatic format: { event, shipmentId, shipment: { stops: [...] } }
    // Fallback test format:   { shipmentReference, stops: [...] }
    const isRealFormat = !!(rawPayload.event && rawPayload.shipment)
    const shipmentObj = (rawPayload.shipment ?? rawPayload) as Record<string, unknown>
    const stops = (shipmentObj.stops ?? []) as any[]

    // Build rich notes from Cargomatic payload
    const notes = buildCargomaticNotes(rawPayload, tender.shipment_reference)

    // Create job
    const jobInsert = {
        ...cargomaticShipmentToJobInsert(
            {
                shipmentId: (shipmentObj.id ?? shipmentObj.shipment_id ?? '') as string,
                shipmentReference: tender.shipment_reference,
                status: 'pending',
                stops: [],
            },
            companyId,
        ),
        notes,
    }

    const { data: jobData, error: jobErr } = await serviceDb
        .from('jobs')
        .insert([jobInsert])
        .select('id')
        .single()

    if (jobErr || !jobData) {
        return { success: false, error: jobErr?.message ?? 'Failed to create job' }
    }

    // Insert job stops
    if (stops.length > 0) {
        let stopsInsert: JobStopInsert[]

        if (isRealFormat) {
            // Real Cargomatic payload — lat/lng already in stop.location[0]
            stopsInsert = stops.map((s: any) =>
                cargomaticRealStopToJobStopInsert(s, jobData.id)
            )
        } else {
            // Test/legacy format — geocode addresses
            stopsInsert = await Promise.all(
                stops.map(async (s: any) => {
                    const base = cargomaticStopToJobStopInsert(s, jobData.id, stops.length)
                    const coords = await geocodeAddress(s.locationAddress)
                    return coords ? { ...base, latitude: coords.lat, longitude: coords.lng } : base
                })
            )
        }

        const { error: stopsErr } = await serviceDb.from('job_stops').insert(stopsInsert)
        if (stopsErr) {
            // Job was created — don't roll back, just log the error
            console.error('Failed to insert job stops for tender:', tenderId, stopsErr)
        }
    }

    // 5. Update the tender
    await serviceDb
        .from('pending_tenders')
        .update({
            status: 'accepted',
            job_id: jobData.id,
            acted_by: userId,
            acted_at: new Date().toISOString(),
        })
        .eq('id', tenderId)

    // 6. Log success event
    await serviceDb.from('integration_events').insert({
        company_id: companyId,
        integration_slug: tender.integration_slug,
        event_type: 'accept_shipment',
        direction: 'outbound',
        status: 'success',
        reference: tender.shipment_reference,
        payload: { tender_id: tenderId, job_id: jobData.id },
    })

    return { success: true, jobId: jobData.id }
}

/**
 * Decline a pending tender.
 */
export async function declineTender(tenderId: string): Promise<{ success: boolean }> {
    const { companyId, userId } = await getAuthenticatedCompanyId()
    const serviceDb = getServiceClient()

    const { data: tender } = await serviceDb
        .from('pending_tenders')
        .select('integration_slug, shipment_reference')
        .eq('id', tenderId)
        .eq('company_id', companyId)
        .single()

    await serviceDb
        .from('pending_tenders')
        .update({
            status: 'declined',
            acted_by: userId,
            acted_at: new Date().toISOString(),
        })
        .eq('id', tenderId)

    if (tender) {
        await serviceDb.from('integration_events').insert({
            company_id: companyId,
            integration_slug: tender.integration_slug,
            event_type: 'decline_tender',
            direction: 'outbound',
            status: 'success',
            reference: tender.shipment_reference,
        })
    }

    return { success: true }
}
