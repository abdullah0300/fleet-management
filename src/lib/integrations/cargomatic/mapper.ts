// ============================================================
// Cargomatic → TMS field mapper
// Converts Cargomatic API payloads into database Insert shapes.
// ============================================================

import { JobInsert, JobStopInsert } from '@/types/database'
import { CargomaticShipment, CargomaticStop, WebhookEventType } from '../types'

/**
 * Map a Cargomatic shipment to a JobInsert.
 * The job is created in 'pending' status — dispatcher assigns driver/vehicle later.
 */
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

/**
 * Map a single Cargomatic stop to a JobStopInsert.
 *
 * @param stop       The Cargomatic stop object
 * @param jobId      The newly created job's UUID
 * @param totalStops Total stop count in this shipment (used to identify last stop)
 */
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

/**
 * Detect the webhook event type from the raw payload.
 * Cargomatic pushes shipment objects — we infer the event type from the status field
 * or any action field if present.
 *
 * Based on the Cargomatic email:
 *   - Load Tenders: new shipments pushed to the webhook
 *   - Load Updates: status changes
 *   - Load Cancels: cancellation events
 */
export function detectWebhookEventType(payload: Record<string, unknown>): WebhookEventType {
    // If the payload has an explicit action field
    const action = payload.action as string | undefined
    if (action === 'cancel' || action === 'cancelled') return 'load_cancel'
    if (action === 'update') return 'load_update'
    if (action === 'add' || action === 'tender') return 'load_tender'

    // Infer from status field
    const status = payload.status as string | undefined
    if (status === 'cancelled' || status === 'canceled') return 'load_cancel'

    // If it has a shipmentReference and no existing status that indicates in-progress,
    // treat as a new tender
    if (payload.shipmentReference || payload.shipment_reference) {
        return 'load_tender'
    }

    return 'unknown'
}
