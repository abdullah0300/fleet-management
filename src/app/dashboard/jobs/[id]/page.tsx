'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, User, Phone, MapPin, Truck, Calendar, Clock, Package, DollarSign, CheckCircle2, XCircle, Play, Camera } from 'lucide-react'
import { useJob, useUpdateJob, useDeleteJob } from '@/hooks/useJobs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export default function JobDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const { data: job, isLoading, error } = useJob(id)
    const updateMutation = useUpdateJob()
    const deleteMutation = useDeleteJob()

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this job?')) return
        await deleteMutation.mutateAsync(id)
        router.push('/dashboard/jobs')
    }

    const handleStatusChange = async (newStatus: string) => {
        await updateMutation.mutateAsync({
            id,
            updates: { status: newStatus as any }
        })
    }

    const getStatusBadge = (status: string | null) => {
        switch (status) {
            case 'pending': return { className: 'badge-warning', label: 'Pending' }
            case 'assigned': return { className: 'badge-info', label: 'Assigned' }
            case 'in_progress': return { className: 'badge-purple', label: 'In Progress' }
            case 'completed': return { className: 'badge-success', label: 'Completed' }
            case 'cancelled': return { className: 'badge-error', label: 'Cancelled' }
            default: return { className: 'badge-neutral', label: 'Unknown' }
        }
    }

    const getNextStatusAction = (status: string | null) => {
        switch (status) {
            case 'pending': return { action: 'assigned', label: 'Mark as Assigned', icon: Truck }
            case 'assigned': return { action: 'in_progress', label: 'Start Job', icon: Play }
            case 'in_progress': return { action: 'completed', label: 'Complete Job', icon: CheckCircle2 }
            default: return null
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
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    <Skeleton className="h-[200px] rounded-xl" />
                    <Skeleton className="h-[200px] rounded-xl" />
                </div>
            </div>
        )
    }

    if (error || !job) {
        return <div className="p-8 text-center">Job not found</div>
    }

    const statusInfo = getStatusBadge(job.status)
    const nextAction = getNextStatusAction(job.status)
    const pickup = job.pickup_location as { address?: string } | null
    const delivery = job.delivery_location as { address?: string } | null

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-mono text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {job.job_number || 'No ID'}
                            </span>
                            <Badge className={`border ${statusInfo.className}`}>
                                {statusInfo.label}
                            </Badge>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight mt-1">
                            {job.customer_name || 'Unknown Customer'}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {job.customer_phone || 'No phone'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-12 sm:ml-0">
                    {job.status === 'in_progress' && (
                        <Button
                            variant="outline"
                            onClick={() => router.push(`/dashboard/jobs/${id}/pod`)}
                            className="gap-2"
                        >
                            <Camera className="h-4 w-4" />
                            POD
                        </Button>
                    )}
                    {nextAction && (
                        <Button
                            onClick={() => handleStatusChange(nextAction.action)}
                            disabled={updateMutation.isPending}
                            className="gap-2"
                        >
                            <nextAction.icon className="h-4 w-4" />
                            {nextAction.label}
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/dashboard/jobs/${id}/edit`)}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="destructive"
                        size="icon"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Status Timeline */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Job Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        {['pending', 'assigned', 'in_progress', 'completed'].map((status, index) => {
                            const isCurrent = job.status === status
                            const isPast = ['pending', 'assigned', 'in_progress', 'completed'].indexOf(job.status || '') > index
                            const isCancelled = job.status === 'cancelled'

                            return (
                                <div key={status} className="flex items-center">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${isCancelled ? 'bg-status-error-muted text-status-error' :
                                            isCurrent ? 'bg-primary text-primary-foreground' :
                                                isPast ? 'bg-status-success text-status-success-foreground' :
                                                    'bg-muted text-muted-foreground'
                                            }`}>
                                            {isPast && !isCurrent ? '✓' : index + 1}
                                        </div>
                                        <span className={`text-xs mt-1 capitalize ${isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'
                                            }`}>
                                            {status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    {index < 3 && (
                                        <div className={`w-12 sm:w-24 h-0.5 mx-2 ${isPast ? 'bg-status-success' : 'bg-muted'
                                            }`} />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    {job.status === 'cancelled' && (
                        <div className="mt-4 p-3 bg-status-error-muted rounded-lg text-sm text-status-error flex items-center gap-2">
                            <XCircle className="h-4 w-4" />
                            This job has been cancelled
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Details Grid */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {/* Pickup & Delivery */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Locations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-status-success-muted flex items-center justify-center shrink-0">
                                <MapPin className="h-4 w-4 text-status-success" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Pickup</p>
                                <p className="font-medium">{pickup?.address || 'Not set'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-status-error-muted flex items-center justify-center shrink-0">
                                <MapPin className="h-4 w-4 text-status-error" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Delivery</p>
                                <p className="font-medium">{delivery?.address || 'Not set'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Assignment */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Assignment
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-status-info-muted flex items-center justify-center shrink-0">
                                <User className="h-4 w-4 text-status-info" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Driver</p>
                                <p className="font-medium">
                                    {job.drivers?.profiles?.full_name || 'Unassigned'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent-purple-muted flex items-center justify-center shrink-0">
                                <Truck className="h-4 w-4 text-accent-purple" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Vehicle</p>
                                <p className="font-medium">
                                    {job.vehicles ? `${job.vehicles.make} ${job.vehicles.model}` : 'Unassigned'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Schedule */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Schedule
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Scheduled Date</p>
                                <p className="font-medium">
                                    {job.scheduled_date
                                        ? new Date(job.scheduled_date).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })
                                        : 'Not scheduled'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Created</p>
                                <p className="font-medium">
                                    {new Date(job.created_at).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Cost */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Cost
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-4">
                            <p className="text-3xl font-bold">--</p>
                            <p className="text-sm text-muted-foreground">Cost TBD</p>
                        </div>
                        {job.routes && (
                            <div className="pt-4 border-t text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Distance</span>
                                    <span className="font-medium">{job.routes.distance_km} km</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Duration</span>
                                    <span className="font-medium">{job.routes.estimated_duration} min</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Notes */}
            {job.notes && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Notes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{job.notes}</p>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            {job.status !== 'completed' && job.status !== 'cancelled' && (
                <div className="flex gap-3 justify-end">
                    <Button
                        variant="outline"
                        className="gap-2 text-status-error border-status-error hover:bg-status-error-muted"
                        onClick={() => handleStatusChange('cancelled')}
                        disabled={updateMutation.isPending}
                    >
                        <XCircle className="h-4 w-4" />
                        Cancel Job
                    </Button>
                </div>
            )}
        </div>
    )
}
