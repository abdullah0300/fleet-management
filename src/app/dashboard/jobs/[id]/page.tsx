'use client'

import { useParams, useRouter } from 'next/navigation'
import {
    ArrowLeft, Edit, Trash2, User, Phone, MapPin, Truck, Calendar, Clock,
    Package, DollarSign, CheckCircle2, XCircle, Play, Camera, Navigation,
    AlertCircle, Smartphone, Timer
} from 'lucide-react'
import { useJob, useUpdateJob, useDeleteJob, getJobPickupAddress, getJobDeliveryAddress, getJobMapPoints, getJobStopCount } from '@/hooks/useJobs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { JobRouteMap } from '@/components/jobs/JobRouteMap'
import { EntityDocuments } from '@/components/documents/EntityDocuments'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ProofOfDeliveryMap } from '@/components/manifests/ProofOfDeliveryMap'
import { format } from 'date-fns'
import { useRealtimeUpdate } from '@/hooks/useRealtimeUpdate'
import { jobKeys } from '@/hooks/useJobs'

// Status config for consistent UI
const statusConfig: Record<string, {
    label: string
    color: string
    bgColor: string
    description: string
    icon: any
}> = {
    pending: {
        label: 'Pending',
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        description: 'Job created. Waiting for assignment.',
        icon: Clock
    },
    assigned: {
        label: 'Assigned',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        description: 'Driver assigned. Waiting to start.',
        icon: User
    },
    in_progress: {
        label: 'In Progress',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        description: 'Job is currently active.',
        icon: Play
    },
    completed: {
        label: 'Completed',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        description: 'Job completed successfully.',
        icon: CheckCircle2
    },
    cancelled: {
        label: 'Cancelled',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        description: 'Job was cancelled.',
        icon: XCircle
    }
}

export default function JobDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const { data: job, isLoading, error } = useJob(id)
    const updateMutation = useUpdateJob()
    const deleteMutation = useDeleteJob()

    // --- Real-time Updates ---
    // --- Real-time Updates ---
    // 1. Listen for changes to THIS job
    // We pass the filter only if job exists, handled by the hook or passing a dummy filter if needed.
    // However, our hook doesn't support 'skip', so we'll pass a filter that matches nothing if job is null, or just let it run.
    // Better pattern: The hook should just do nothing if filter is undefined? 
    // Actually, let's just properly use the ID if we have it, but we MUST call the hook unconditionally.

    // We can use the 'id' from params even before the job data loads
    useRealtimeUpdate('jobs', jobKeys.detail(id), `id=eq.${id}`)

    // 2. Listen for stop changes
    useRealtimeUpdate('job_stops', jobKeys.detail(id), `job_id=eq.${id}`)

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

    const status = statusConfig[job.status || 'pending'] || statusConfig.pending
    const StatusIcon = status.icon
    const mapPoints = getJobMapPoints(job)
    const stopCount = getJobStopCount(job)

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] gap-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0 h-8 w-8 -ml-2">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight">{job.job_number}</h1>
                        <Badge className={`${status.bgColor} ${status.color} border-0`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground ml-9">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <User className="h-4 w-4" />
                            <span>{job.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <span>{job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString('en-US', {
                                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                            }) : 'No Date Set'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Package className="h-4 w-4" />
                            <span>{stopCount} Stops</span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="icon" onClick={() => router.push(`/dashboard/jobs/${id}/edit`)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={handleDelete} disabled={deleteMutation.isPending}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    {job.status === 'assigned' && (
                        <Button onClick={() => handleStatusChange('in_progress')} disabled={updateMutation.isPending}>
                            <Play className="mr-2 h-4 w-4" /> Start
                        </Button>
                    )}
                    {job.status === 'in_progress' && (
                        <>
                            <Button variant="outline" onClick={() => router.push(`/dashboard/jobs/${id}/pod`)}>
                                <Camera className="mr-2 h-4 w-4" /> POD
                            </Button>
                            <Button onClick={() => handleStatusChange('completed')} disabled={updateMutation.isPending}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Complete
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Status Alert */}
            <Alert className={`${status.bgColor} border-0`}>
                <StatusIcon className={`h-4 w-4 ${status.color}`} />
                <AlertTitle className={status.color}>{status.label}</AlertTitle>
                <AlertDescription className="text-gray-700">
                    {status.description}
                </AlertDescription>
            </Alert>

            {/* Main Content */}
            <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-[400px] grid-cols-2 mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="flex-1 min-h-0 mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        {/* Left Panel - Details */}
                        <div className="space-y-4 overflow-auto pr-2 pb-2 h-full">
                            {/* Assignment Card */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium">Assignment Details</CardTitle>
                                    <CardDescription className="text-xs">Driver and vehicle assigned</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                            <User className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold">{job.drivers?.profiles?.full_name || 'No Driver Assigned'}</div>
                                            <div className="text-xs text-muted-foreground">{job.drivers?.profiles?.phone || 'Driver'}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                            <Truck className="h-6 w-6 text-slate-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold">{job.vehicles ? job.vehicles.registration_number : 'No Vehicle Assigned'}</div>
                                            <div className="text-xs text-muted-foreground">{job.vehicles ? `${job.vehicles.make} ${job.vehicles.model}` : 'Vehicle'}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Stops Card */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium">Job Stops ({stopCount})</CardTitle>
                                    <CardDescription className="text-xs">Route sequence</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 relative">
                                    <div className="absolute left-[1.75rem] top-0 bottom-0 w-0.5 bg-slate-200" />
                                    {job.job_stops?.map((stop: any, index: number) => {
                                        const isCompleted = stop.status === 'completed'

                                        // Scheduled Time Display
                                        const scheduledTime = stop.arrival_mode === 'window' && stop.window_start && stop.window_end
                                            ? `${format(new Date(stop.window_start), 'h:mm a')} - ${format(new Date(stop.window_end), 'h:mm a')}`
                                            : stop.scheduled_arrival
                                                ? format(new Date(stop.scheduled_arrival), 'h:mm a')
                                                : stop.scheduled_time
                                                    ? format(new Date(stop.scheduled_time), 'h:mm a')
                                                    : 'Not Scheduled'

                                        // Actual Time Display
                                        const actualTime = stop.actual_arrival_time
                                            ? format(new Date(stop.actual_arrival_time), 'h:mm a')
                                            : null

                                        // Status Color Logic for Time
                                        const isLate = stop.actual_arrival_time && stop.scheduled_arrival && new Date(stop.actual_arrival_time) > new Date(stop.scheduled_arrival)

                                        return (
                                            <div key={stop.id} className="relative z-10 flex gap-3 pb-6 last:pb-0">
                                                <div className="flex-none flex flex-col items-center">
                                                    <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${stop.type === 'pickup' ? 'bg-white border-green-500 text-green-600' :
                                                        stop.type === 'dropoff' ? 'bg-white border-red-500 text-red-600' :
                                                            'bg-white border-blue-500 text-blue-600'
                                                        }`}>
                                                        {index + 1}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className={`text-xs font-semibold uppercase tracking-wider mb-0.5 ${stop.type === 'pickup' ? 'text-green-600' :
                                                                stop.type === 'dropoff' ? 'text-red-600' :
                                                                    'text-blue-600'
                                                                }`}>
                                                                {stop.type}
                                                                {stop.status === 'completed' && <span className="ml-2 text-green-600 normal-case bg-green-50 px-1.5 py-0.5 rounded text-[10px]">✓ Done</span>}
                                                            </div>
                                                            <p className="text-sm font-medium">{stop.address}</p>
                                                        </div>

                                                        {/* POD Map / Verification Button */}
                                                        {stop.status === 'completed' && (stop.actual_arrival_lat || stop.actual_completion_lat) && (
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                                                        <MapPin className="h-3 w-3 mr-1" />
                                                                        Verify
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="sm:max-w-md">
                                                                    <DialogHeader>
                                                                        <DialogTitle>Proof of Delivery - Stop #{index + 1}</DialogTitle>
                                                                    </DialogHeader>
                                                                    <div className="aspect-video w-full mt-2">
                                                                        <ProofOfDeliveryMap
                                                                            plannedLocation={{
                                                                                lat: stop.latitude || 0,
                                                                                lng: stop.longitude || 0
                                                                            }}
                                                                            actualLocation={stop.actual_completion_lat ? {
                                                                                lat: stop.actual_completion_lat,
                                                                                lng: stop.actual_completion_lng,
                                                                                timestamp: stop.actual_arrival_time
                                                                            } : undefined}
                                                                            completionType={stop.type}
                                                                            flagged={stop.flagged_location}
                                                                        />
                                                                    </div>
                                                                    <div className="text-sm text-muted-foreground mt-2 grid grid-cols-2 gap-2">
                                                                        <div>
                                                                            <span className="font-semibold block text-xs uppercase tracking-wider">Scheduled</span>
                                                                            {scheduledTime}
                                                                        </div>
                                                                        <div>
                                                                            <span className="font-semibold block text-xs uppercase tracking-wider">Actual Arrival</span>
                                                                            <span className={isLate ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                                                                                {actualTime || '--:--'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        )}
                                                    </div>

                                                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                                        <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                                                            <Clock className="h-3 w-3" />
                                                            <span>Sched: {scheduledTime}</span>
                                                        </div>
                                                        {actualTime && (
                                                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${isLate ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                <span>Arrived: {actualTime}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {stop.notes && (
                                                        <p className="text-xs text-muted-foreground mt-1 bg-muted/50 p-1.5 rounded">{stop.notes}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            </Card>

                            {/* Notes Card */}
                            {job.notes && (
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium">Job Notes</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-muted-foreground">{job.notes}</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Right Panel - Map */}
                        <div className="lg:col-span-2 h-[500px] lg:h-full rounded-xl overflow-hidden border shadow-sm">
                            <JobRouteMap
                                waypoints={mapPoints.map((p, i) => ({
                                    lat: p.lat,
                                    lng: p.lng,
                                    type: p.type,
                                    sequence: p.sequence,
                                    address: p.address
                                }))}
                                vehicleLocation={
                                    job?.vehicles?.current_location && (job.vehicles.current_location as any)?.lat
                                        ? { lat: (job.vehicles.current_location as any).lat, lng: (job.vehicles.current_location as any).lng }
                                        : undefined
                                }
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="documents" className="flex-1 mt-0">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Job Documents</CardTitle>
                            <CardDescription>Upload PODs, invoices, or other files.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[calc(100%-5rem)]">
                            <EntityDocuments entityId={id} entityType="job" className="h-full" />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
