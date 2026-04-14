import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { detectWebhookEventType } from '@/lib/integrations/cargomatic/mapper'

export const runtime = 'nodejs'

// Service-role client — no user session needed for incoming webhooks
function getServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ integration: string }> }
) {
    const { integration } = await params
    const secret = req.nextUrl.searchParams.get('secret')

    if (!secret) {
        return NextResponse.json({ error: 'Missing secret' }, { status: 401 })
    }

    const supabase = getServiceClient()

    // 1. Look up the company via webhook_secret
    const { data: row } = await supabase
        .from('company_integrations')
        .select('id, company_id, integration_slug, status')
        .eq('integration_slug', integration)
        .eq('webhook_secret', secret)
        .single()

    if (!row || row.status !== 'connected') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { company_id: companyId } = row

    // 2. Parse body
    let payload: Record<string, unknown>
    try {
        payload = await req.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // 3. Determine event type
    const eventType = detectWebhookEventType(payload)

    // 4. Handle each event type
    try {
        if (eventType === 'load_tender') {
            await handleLoadTender(supabase, companyId, integration, payload)
        } else if (eventType === 'load_update') {
            await handleLoadUpdate(supabase, companyId, payload)
        } else if (eventType === 'load_cancel') {
            await handleLoadCancel(supabase, companyId, integration, payload)
        } else {
            // Log unknown events but don't error
            await supabase.from('integration_events').insert({
                company_id: companyId,
                integration_slug: integration,
                event_type: 'webhook_received_unknown',
                direction: 'inbound',
                status: 'success',
                payload,
            })
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        await supabase.from('integration_events').insert({
            company_id: companyId,
            integration_slug: integration,
            event_type: `webhook_${eventType}`,
            direction: 'inbound',
            status: 'error',
            error_message: message,
            payload,
        })
        // Return 200 so Cargomatic doesn't retry indefinitely
        return NextResponse.json({ ok: false, error: message }, { status: 200 })
    }

    return NextResponse.json({ ok: true })
}

// ─── Event handlers ───────────────────────────────────────────

async function handleLoadTender(
    supabase: ReturnType<typeof getServiceClient>,
    companyId: string,
    integration: string,
    payload: Record<string, unknown>,
) {
    // Extract shipmentReference from payload
    const shipmentRef =
        (payload.shipmentReference as string) ??
        (payload.shipment_reference as string) ??
        ((payload.shipment as Record<string, unknown>)?.shipmentReference as string) ??
        'UNKNOWN'

    // Insert pending tender
    const { error } = await supabase.from('pending_tenders').insert({
        company_id: companyId,
        integration_slug: integration,
        shipment_reference: shipmentRef,
        raw_payload: payload,
        status: 'pending',
    })

    if (error) throw new Error(`Failed to insert tender: ${error.message}`)

    // Log the event
    await supabase.from('integration_events').insert({
        company_id: companyId,
        integration_slug: integration,
        event_type: 'load_tender',
        direction: 'inbound',
        status: 'success',
        reference: shipmentRef,
        payload: { shipmentReference: shipmentRef },
    })

    // Notify all dispatchers and admins in the company
    const { data: recipients } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', companyId)
        .in('role', ['admin', 'fleet_manager', 'dispatcher'])

    if (recipients && recipients.length > 0) {
        const notifications = recipients.map(r => ({
            user_id: r.id,
            type: 'load_tender',
            title: 'New Load Tender',
            message: `A new load tender (${shipmentRef}) has arrived from ${integration.charAt(0).toUpperCase() + integration.slice(1)}.`,
            data: { shipment_reference: shipmentRef, integration },
            read: false,
        }))
        await supabase.from('notifications').insert(notifications)
    }
}

async function handleLoadUpdate(
    supabase: ReturnType<typeof getServiceClient>,
    companyId: string,
    payload: Record<string, unknown>,
) {
    const shipmentRef =
        (payload.shipmentReference as string) ??
        (payload.shipment_reference as string)

    if (shipmentRef) {
        // Update the raw_payload of any pending tender with this reference
        await supabase
            .from('pending_tenders')
            .update({ raw_payload: payload })
            .eq('company_id', companyId)
            .eq('shipment_reference', shipmentRef)
            .eq('status', 'pending')
    }
}

async function handleLoadCancel(
    supabase: ReturnType<typeof getServiceClient>,
    companyId: string,
    integration: string,
    payload: Record<string, unknown>,
) {
    const shipmentRef =
        (payload.shipmentReference as string) ??
        (payload.shipment_reference as string)

    if (!shipmentRef) return

    // Find the tender
    const { data: tender } = await supabase
        .from('pending_tenders')
        .select('id, job_id')
        .eq('company_id', companyId)
        .eq('shipment_reference', shipmentRef)
        .single()

    if (tender) {
        // Mark the tender as declined
        await supabase
            .from('pending_tenders')
            .update({
                status: 'declined',
                acted_at: new Date().toISOString(),
            })
            .eq('id', tender.id)

        // If a job was already created, cancel it
        if (tender.job_id) {
            await supabase
                .from('jobs')
                .update({ status: 'cancelled' })
                .eq('id', tender.job_id)
        }
    }

    await supabase.from('integration_events').insert({
        company_id: companyId,
        integration_slug: integration,
        event_type: 'load_cancel',
        direction: 'inbound',
        status: 'success',
        reference: shipmentRef,
    })
}
