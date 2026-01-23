'use client'

import { useRouter } from 'next/navigation'
import { Package, MapPin, Truck, User, Calendar, Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface JobCardProps {
    job: {
        id: string
        job_number: string
        status: string
        customer_name: string
        customer_phone?: string | null
        pickup_location?: { address?: string } | null
        delivery_location?: { address?: string } | null
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

    const pickup = job.pickup_location as { address?: string } | null
    const delivery = job.delivery_location as { address?: string } | null

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
                                </div>
                                <p className="text-sm text-foreground">{job.customer_name}</p>
                            </div>
                        </div>
                        {job.scheduled_date && (
                            <div className="text-right text-xs text-muted-foreground">
                                <div className="flex items-center gap-1 justify-end">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(job.scheduled_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </div>
                                {job.scheduled_time && (
                                    <div className="flex items-center gap-1 justify-end mt-0.5">
                                        <Clock className="h-3 w-3" />
                                        {job.scheduled_time}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Route Summary */}
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                            <MapPin className="h-3 w-3 text-status-success shrink-0" />
                            <span className="truncate text-muted-foreground">
                                {pickup?.address || 'Pickup TBD'}
                            </span>
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                            <MapPin className="h-3 w-3 text-status-error shrink-0" />
                            <span className="truncate text-muted-foreground">
                                {delivery?.address || 'Delivery TBD'}
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
