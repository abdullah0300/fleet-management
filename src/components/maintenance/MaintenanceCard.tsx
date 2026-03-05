'use client'

import { Wrench, Calendar, Clock, AlertTriangle, CheckCircle2, Truck, DollarSign, FileText, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MaintenanceWithVehicle } from '@/hooks/useMaintenance'
import { cn } from '@/lib/utils'

interface MaintenanceCardProps {
    record: MaintenanceWithVehicle
    onComplete?: () => void
    onViewDetails?: () => void
}

export function MaintenanceCard({ record, onComplete, onViewDetails }: MaintenanceCardProps) {
    const isOverdue = record.next_service_date && new Date(record.next_service_date) < new Date()
    const isDueSoon = record.next_service_date && !isOverdue &&
        new Date(record.next_service_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const isCompleted = record.status === 'completed'

    const getStatusBadge = () => {
        switch (record.status) {
            case 'completed':
                return <Badge className="badge-success gap-1 text-[10px]"><CheckCircle2 className="h-3 w-3" />Completed</Badge>
            case 'in_progress':
                return <Badge className="badge-purple gap-1 text-[10px]"><Wrench className="h-3 w-3" />In Progress</Badge>
            case 'scheduled':
                if (isOverdue) {
                    return <Badge className="badge-error gap-1 text-[10px]"><AlertTriangle className="h-3 w-3" />Overdue</Badge>
                }
                if (isDueSoon) {
                    return <Badge className="badge-warning gap-1 text-[10px]"><Clock className="h-3 w-3" />Due Soon</Badge>
                }
                return <Badge className="badge-info gap-1 text-[10px]"><Calendar className="h-3 w-3" />Scheduled</Badge>
            default:
                return <Badge className="badge-neutral text-[10px]">{record.status}</Badge>
        }
    }

    const getTypeBadge = () => {
        switch (record.type) {
            case 'scheduled':
                return <Badge variant="outline" className="text-[10px] border-sky-300 text-sky-700 bg-sky-50">Scheduled</Badge>
            case 'repair':
                return <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700 bg-orange-50">Repair</Badge>
            case 'inspection':
                return <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-700 bg-purple-50">Inspection</Badge>
            default:
                return null
        }
    }

    const daysUntilDue = record.next_service_date
        ? Math.ceil((new Date(record.next_service_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null

    // Cost display logic
    const partsCost = (record as any).parts_cost || 0
    const laborCost = (record as any).labor_cost || 0
    const hasItemizedCost = partsCost > 0 || laborCost > 0
    const totalCost = hasItemizedCost ? partsCost + laborCost : (record.cost || 0)
    const mechanicNotes = (record as any).mechanic_notes || ''

    return (
        <Card className={cn(
            "group hover:shadow-md transition-all duration-200 cursor-pointer",
            isOverdue && "border-red-200 bg-red-50/20",
            isDueSoon && !isOverdue && "border-amber-200 bg-amber-50/20",
            isCompleted && "opacity-80"
        )}
            onClick={onViewDetails}
        >
            <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: Vehicle & Type */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={cn(
                            "w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                            isOverdue ? "bg-red-100" :
                                isDueSoon ? "bg-amber-100" :
                                    record.status === 'completed' ? "bg-emerald-100" :
                                        record.status === 'in_progress' ? "bg-blue-100" :
                                            "bg-slate-100"
                        )}>
                            <Wrench className={cn(
                                "h-5 w-5",
                                isOverdue ? "text-red-600" :
                                    isDueSoon ? "text-amber-600" :
                                        record.status === 'completed' ? "text-emerald-600" :
                                            record.status === 'in_progress' ? "text-blue-600" :
                                                "text-slate-600"
                            )} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {getStatusBadge()}
                                {getTypeBadge()}
                            </div>
                            <h3 className="font-semibold mt-1.5 text-sm sm:text-base truncate">
                                {record.description || 'Maintenance Service'}
                            </h3>
                            {record.vehicles && (
                                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                    <Truck className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{record.vehicles.make} {record.vehicles.model}</span>
                                    <span className="text-muted-foreground/40">•</span>
                                    <span className="font-mono">{record.vehicles.license_plate}</span>
                                </div>
                            )}
                            {/* Notes preview */}
                            {mechanicNotes && (
                                <div className="mt-1.5 flex items-start gap-1 text-xs text-muted-foreground">
                                    <FileText className="h-3 w-3 shrink-0 mt-0.5" />
                                    <span className="line-clamp-1">{mechanicNotes}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Due Date & Actions */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-2 ml-13 sm:ml-0">
                        {record.next_service_date && !isCompleted && (
                            <div className="text-right">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Next Service</p>
                                <p className={cn(
                                    "font-medium text-xs",
                                    isOverdue && "text-red-600",
                                    isDueSoon && !isOverdue && "text-amber-600"
                                )}>
                                    {new Date(record.next_service_date).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric', year: 'numeric'
                                    })}
                                </p>
                                {daysUntilDue !== null && (
                                    <p className={cn(
                                        "text-[10px]",
                                        isOverdue ? "text-red-500" :
                                            isDueSoon ? "text-amber-500" :
                                                "text-muted-foreground"
                                    )}>
                                        {isOverdue
                                            ? `${Math.abs(daysUntilDue)} days overdue`
                                            : daysUntilDue === 0
                                                ? 'Due today'
                                                : `${daysUntilDue} days left`
                                        }
                                    </p>
                                )}
                            </div>
                        )}
                        {record.service_date && isCompleted && (
                            <div className="text-right">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Completed</p>
                                <p className="font-medium text-xs text-emerald-600">
                                    {new Date(record.service_date).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                        <div className="flex gap-1.5">
                            {!isCompleted && onComplete && (
                                <Button
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); onComplete() }}
                                    className="h-7 text-[10px] gap-1"
                                >
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span className="hidden sm:inline">Complete</span>
                                </Button>
                            )}
                            {onViewDetails && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); onViewDetails() }}
                                    className="h-7 text-[10px] gap-0.5 text-muted-foreground group-hover:text-foreground"
                                >
                                    Details
                                    <ChevronRight className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Info Row — Cost Breakdown */}
                {(totalCost > 0 || record.next_service_odometer) && (
                    <div className="flex items-center gap-3 sm:gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground flex-wrap">
                        {totalCost > 0 && (
                            <div className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3 text-emerald-500" />
                                {hasItemizedCost ? (
                                    <span>
                                        <span className="font-medium text-foreground">${totalCost.toFixed(2)}</span>
                                        <span className="text-muted-foreground/60 ml-1">
                                            (Parts ${partsCost.toFixed(2)} + Labor ${laborCost.toFixed(2)})
                                        </span>
                                    </span>
                                ) : (
                                    <span>
                                        Cost: <span className="font-medium text-foreground">${totalCost.toFixed(2)}</span>
                                    </span>
                                )}
                            </div>
                        )}
                        {record.next_service_odometer && record.vehicles?.odometer_reading && (
                            <div className="flex items-center gap-1">
                                <span>Next at: </span>
                                <span className="font-medium text-foreground">
                                    {record.next_service_odometer.toLocaleString()} mi
                                </span>
                                <span className="text-muted-foreground/50">
                                    ({(record.next_service_odometer - record.vehicles.odometer_reading).toLocaleString()} mi left)
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
