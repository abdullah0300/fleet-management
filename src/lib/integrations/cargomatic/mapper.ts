// ============================================================
// Cargomatic → TMS field mapper
// Converts Cargomatic API payloads into database Insert shapes.
// ============================================================

import { JobInsert, JobStopInsert } from '@/types/database'
import { CargomaticShipment, CargomaticStop, WebhookEventType } from '../types'

export function cargomaticShipmentToJobInsert(
    shipment: CargomaticShipment,
    companyId: string,
): JobInsert {
    return {
        company_id: companyId,
        status: 'pending',
        source_integration: 'cargomatic',
        external_job_ref: shipment.shipmentReference,
        notes: `Cargomatic load tender: ${shipment.shipmentReference}`,
        priority: 'normal',
    }
}

export function cargomaticStopToJobStopInsert(
    stop: CargomaticStop,
    jobId: string,
    totalStops: number,
): JobStopInsert {
    const isFirst = stop.sequence === 1
    const isLast = stop.sequence === totalStops

    let type: 'pickup' | 'dropoff' | 'waypoint'
    if (isFirst) type = 'pickup'
    else if (isLast) type = 'dropoff'
    else type = 'waypoint'

    return {
        job_id: jobId,
        sequence_order: stop.sequence,
        type,
        address: stop.locationAddress,
        location_name: stop.locationName,
        window_start: stop.windowStart,
        window_end: stop.windowEnd,
        arrival_mode: 'window',
        status: 'pending',
        external_stop_id: stop.stopId,
    }
}

// ─── Real Cargomatic webhook stop format ──────────────────────

interface CargomaticRealStop {
    sequence: number
    action: 'pickup' | 'deliver' | string
    location: Array<{
        address: string
        name: string
        lat: number
        lng: number
    }>
    window_start: string | null
    window_end: string | null
    _id: string
}

/**
 * Map a stop from the real Cargomatic webhook payload (stop.location[] format).
 */
export function cargomaticRealStopToJobStopInsert(
    stop: CargomaticRealStop,
    jobId: string,
): JobStopInsert {
    const loc = stop.location?.[0]

    let type: 'pickup' | 'dropoff' | 'waypoint'
    if (stop.action === 'pickup') type = 'pickup'
    else if (stop.action === 'deliver') type = 'dropoff'
    else type = 'waypoint'

    return {
        job_id: jobId,
        sequence_order: stop.sequence,
        type,
        address: loc?.address ?? '',
        location_name: loc?.name ?? '',
        latitude: loc?.lat ?? null,
        longitude: loc?.lng ?? null,
        window_start: stop.window_start ?? null,
        window_end: stop.window_end ?? null,
        arrival_mode: 'window',
        status: 'pending',
        external_stop_id: stop._id,
    }
}

/**
 * Detect the webhook event type from the raw Cargomatic payload.
 */
export function detectWebhookEventType(payload: Record<string, unknown>): WebhookEventType {
    // Real Cargomatic format uses an explicit "event" field
    const event = payload.event as string | undefined
    if (event === 'load_tendered') return 'load_tender'
    if (event === 'load_cancelled' || event === 'load_canceled') return 'load_cancel'
    if (event === 'load_updated') return 'load_update'

    // Fallback: infer from action field
    const action = payload.action as string | undefined
    if (action === 'cancel' || action === 'cancelled') return 'load_cancel'
    if (action === 'update') return 'load_update'
    if (action === 'add' || action === 'tender') return 'load_tender'

    // Fallback: infer from status
    const status = payload.status as string | undefined
    if (status === 'cancelled' || status === 'canceled') return 'load_cancel'

    // Fallback: any payload with a shipment reference is a tender
    if (payload.shipmentId || payload.shipmentReference || payload.shipment_reference) {
        return 'load_tender'
    }

    return 'unknown'
}
