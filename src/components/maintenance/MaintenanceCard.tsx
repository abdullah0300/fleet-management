'use client'

import { Wrench, Calendar, Clock, AlertTriangle, CheckCircle2, Truck } from 'lucide-react'
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

    const getStatusBadge = () => {
        switch (record.status) {
            case 'completed':
                return <Badge className="badge-success gap-1"><CheckCircle2 className="h-3 w-3" />Completed</Badge>
            case 'in_progress':
                return <Badge className="badge-purple gap-1"><Wrench className="h-3 w-3" />In Progress</Badge>
            case 'scheduled':
                if (isOverdue) {
                    return <Badge className="badge-error gap-1"><AlertTriangle className="h-3 w-3" />Overdue</Badge>
                }
                if (isDueSoon) {
                    return <Badge className="badge-warning gap-1"><Clock className="h-3 w-3" />Due Soon</Badge>
                }
                return <Badge className="badge-info gap-1"><Calendar className="h-3 w-3" />Scheduled</Badge>
            default:
                return <Badge className="badge-neutral">{record.status}</Badge>
        }
    }

    const getTypeBadge = () => {
        switch (record.type) {
            case 'scheduled':
                return <Badge variant="outline" className="text-xs">Scheduled</Badge>
            case 'repair':
                return <Badge variant="outline" className="text-xs border-status-error text-status-error">Repair</Badge>
            case 'inspection':
                return <Badge variant="outline" className="text-xs border-status-info text-status-info">Inspection</Badge>
            default:
                return null
        }
    }

    const daysUntilDue = record.next_service_date
        ? Math.ceil((new Date(record.next_service_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null

    return (
        <Card className={cn(
            "hover:shadow-md transition-shadow",
            isOverdue && "border-status-error/50",
            isDueSoon && !isOverdue && "border-status-warning/50"
        )}>
            <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    {/* Left: Vehicle & Type */}
                    <div className="flex items-start gap-3">
                        <div className={cn(
                            "w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0",
                            isOverdue ? "bg-status-error-muted" :
                                isDueSoon ? "bg-status-warning-muted" :
                                    record.status === 'completed' ? "bg-status-success-muted" :
                                        "bg-accent-purple-muted"
                        )}>
                            <Wrench className={cn(
                                "h-5 w-5 sm:h-6 sm:w-6",
                                isOverdue ? "text-status-error" :
                                    isDueSoon ? "text-status-warning" :
                                        record.status === 'completed' ? "text-status-success" :
                                            "text-accent-purple"
                            )} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                {getStatusBadge()}
                                {getTypeBadge()}
                            </div>
                            <h3 className="font-semibold mt-1 text-sm sm:text-base">
                                {record.description || 'Maintenance Service'}
                            </h3>
                            {record.vehicles && (
                                <div className="flex items-center gap-1 mt-1 text-xs sm:text-sm text-muted-foreground">
                                    <Truck className="h-3 w-3" />
                                    <span>{record.vehicles.make} {record.vehicles.model}</span>
                                    <span className="text-muted-foreground/60">•</span>
                                    <span className="font-mono">{record.vehicles.license_plate}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Due Date & Actions */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-3 ml-13 sm:ml-0">
                        {record.next_service_date && record.status !== 'completed' && (
                            <div className="text-right">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Next Service</p>
                                <p className={cn(
                                    "font-medium text-xs sm:text-sm",
                                    isOverdue && "text-status-error",
                                    isDueSoon && !isOverdue && "text-status-warning"
                                )}>
                                    {new Date(record.next_service_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </p>
                                {daysUntilDue !== null && (
                                    <p className={cn(
                                        "text-[10px] sm:text-xs",
                                        isOverdue ? "text-status-error" :
                                            isDueSoon ? "text-status-warning" :
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
                        {record.service_date && record.status === 'completed' && (
                            <div className="text-right">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">Completed</p>
                                <p className="font-medium text-xs sm:text-sm text-status-success">
                                    {new Date(record.service_date).toLocaleDateString()}
                                </p>
                            </div>
                        )}
                        <div className="flex gap-2">
                            {record.status !== 'completed' && onComplete && (
                                <Button
                                    size="sm"
                                    onClick={onComplete}
                                    className="h-7 sm:h-8 text-xs gap-1"
                                >
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span className="hidden sm:inline">Complete</span>
                                </Button>
                            )}
                            {onViewDetails && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onViewDetails}
                                    className="h-7 sm:h-8 text-xs"
                                >
                                    Details
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Additional Info Row */}
                {(record.cost || record.next_service_odometer) && (
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs sm:text-sm text-muted-foreground">
                        {record.cost && (
                            <div>
                                <span>Cost: </span>
                                <span className="font-medium text-foreground">${record.cost.toFixed(2)}</span>
                            </div>
                        )}
                        {record.next_service_odometer && record.vehicles?.odometer_reading && (
                            <div>
                                <span>Next at: </span>
                                <span className="font-medium text-foreground">
                                    {record.next_service_odometer.toLocaleString()} km
                                </span>
                                <span className="text-muted-foreground/60 ml-1">
                                    ({(record.next_service_odometer - record.vehicles.odometer_reading).toLocaleString()} km left)
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
