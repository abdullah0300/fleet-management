'use client'

import { usePendingTenders, useAcceptTender, useDeclineTender } from '@/hooks/usePendingTenders'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PendingTender } from '@/types/database'
import { formatDistanceToNow, format } from 'date-fns'
import { toast } from 'sonner'
import {
    Loader2, Package, Check, X, ArrowUp, ArrowDown, Minus,
    Container, Ship, Building2, DollarSign, FileText, Hash
} from 'lucide-react'

// ─── Payload parsing ──────────────────────────────────────────

interface ParsedStop {
    sequence: number
    action: string
    locationName: string
    address: string
    city: string
    state: string
    windowStart: string | null
    windowEnd: string | null
    equipmentId?: string
    equipmentSize?: number
    equipmentType?: string
}

interface ParsedTender {
    shipmentId: string
    serviceType: string
    shipmentType: string
    movementType: string
    vesselOrRail: string
    shipperName: string
    carrierCost: number | null
    bol: string
    orderId: string
    container: string
    containerSize: number | null
    containerType: string
    specialInstructions: string
    stops: ParsedStop[]
}

function parseTenderPayload(payload: Record<string, unknown>): ParsedTender {
    const shipment = (payload.shipment ?? payload) as Record<string, unknown>
    const refs = ((payload.referenceNumbers ?? shipment.reference_numbers ?? []) as Array<{ name: string; value: string }>)
    const getRef = (name: string) => refs.find(r => r.name === name)?.value ?? ''

    const rawStops = (shipment.stops ?? []) as any[]
    const stops: ParsedStop[] = rawStops.map(s => {
        const loc = s.location?.[0] ?? {}
        const eq = s.equipments?.[0]
        return {
            sequence: s.sequence ?? 0,
            action: s.action ?? '',
            locationName: loc.name ?? s.locationName ?? '',
            address: loc.address ?? s.locationAddress ?? '',
            city: loc.city ?? '',
            state: loc.state ?? '',
            windowStart: s.window_start ?? s.windowStart ?? null,
            windowEnd: s.window_end ?? s.windowEnd ?? null,
            equipmentId: eq?.equipment_id,
            equipmentSize: eq?._equipmentSize,
            equipmentType: eq?._type,
        }
    })

    const firstEq = stops[0]?.equipmentId ? stops[0] : null

    return {
        shipmentId: (payload.shipmentId ?? shipment.shipment_id ?? '') as string,
        serviceType: (shipment.service_type ?? '') as string,
        shipmentType: (shipment.shipment_type ?? '') as string,
        movementType: (shipment.movement_type ?? '') as string,
        vesselOrRail: (shipment.vessel_or_rail ?? '') as string,
        shipperName: ((shipment.shipper as any)?.company_name ?? '') as string,
        carrierCost: shipment.carrier_cost != null ? Number(shipment.carrier_cost) : null,
        bol: getRef('master_bol'),
        orderId: getRef('order_id'),
        container: firstEq?.equipmentId ?? getRef('equipment_id'),
        containerSize: firstEq?.equipmentSize ?? null,
        containerType: firstEq?.equipmentType ?? '',
        specialInstructions: (shipment.special_instructions ?? '') as string,
        stops,
    }
}

// ─── Stop row ─────────────────────────────────────────────────

function StopRow({ stop }: { stop: ParsedStop }) {
    const isPickup = stop.action === 'pickup'
    const isDeliver = stop.action === 'deliver'

    return (
        <div className="flex gap-3 text-sm">
            <div className="flex flex-col items-center gap-0.5 pt-0.5">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                    isPickup ? 'bg-green-100 text-green-700' :
                    isDeliver ? 'bg-red-100 text-red-700' :
                    'bg-muted text-muted-foreground'
                }`}>
                    {isPickup ? <ArrowUp className="h-3 w-3" /> :
                     isDeliver ? <ArrowDown className="h-3 w-3" /> :
                     <Minus className="h-3 w-3" />}
                </div>
                <span className="text-[10px] text-muted-foreground">{stop.sequence}</span>
            </div>
            <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-1.5">
                    <span className="font-medium truncate">{stop.locationName || `Stop ${stop.sequence}`}</span>
                    {stop.city && stop.state && (
                        <span className="text-muted-foreground shrink-0 text-xs">{stop.city}, {stop.state}</span>
                    )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{stop.address}</p>
                {stop.windowStart && stop.windowEnd && (
                    <p className="text-xs text-blue-600 mt-0.5">
                        {format(new Date(stop.windowStart), 'MMM d, h:mm a')} – {format(new Date(stop.windowEnd), 'h:mm a')}
                    </p>
                )}
            </div>
        </div>
    )
}

// ─── Detail row ───────────────────────────────────────────────

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
    if (!value) return null
    return (
        <div className="flex items-start gap-1.5 text-xs">
            <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground shrink-0">{label}:</span>
            <span className="font-medium truncate">{value}</span>
        </div>
    )
}

// ─── Tender card ──────────────────────────────────────────────

function TenderCard({ tender }: { tender: PendingTender }) {
    const accept = useAcceptTender()
    const decline = useDeclineTender()
    const payload = tender.raw_payload as Record<string, unknown>
    const p = parseTenderPayload(payload)
    const isBusy = accept.isPending || decline.isPending

    const handleAccept = async () => {
        const result = await accept.mutateAsync(tender.id)
        if (result.success) {
            toast.success(`Job created from tender ${tender.shipment_reference}`)
        } else {
            toast.error(result.error ?? 'Failed to accept tender')
        }
    }

    const handleDecline = async () => {
        await decline.mutateAsync(tender.id)
        toast('Tender declined')
    }

    const serviceLabel = [p.serviceType, p.shipmentType, p.movementType]
        .filter(Boolean)
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' · ')

    const containerLabel = p.container
        ? `${p.container}${p.containerSize ? ` · ${p.containerSize}ft` : ''}${p.containerType ? ` ${p.containerType}` : ''}`
        : ''

    return (
        <div className="border rounded-lg bg-card overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 px-4 py-3 border-b bg-muted/30">
                <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="font-mono text-xs">{tender.shipment_reference}</Badge>
                    <Badge variant="secondary" className="text-xs capitalize">{tender.integration_slug}</Badge>
                    {serviceLabel && (
                        <Badge variant="outline" className="text-xs text-blue-700 border-blue-200 bg-blue-50">
                            {serviceLabel}
                        </Badge>
                    )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(tender.received_at), { addSuffix: true })}
                </span>
            </div>

            <div className="p-4 space-y-4">
                {/* Stops */}
                {p.stops.length > 0 && (
                    <div className="space-y-2">
                        {p.stops.map(stop => (
                            <StopRow key={stop.sequence} stop={stop} />
                        ))}
                    </div>
                )}

                <div className="border-t" />

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    <DetailRow icon={FileText} label="BOL" value={p.bol} />
                    <DetailRow icon={Hash} label="Order" value={p.orderId} />
                    <DetailRow icon={Container} label="Container" value={containerLabel} />
                    <DetailRow icon={Ship} label="Vessel" value={p.vesselOrRail} />
                    <DetailRow icon={Building2} label="Shipper" value={p.shipperName} />
                    <DetailRow
                        icon={DollarSign}
                        label="Rate"
                        value={p.carrierCost != null ? `$${p.carrierCost.toFixed(2)}` : ''}
                    />
                </div>

                {p.specialInstructions && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                        {p.specialInstructions}
                    </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                    <Button
                        size="sm"
                        className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700"
                        onClick={handleAccept}
                        disabled={isBusy}
                    >
                        {accept.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Accept
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-destructive hover:text-destructive"
                        onClick={handleDecline}
                        disabled={isBusy}
                    >
                        {decline.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                        Decline
                    </Button>
                </div>
            </div>
        </div>
    )
}

// ─── Panel ────────────────────────────────────────────────────

export function PendingTendersPanel() {
    const { data: tenders = [], isLoading } = usePendingTenders()

    if (isLoading) {
        return (
            <div className="p-4 space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-64 w-full rounded-lg" />)}
            </div>
        )
    }

    if (tenders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Package className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No pending tenders</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                    Load tenders from connected integrations will appear here for review.
                </p>
            </div>
        )
    }

    return (
        <div className="p-4 space-y-3 overflow-y-auto h-full">
            {tenders.map((tender: PendingTender) => (
                <TenderCard key={tender.id} tender={tender} />
            ))}
        </div>
    )
}
