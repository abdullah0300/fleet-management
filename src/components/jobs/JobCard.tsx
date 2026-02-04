'use client'

import { useRouter } from 'next/navigation'
import { Package, MapPin, Truck, User, Calendar, Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getJobPickupAddress, getJobDeliveryAddress, getJobStopCount } from '@/hooks/useJobs'
import { JobStop } from '@/types/database'

interface JobCardProps {
    job: {
        id: string
        job_number: string
        status: string
        customer_name: string
        customer_phone?: string | null
        job_stops?: JobStop[]
        scheduled_date?: string | null
        scheduled_time?: string | null
        vehicles?: { registration_number: string; make: string } | null
        drivers?: { profiles: { full_name: string } | null } | null
    }
    showActions?: boolean
    onViewDetails?: () => void
}

export function JobCard({ job, showActions = true, onViewDetails }: JobCardProps) {
    const router = useRouter()

    // Use helper functions for address display
    const pickupAddress = getJobPickupAddress(job)
    const deliveryAddress = getJobDeliveryAddress(job)
    const stopCount = getJobStopCount(job)

    const getStatusBadge = () => {
        switch (job.status) {
            case 'pending':
                return <Badge className="badge-warning">Pending</Badge>
            case 'assigned':
                return <Badge className="badge-info">Assigned</Badge>
            case 'in_progress':
                return <Badge className="badge-purple">In Progress</Badge>
            case 'completed':
                return <Badge className="badge-success">Completed</Badge>
            case 'cancelled':
                return <Badge className="badge-error">Cancelled</Badge>
            default:
                return <Badge className="badge-neutral">{job.status}</Badge>
        }
    }

    return (
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onViewDetails}>
            <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col gap-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-accent-purple-muted flex items-center justify-center shrink-0">
                                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-accent-purple" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-semibold text-sm">{job.job_number}</span>
                                    {getStatusBadge()}
                                    {stopCount > 2 && (
                                        <Badge variant="outline" className="text-[10px]">
                                            {stopCount} stops
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-foreground">{job.customer_name}</p>
                            </div>
                        </div>

                        {/* Intelligent Time Display */}
                        <div className="text-right text-xs text-muted-foreground">
                            {(() => {
                                // Try to get start time from first stop
                                const firstStop = job.job_stops && job.job_stops.length > 0 ? job.job_stops.sort((a, b) => a.sequence_order - b.sequence_order)[0] : null;
                                // Try to get end time from last stop
                                const lastStop = job.job_stops && job.job_stops.length > 0 ? job.job_stops.sort((a, b) => b.sequence_order - a.sequence_order)[0] : null;

                                const startTime = (firstStop as any)?.arrival_mode === 'fixed' ? (firstStop as any)?.scheduled_arrival
                                    : (firstStop as any)?.arrival_mode === 'window' ? (firstStop as any)?.window_start
                                        : null;

                                const endTime = (lastStop as any)?.arrival_mode === 'fixed' ? (lastStop as any)?.scheduled_arrival
                                    : (lastStop as any)?.arrival_mode === 'window' ? (lastStop as any)?.window_end
                                        : null;

                                if (startTime) {
                                    return (
                                        <div className="flex flex-col items-end gap-0.5">
                                            <div className="flex items-center gap-1 font-medium text-foreground">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                {endTime && stopCount > 1 && ` - ${new Date(endTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                                            </div>
                                        </div>
                                    );
                                }

                                // Fallback to Job Schedule
                                if (job.scheduled_date) {
                                    return (
                                        <>
                                            <div className="flex items-center gap-1 justify-end">
                                                <Calendar className="h-3 w-3" />
                                                {new Date(job.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </div>
                                            {job.scheduled_time && (
                                                <div className="flex items-center gap-1 justify-end mt-0.5">
                                                    <Clock className="h-3 w-3" />
                                                    {job.scheduled_time}
                                                </div>
                                            )}
                                        </>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                    </div>

                    {/* Route Summary */}
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                            <MapPin className="h-3 w-3 text-status-success shrink-0" />
                            <span className="truncate text-muted-foreground">
                                {pickupAddress}
                            </span>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                            <MapPin className="h-3 w-3 text-status-error shrink-0" />
                            <span className="truncate text-muted-foreground">
                                {deliveryAddress}
                            </span>
                        </div>
                    </div>

                    {/* Assignment Info */}
                    {(job.vehicles || job.drivers) && (
                        <div className="flex items-center gap-4 pt-2 border-t text-xs">
                            {job.vehicles && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <Truck className="h-3 w-3" />
                                    <span>{job.vehicles.make} - {job.vehicles.registration_number}</span>
                                </div>
                            )}
                            {job.drivers?.profiles && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    <span>{job.drivers.profiles.full_name}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    {showActions && (
                        <div className="flex justify-end pt-2">
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/dashboard/jobs/${job.id}`)
                                }}
                            >
                                View Details
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
