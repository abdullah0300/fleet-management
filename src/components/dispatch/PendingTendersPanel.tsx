'use client'

import { usePendingTenders, useAcceptTender, useDeclineTender } from '@/hooks/usePendingTenders'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PendingTender } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { Loader2, MapPin, Package, Check, X } from 'lucide-react'

function TenderCard({ tender }: { tender: PendingTender }) {
    const accept = useAcceptTender()
    const decline = useDeclineTender()

    const payload = tender.raw_payload as Record<string, unknown>
    const shipmentData = (payload.shipment ?? payload) as {
        stops?: Array<{ sequence: number; locationName: string; locationAddress: string }>
        distance_in_miles?: string
    }
    const stops = shipmentData.stops ?? []
    const distanceMi = shipmentData.distance_in_miles

    const origin = stops.find(s => s.sequence === 1)
    const destination = stops.length > 0 ? stops[stops.length - 1] : undefined

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

    const isBusy = accept.isPending || decline.isPending

    return (
        <div className="border rounded-lg p-4 space-y-3 bg-card">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                        {tender.shipment_reference}
                    </Badge>
                    <Badge variant="secondary" className="text-xs capitalize">
                        {tender.integration_slug}
                    </Badge>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(tender.received_at), { addSuffix: true })}
                </span>
            </div>

            {(origin || destination) && (
                <div className="space-y-1.5">
                    {origin && (
                        <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground leading-tight">
                                {origin.locationName || origin.locationAddress}
                            </span>
                        </div>
                    )}
                    {destination && destination !== origin && (
                        <div className="flex items-start gap-2 text-sm">
                            <MapPin className="h-3.5 w-3.5 text-red-600 mt-0.5 shrink-0" />
                            <span className="text-muted-foreground leading-tight">
                                {destination.locationName || destination.locationAddress}
                            </span>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {stops.length > 0 && (
                    <span className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        {stops.length} stop{stops.length !== 1 ? 's' : ''}
                    </span>
                )}
                {distanceMi && distanceMi !== 'string' && (
                    <span>{parseFloat(distanceMi).toFixed(0)} mi</span>
                )}
            </div>

            <div className="flex gap-2">
                <Button
                    size="sm"
                    className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700"
                    onClick={handleAccept}
                    disabled={isBusy}
                >
                    {accept.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Check className="h-3.5 w-3.5" />
                    )}
                    Accept
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={handleDecline}
                    disabled={isBusy}
                >
                    {decline.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <X className="h-3.5 w-3.5" />
                    )}
                    Decline
                </Button>
            </div>
        </div>
    )
}

export function PendingTendersPanel() {
    const { data: tenders = [], isLoading } = usePendingTenders()

    if (isLoading) {
        return (
            <div className="p-4 space-y-3">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-40 w-full rounded-lg" />
                ))}
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
