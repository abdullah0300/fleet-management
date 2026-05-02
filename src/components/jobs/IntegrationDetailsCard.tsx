'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plug, Save, Container } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface IntegrationDetailsCardProps {
    jobId: string
    sourceIntegration: string | null
    integrationMetadata: Record<string, unknown> | null
}

const supabase = createClient()

/**
 * Renders an integration-specific details card on the Job Detail page.
 * Only visible when source_integration is not null.
 * Reads from integration_metadata and allows editing of editable fields (e.g. chassis).
 * Adding a new integration: add a new case block below — zero core TMS changes needed.
 */
export function IntegrationDetailsCard({
    jobId,
    sourceIntegration,
    integrationMetadata,
}: IntegrationDetailsCardProps) {
    // Not a Cargomatic / integration job — render nothing
    if (!sourceIntegration) return null

    const meta = integrationMetadata ?? {}

    if (sourceIntegration === 'cargomatic') {
        return (
            <CargomaticDetailsCard
                jobId={jobId}
                meta={meta}
            />
        )
    }

    // Future integrations: add cases here
    // if (sourceIntegration === 'dat') return <DatDetailsCard ... />

    return null
}

// ─── Cargomatic-specific panel ────────────────────────────────

function CargomaticDetailsCard({ jobId, meta }: { jobId: string; meta: Record<string, unknown> }) {
    const [chassis, setChassis]     = useState<string>((meta.chassis as string) ?? '')
    const [trailerId, setTrailerId] = useState<string>((meta.trailerId as string) ?? '')
    const [isSaving, setIsSaving]   = useState(false)

    const isDrayage = meta.shipmentType === 'drayage'

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const updatedMeta = {
                ...meta,
                chassis:   chassis.trim() || null,
                trailerId: trailerId.trim() || null,
            }
            const { error } = await supabase
                .from('jobs')
                .update({ integration_metadata: updatedMeta })
                .eq('id', jobId)

            if (error) throw error
            toast.success('Integration details saved')
        } catch (err: any) {
            toast.error('Failed to save', { description: err.message })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Card className="border-blue-100 bg-blue-50/30">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Plug className="h-4 w-4 text-blue-600" />
                    Cargomatic Details
                    <Badge variant="outline" className="ml-auto text-[10px] border-blue-200 text-blue-700 bg-white">
                        {meta.shipmentType as string ?? 'Unknown Type'}
                    </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                    Auto-filled from the Cargomatic load tender. Enter missing fields before submitting.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Auto-filled read-only fields */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                    {!!meta.containerId && (
                        <div className="col-span-2 flex items-center gap-2 p-2 bg-white rounded border border-blue-100">
                            <Container className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            <div>
                                <span className="text-muted-foreground block uppercase tracking-wider text-[10px]">Container ID</span>
                                <span className="font-mono font-semibold text-sm">{String(meta.containerId)}</span>
                            </div>
                        </div>
                    )}
                    {!!meta.vesselName && (
                        <div className="col-span-2 p-2 bg-white rounded border border-blue-100">
                            <span className="text-muted-foreground block uppercase tracking-wider text-[10px]">Vessel / Rail</span>
                            <span className="font-medium text-sm">{String(meta.vesselName)}</span>
                        </div>
                    )}
                    {!!meta.masterBol && (
                        <div className="p-2 bg-white rounded border border-blue-100">
                            <span className="text-muted-foreground block uppercase tracking-wider text-[10px]">Master BOL</span>
                            <span className="font-medium text-sm">{String(meta.masterBol)}</span>
                        </div>
                    )}
                    {!!meta.orderId && (
                        <div className="p-2 bg-white rounded border border-blue-100">
                            <span className="text-muted-foreground block uppercase tracking-wider text-[10px]">Order ID</span>
                            <span className="font-medium text-sm">{String(meta.orderId)}</span>
                        </div>
                    )}
                </div>

                {/* Editable fields — only for drayage loads */}
                {isDrayage && (
                    <div className="space-y-3 pt-2 border-t border-blue-100">
                        <p className="text-[11px] text-amber-700 font-medium bg-amber-50 px-2 py-1.5 rounded border border-amber-100">
                            ⚠️ Enter chassis number before submitting to Cargomatic.
                        </p>
                        <div className="space-y-1">
                            <Label htmlFor={`chassis-${jobId}`} className="text-xs">Chassis # <span className="text-amber-600">(required for submission)</span></Label>
                            <Input
                                id={`chassis-${jobId}`}
                                value={chassis}
                                onChange={(e) => setChassis(e.target.value)}
                                placeholder="e.g. DCLU123456"
                                className="h-8 text-sm font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor={`trailer-${jobId}`} className="text-xs">Trailer ID <span className="text-muted-foreground">(if applicable)</span></Label>
                            <Input
                                id={`trailer-${jobId}`}
                                value={trailerId}
                                onChange={(e) => setTrailerId(e.target.value)}
                                placeholder="e.g. TRIU-12345"
                                className="h-8 text-sm font-mono"
                            />
                        </div>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Save className="h-3.5 w-3.5 mr-1.5" />
                            {isSaving ? 'Saving...' : 'Save Integration Details'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
