'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Wrench, CheckCircle2, Clock, Truck, Calendar, DollarSign, AlertTriangle, Gauge, Plus, ChevronRight } from 'lucide-react'
import { useMaintenance, useCompleteMaintenance } from '@/hooks/useMaintenance'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MaintenanceCard } from '@/components/maintenance/MaintenanceCard'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function MaintenanceDetailPage() {
    const params = useParams()
    const router = useRouter()
    const vehicleId = params.id as string

    const { data: maintenanceData, isLoading } = useMaintenance({ vehicleId })
    const completeMutation = useCompleteMaintenance()

    const records = maintenanceData?.data || []
    const completedRecords = records.filter(r => r.status === 'completed')
    const pendingRecords = records.filter(r => r.status !== 'completed')

    // Get vehicle info from first record
    const vehicleInfo = records[0]?.vehicles

    // Calculate totals
    const totalSpent = records.reduce((acc, r) => {
        const parts = (r as any).parts_cost || 0
        const labor = (r as any).labor_cost || 0
        const itemized = parts + labor
        return acc + (itemized > 0 ? itemized : (r.cost || 0))
    }, 0)

    const handleComplete = async (id: string) => {
        if (!confirm('Mark this maintenance as completed?')) return
        try {
            await completeMutation.mutateAsync({ id })
            toast.success('Maintenance completed')
        } catch {
            toast.error('Failed to complete')
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-[250px]" />
                        <Skeleton className="h-4 w-[150px]" />
                    </div>
                </div>
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 mt-0.5">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Wrench className="h-5 w-5 text-primary" />
                            Vehicle Maintenance
                        </h1>
                        {vehicleInfo && (
                            <p className="text-muted-foreground text-xs sm:text-sm flex items-center gap-1.5 mt-1">
                                <Truck className="h-3 w-3" />
                                {vehicleInfo.make} {vehicleInfo.model} — {vehicleInfo.license_plate}
                                {vehicleInfo.odometer_reading && (
                                    <Badge variant="outline" className="text-[10px] ml-1 gap-1">
                                        <Gauge className="h-2.5 w-2.5" />
                                        {vehicleInfo.odometer_reading.toLocaleString()} mi
                                    </Badge>
                                )}
                            </p>
                        )}
                    </div>
                </div>
                <Button
                    size="sm"
                    onClick={() => router.push('/dashboard/maintenance/new')}
                    className="gap-1.5"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">New Service</span>
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <Card className="shadow-sm">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                                <Wrench className="h-3.5 w-3.5 text-slate-600" />
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</span>
                        </div>
                        <p className="text-2xl font-bold">{records.length}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                                <Clock className="h-3.5 w-3.5 text-amber-600" />
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Pending</span>
                        </div>
                        <p className="text-2xl font-bold">{pendingRecords.length}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Done</span>
                        </div>
                        <p className="text-2xl font-bold">{completedRecords.length}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Spent</span>
                        </div>
                        <p className="text-2xl font-bold">${totalSpent.toFixed(0)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Pending/Scheduled */}
            {pendingRecords.length > 0 && (
                <div>
                    <h2 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        Pending ({pendingRecords.length})
                    </h2>
                    <div className="space-y-2">
                        {pendingRecords.map(record => (
                            <MaintenanceCard
                                key={record.id}
                                record={record}
                                onComplete={() => handleComplete(record.id)}
                                onViewDetails={() => router.push(`/dashboard/maintenance/record/${record.id}`)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed History */}
            {completedRecords.length > 0 && (
                <div>
                    <h2 className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2 uppercase tracking-wide">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Completed ({completedRecords.length})
                    </h2>
                    <div className="space-y-2">
                        {completedRecords.map(record => (
                            <MaintenanceCard
                                key={record.id}
                                record={record}
                                onViewDetails={() => router.push(`/dashboard/maintenance/record/${record.id}`)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {records.length === 0 && (
                <Card className="p-8 text-center shadow-sm">
                    <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-semibold">No maintenance records</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        No service history for this vehicle yet.
                    </p>
                    <Button
                        className="mt-4 gap-2"
                        onClick={() => router.push('/dashboard/maintenance/new')}
                    >
                        <Plus className="h-4 w-4" />
                        Schedule Service
                    </Button>
                </Card>
            )}
        </div>
    )
}
