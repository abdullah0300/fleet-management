'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Wrench, CheckCircle2, Clock, Truck, Calendar, DollarSign, AlertTriangle } from 'lucide-react'
import { useMaintenance, useCompleteMaintenance } from '@/hooks/useMaintenance'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MaintenanceCard } from '@/components/maintenance/MaintenanceCard'
import { cn } from '@/lib/utils'

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

    const handleComplete = async (id: string) => {
        if (!confirm('Mark this maintenance as completed?')) return
        await completeMutation.mutateAsync({ id })
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
        <div className="flex flex-col gap-4 sm:gap-6">
            {/* Header */}
            <div className="flex items-start gap-3 sm:gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                        Maintenance History
                    </h1>
                    {vehicleInfo && (
                        <p className="text-muted-foreground text-xs sm:text-sm flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {vehicleInfo.make} {vehicleInfo.model} - {vehicleInfo.license_plate}
                        </p>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="p-3 sm:p-4 rounded-xl border bg-accent-purple-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                        <Wrench className="h-4 w-4 text-accent-purple" />
                        <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <p className="text-2xl font-bold">{records.length}</p>
                </div>
                <div className="p-3 sm:p-4 rounded-xl border bg-status-warning-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-status-warning" />
                        <span className="text-xs text-muted-foreground">Pending</span>
                    </div>
                    <p className="text-2xl font-bold">{pendingRecords.length}</p>
                </div>
                <div className="p-3 sm:p-4 rounded-xl border bg-status-success-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-status-success" />
                        <span className="text-xs text-muted-foreground">Completed</span>
                    </div>
                    <p className="text-2xl font-bold">{completedRecords.length}</p>
                </div>
            </div>

            {/* Pending/Scheduled */}
            {pendingRecords.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-status-warning" />
                        Pending Maintenance ({pendingRecords.length})
                    </h2>
                    <div className="space-y-3">
                        {pendingRecords.map(record => (
                            <MaintenanceCard
                                key={record.id}
                                record={record}
                                onComplete={() => handleComplete(record.id)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed History */}
            {completedRecords.length > 0 && (
                <div>
                    <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-status-success" />
                        Completed ({completedRecords.length})
                    </h2>
                    <div className="space-y-3">
                        {completedRecords.map(record => (
                            <MaintenanceCard
                                key={record.id}
                                record={record}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {records.length === 0 && (
                <Card className="p-8 text-center">
                    <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold">No maintenance records</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        No service history for this vehicle yet.
                    </p>
                    <Button
                        className="mt-4"
                        onClick={() => router.push('/dashboard/maintenance/new')}
                    >
                        Schedule Service
                    </Button>
                </Card>
            )}
        </div>
    )
}
