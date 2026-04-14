// ============================================================
// Integration Marketplace — shared types
// ============================================================

export interface TmsIntegration {
    slug: string
    name: string
    description: string
    logoText: string          // short text/emoji for logo placeholder
    category: 'freight_broker' | 'load_board' | 'tms'
    status: 'available' | 'coming_soon'
    authFields: Array<{ name: string; label: string; type: 'text' | 'password' }>
}

// ─── Cargomatic API types ─────────────────────────────────────

export interface CargomaticCredentials {
    username: string
    password: string
    token?: string
}

export interface CargomaticStop {
    stopId: string
    locationName: string
    locationAddress: string
    windowStart: string       // ISO 8601
    windowEnd: string         // ISO 8601
    appointmentConfirmed: boolean
    complete: boolean
    sequence: number
    off_site?: boolean
    missingDocs?: boolean
}

export interface CargomaticShipment {
    shipmentId: string
    shipmentReference: string
    status: string
    stops: CargomaticStop[]
    carrierId?: string
    driver?: {
        _id: string
        first_name: string
        last_name: string
    }
    distance_in_miles?: string
}

export interface CargomaticAuthResponse {
    success: boolean
    token: string
}

export interface CargomaticDocumentUploadRequest {
    entity: 'shipment'
    entityId: string
    referenceNumbers: string[]
    type: 'proof_of_delivery' | 'bill_of_lading' | string
    name: string
    contentType: string
}

export interface CargomaticDocumentUploadResponse {
    originalFileName: string
    presignedUrl: string
}

// ─── Webhook event types ──────────────────────────────────────

export type WebhookEventType = 'load_tender' | 'load_update' | 'load_cancel' | 'unknown'
