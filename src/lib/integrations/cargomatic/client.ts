// ============================================================
// Cargomatic API Client
// Pure HTTP client — zero Supabase dependency.
// All methods auto-refresh the token on 401 (retry once).
// ============================================================

import {
    CargomaticCredentials,
    CargomaticShipment,
    CargomaticDocumentUploadRequest,
    CargomaticDocumentUploadResponse,
} from '../types'

const BASE_URL = process.env.CARGOMATIC_API_URL ?? 'https://api-acceptance.cargomatic.com'

export class CargomaticClient {
    private credentials: CargomaticCredentials

    constructor(credentials: CargomaticCredentials) {
        this.credentials = { ...credentials }
    }

    // ─── Authentication ───────────────────────────────────────

    async authenticate(): Promise<void> {
        const res = await fetch(`${BASE_URL}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: this.credentials.username,
                password: this.credentials.password,
            }),
        })

        if (!res.ok) {
            const body = await res.text()
            throw new Error(`Cargomatic auth failed (${res.status}): ${body}`)
        }

        const data = await res.json()
        if (!data.success || !data.token) {
            throw new Error('Cargomatic auth response missing token')
        }

        this.credentials.token = data.token
    }

    // ─── Core request helper (with 401 retry) ────────────────

    private async request<T>(
        method: string,
        path: string,
        body?: unknown,
    ): Promise<T> {
        if (!this.credentials.token) {
            await this.authenticate()
        }

        const doFetch = () =>
            fetch(`${BASE_URL}${path}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.credentials.token}`,
                },
                body: body ? JSON.stringify(body) : undefined,
            })

        let res = await doFetch()

        if (res.status === 401) {
            // Token expired — re-authenticate and retry once
            await this.authenticate()
            res = await doFetch()
        }

        if (!res.ok) {
            const text = await res.text()
            throw new Error(`Cargomatic ${method} ${path} failed (${res.status}): ${text}`)
        }

        return res.json() as Promise<T>
    }

    // ─── Carrier endpoints ────────────────────────────────────

    /** Accept a load tender — POST /shipments/accept */
    async acceptShipment(shipmentReference: string): Promise<{
        shipmentId: string
        status: string
        carrierId: string
        stops: CargomaticShipment['stops']
    }> {
        return this.request('POST', '/shipments/accept', { shipmentReference })
    }

    /** Confirm or update an appointment window — POST /shipments/appointment */
    async setAppointment(
        shipmentReference: string,
        stopId: string,
        windowStart: string,
        windowEnd: string,
        appointmentConfirmed: boolean,
    ): Promise<{ success: boolean; stop: unknown }> {
        return this.request('POST', '/shipments/appointment', {
            shipmentReference,
            stopId,
            windowStart,
            windowEnd,
            appointmentConfirmed,
        })
    }

    /** Assign a Cargomatic driver to a shipment — POST /shipment/assign */
    async assignDriver(
        offerId: string,
        driverId: string,
    ): Promise<{ success: boolean; jobs: string[] }> {
        return this.request('POST', '/shipment/assign', { offer_id: offerId, driver_id: driverId })
    }

    /** Mark a stop as arrived — POST /stops/transition */
    async transitionStop(
        shipmentReference: string,
        stopId: string,
        date?: string,
    ): Promise<{ success: boolean; data: unknown }> {
        return this.request('POST', '/stops/transition', {
            shipmentReference,
            stopId,
            status: 'arrived',
            meta: date ? { date } : {},
        })
    }

    /** Mark a stop as complete — POST /stops/complete */
    async completeStop(
        stopId: string,
        shipmentReference: string,
        files?: string[],
    ): Promise<{ success: boolean; data: unknown }> {
        return this.request('POST', '/stops/complete', {
            stopId,
            shipmentReference,
            meta: { files: files ?? [] },
        })
    }

    /** Get shipment status — GET /shipments/status */
    async getShipmentStatus(shipmentReference: string): Promise<{
        success: boolean
        shipments: CargomaticShipment[]
    }> {
        return this.request(
            'GET',
            `/shipments/status?shipmentReference=${encodeURIComponent(shipmentReference)}`,
        )
    }

    // ─── Document upload (2-step) ─────────────────────────────

    /**
     * Step 1: Register documents and get presigned S3 upload URLs.
     * POST /create-documents
     */
    async createDocuments(
        docs: CargomaticDocumentUploadRequest[],
    ): Promise<CargomaticDocumentUploadResponse[]> {
        return this.request('POST', '/create-documents', docs)
    }

    /**
     * Step 2: Upload the actual file bytes to the presigned S3 URL.
     * This is a plain PUT — no auth header needed (S3 presigned URL handles it).
     */
    async uploadFileToS3(
        presignedUrl: string,
        fileBuffer: Buffer | ArrayBuffer,
        contentType: string,
    ): Promise<void> {
        const res = await fetch(presignedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body: new Blob([fileBuffer], { type: contentType }),
        })

        if (!res.ok) {
            const text = await res.text()
            throw new Error(`S3 upload failed (${res.status}): ${text}`)
        }
    }
}
