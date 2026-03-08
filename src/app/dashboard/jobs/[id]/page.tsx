'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    ArrowLeft, Edit, Trash2, User, Phone, MapPin, Truck, Calendar, Clock,
    Package, DollarSign, CheckCircle2, XCircle, Play, Camera, Navigation,
    AlertCircle, Smartphone, Timer, Gauge
} from 'lucide-react'
import { useJob, useUpdateJob, useDeleteJob, useUpdateJobStop, useForceCompleteStop, getJobPickupAddress, getJobDeliveryAddress, getJobMapPoints, getJobStopCount } from '@/hooks/useJobs'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { useSaveCostEstimate, useJobCostEstimate, calculateJobCosts } from '@/hooks/useCostEstimates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { JobRouteMap } from '@/components/jobs/JobRouteMap'
import { EntityDocuments } from '@/components/documents/EntityDocuments'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { ProofOfDeliveryMap } from '@/components/manifests/ProofOfDeliveryMap'
import { JobPODViewer } from '@/components/jobs/JobPODViewer'
import { JobFinancialsCard } from '@/components/jobs/JobFinancialsCard'
import { FinancialReviewModal } from '@/components/jobs/FinancialReviewModal'
import { format } from 'date-fns'
import { useRealtimeUpdate } from '@/hooks/useRealtimeUpdate'
import { jobKeys } from '@/hooks/useJobs'
import { formatDate, formatTime } from '@/lib/utils'

const supabase = createClient()

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

    const queryClient = useQueryClient()
    const { data: job, isLoading, error } = useJob(id)
    const updateMutation = useUpdateJob()
    const deleteMutation = useDeleteJob()
    const updateStopMutation = useUpdateJobStop()
    const forceCompleteStopMutation = useForceCompleteStop()
    const saveCostMutation = useSaveCostEstimate()
    const { data: costEstimateData } = useJobCostEstimate(id)
    const [startOdometer, setStartOdometer] = useState<string>('')
    const [endOdometer, setEndOdometer] = useState<string>('')
    const [isStarting, setIsStarting] = useState(false)
    const [isCompleting, setIsCompleting] = useState(false)
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
    const [isReviewSubmitting, setIsReviewSubmitting] = useState(false)

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

    // ── Start Job: capture start odometer, update vehicle ──
    const handleStartJob = async () => {
        if (!job) return
        setIsStarting(true)
        try {
            if (job.vehicle_id && startOdometer) {
                await supabase
                    .from('vehicles')
                    .update({ odometer_reading: Number(startOdometer) })
                    .eq('id', job.vehicle_id)
            }
            await updateMutation.mutateAsync({ id, updates: { status: 'in_progress' } })
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            setStartOdometer('')
        } catch (err: any) {
            alert('Failed to start job: ' + err.message)
        } finally {
            setIsStarting(false)
        }
    }

    // ── Review Job Finances: handle dispatcher verification ──
    const handleFinancialReviewConfirm = async (finalData: any) => {
        if (!job) return
        setIsReviewSubmitting(true)
        try {
            // Update the job with revenue and verified financial status
            await updateMutation.mutateAsync({
                id,
                updates: {
                    revenue: finalData.revenue,
                    financial_status: 'approved'
                }
            })

            // Save the definitive verified cost estimate
            const costPayload: any = {
                job_id: id,
                driver_id: job.driver_id,
                vehicle_id: job.vehicle_id,
                fuel_cost: finalData.fuel_cost,
                toll_cost: finalData.toll_cost,
                driver_cost: finalData.driver_cost,
                other_costs: finalData.other_costs,
                total_cost: finalData.fuel_cost + finalData.toll_cost + finalData.driver_cost + finalData.other_costs,
            }

            if (costEstimateData?.id) {
                costPayload.id = costEstimateData.id
            }

            await saveCostMutation.mutateAsync(costPayload as any)

            setIsReviewModalOpen(false)
        } catch (err: any) {
            alert('Failed to authorize finances: ' + err.message)
        } finally {
            setIsReviewSubmitting(false)
        }
    }

    // ── Complete Job: capture end odometer, update vehicle, reset statuses ──
    const handleCompleteJob = async () => {
        if (!job) return
        setIsCompleting(true)
        try {
            // Check if this job belongs to a manifest with other active jobs
            let hasActiveSiblings = false
            if (job.manifest_id) {
                const { data: siblingJobs } = await supabase
                    .from('jobs')
                    .select('id, status')
                    .eq('manifest_id', job.manifest_id)
                    .neq('id', job.id)
                if (siblingJobs) {
                    hasActiveSiblings = siblingJobs.some(
                        (j: any) => j.status !== 'completed' && j.status !== 'cancelled'
                    )
                }
            }

            // 1. Update vehicle odometer (always), but only reset status if no active siblings
            let startOdo = 0
            if (job.vehicle_id) {
                const vehicleUpdate: Record<string, any> = {}
                startOdo = (job.vehicles as any)?.odometer_reading || 0
                if (endOdometer) {
                    vehicleUpdate.odometer_reading = Number(endOdometer)
                }
                if (!hasActiveSiblings) {
                    vehicleUpdate.status = 'available'
                }
                if (Object.keys(vehicleUpdate).length > 0) {
                    await supabase.from('vehicles').update(vehicleUpdate).eq('id', job.vehicle_id)
                }
            }
            // 2. Only reset driver status if no active siblings in the manifest
            if (job.driver_id && !hasActiveSiblings) {
                await supabase.from('drivers').update({ status: 'available' }).eq('id', job.driver_id)
            }
            // 3. Mark job completed
            await updateMutation.mutateAsync({ id, updates: { status: 'completed' } })

            // 4. Calculate and save job costs
            if (job.vehicle_id && job.driver_id) {
                const endOdo = endOdometer ? Number(endOdometer) : startOdo
                const distanceDriven = Math.max(0, endOdo - startOdo)
                const costEstimate = calculateJobCosts(job, job.vehicles, job.drivers, job.routes, distanceDriven, 0)
                await saveCostMutation.mutateAsync(costEstimate)
            }

            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            queryClient.invalidateQueries({ queryKey: ['drivers'] })
            setEndOdometer('')
        } catch (err: any) {
            alert('Failed to complete job: ' + err.message)
        } finally {
            setIsCompleting(false)
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

    const status = statusConfig[job.status || 'pending'] || statusConfig.pending
    const StatusIcon = status.icon
    const mapPoints = getJobMapPoints(job)
    const stopCount = getJobStopCount(job)

    let dynamicDescription = status.description
    if (job.status === 'in_progress' && job.job_stops && job.job_stops.length > 0) {
        const activeStop = job.job_stops.find((s: any) => s.status !== 'completed')
        if (activeStop) {
            const stopName = activeStop.location_name || activeStop.address || 'location'
            const stopTypeDisplay = activeStop.type ? (activeStop.type.charAt(0).toUpperCase() + activeStop.type.slice(1)) : 'Stop'
            if (activeStop.actual_arrival_time) {
                dynamicDescription = `Arrived at ${stopTypeDisplay}: ${stopName}.`
            } else {
                dynamicDescription = `En route to ${stopTypeDisplay}: ${stopName}.`
            }
        } else {
            dynamicDescription = 'All stops completed. Awaiting final job completion.'
        }
    }

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
                            <span>{job.scheduled_date ? formatDate(job.scheduled_date) : 'No Date Set'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Package className="h-4 w-4" />
                            <span>{stopCount} Stops</span>
                        </div>
                        {job.manifests && (
                            <button
                                onClick={() => router.push(`/dashboard/manifests/${job.manifests.id}`)}
                                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors text-xs font-semibold cursor-pointer"
                            >
                                <Truck className="h-3 w-3" />
                                Manifest: {job.manifests.manifest_number || 'View'}
                            </button>
                        )}
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
                    {/* Dispatcher Financial Review Action */}
                    {job.status === 'completed' && job.financial_status === 'pending_review' && (
                        <Button
                            className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                            onClick={() => setIsReviewModalOpen(true)}
                        >
                            <AlertCircle className="mr-2 h-4 w-4" />
                            Authorize Finances
                        </Button>
                    )}
                    {/* ── START JOB with Odometer Dialog ── */}
                    {job.status === 'assigned' && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button disabled={isStarting}>
                                    <Play className="mr-2 h-4 w-4" /> Start
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Start Job {job.job_number}</DialogTitle>
                                    <CardDescription>Record the vehicle's odometer before the trip begins.</CardDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                        <Gauge className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm font-medium">{job.vehicles?.license_plate || 'Vehicle'}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Current reading: {((job.vehicles as any)?.odometer_reading || 0).toLocaleString()} mi
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="start-odometer">Start Odometer (Miles)</Label>
                                        <Input
                                            id="start-odometer"
                                            type="number"
                                            placeholder={`e.g. ${((job.vehicles as any)?.odometer_reading || 0)}`}
                                            value={startOdometer}
                                            onChange={(e) => setStartOdometer(e.target.value)}
                                        />
                                        <p className="text-xs text-muted-foreground">Leave blank to keep the current reading.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 justify-end">
                                    <DialogClose asChild>
                                        <Button variant="outline">Cancel</Button>
                                    </DialogClose>
                                    <DialogClose asChild>
                                        <Button onClick={handleStartJob} disabled={isStarting}>
                                            {isStarting ? 'Starting...' : 'Start Job'}
                                        </Button>
                                    </DialogClose>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                    {job.status === 'in_progress' && (
                        <>
                            <Button variant="outline" onClick={() => router.push(`/dashboard/jobs/${id}/pod`)}>
                                <Camera className="mr-2 h-4 w-4" /> POD
                            </Button>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button disabled={isCompleting}>
                                        <CheckCircle2 className="mr-2 h-4 w-4" /> Complete
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Complete Job {job.job_number}</DialogTitle>
                                        <CardDescription>Enter the vehicle's current odometer reading to keep maintenance tracking accurate.</CardDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                            <Gauge className="h-5 w-5 text-muted-foreground" />
                                            <div>
                                                <p className="text-sm font-medium">Current Vehicle Odometer</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {job.vehicles?.license_plate} — Last reading: {((job.vehicles as any)?.odometer_reading || 0).toLocaleString()} mi
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="end-odometer">End Odometer (Miles)</Label>
                                            <Input
                                                id="end-odometer"
                                                type="number"
                                                placeholder="e.g. 52340"
                                                value={endOdometer}
                                                onChange={(e) => setEndOdometer(e.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground">This updates the vehicle's odometer for maintenance tracking. Leave blank to skip.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end">
                                        <DialogClose asChild>
                                            <Button variant="outline">Cancel</Button>
                                        </DialogClose>
                                        <DialogClose asChild>
                                            <Button onClick={handleCompleteJob} disabled={isCompleting}>
                                                {isCompleting ? 'Completing...' : 'Complete Job'}
                                            </Button>
                                        </DialogClose>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                    {/* Dispatcher Cancel Option */}
                    {job.status !== 'cancelled' && job.status !== 'completed' && (
                        <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleStatusChange('cancelled')} disabled={updateMutation.isPending}>
                            <XCircle className="mr-2 h-4 w-4" /> Cancel Job
                        </Button>
                    )}
                </div>
            </div>

            {/* Status Alert */}
            <Alert className={`${status.bgColor} border-0`}>
                <StatusIcon className={`h-4 w-4 ${status.color}`} />
                <AlertTitle className={status.color}>{status.label}</AlertTitle>
                <AlertDescription className="text-gray-700">
                    {dynamicDescription}
                </AlertDescription>
            </Alert>

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
                                            <div className="font-semibold">{job.vehicles ? job.vehicles.license_plate : 'No Vehicle Assigned'}</div>
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
                                            ? `${formatTime(stop.window_start)} - ${formatTime(stop.window_end)}`
                                            : stop.scheduled_arrival
                                                ? formatTime(stop.scheduled_arrival)
                                                : stop.scheduled_time
                                                    ? formatTime(stop.scheduled_time)
                                                    : 'Not Scheduled'

                                        // Actual Times Display
                                        const actualArrival = stop.actual_arrival_time
                                            ? formatTime(stop.actual_arrival_time)
                                            : null

                                        const actualCompletion = stop.actual_completion_time
                                            ? formatTime(stop.actual_completion_time)
                                            : null

                                        // Waiting Time Calculation
                                        const waitingMinutes = (stop.actual_arrival_time && stop.actual_completion_time)
                                            ? Math.round((new Date(stop.actual_completion_time).getTime() - new Date(stop.actual_arrival_time).getTime()) / 60000)
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
                                                            {stop.location_name && (
                                                                <p className="text-sm font-semibold text-slate-900">{stop.location_name}</p>
                                                            )}
                                                            <p className={`text-sm ${stop.location_name ? 'text-muted-foreground' : 'font-medium'}`}>{stop.address}</p>
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
                                                                                timestamp: stop.actual_completion_time || stop.actual_arrival_time
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
                                                                                {actualArrival || '--:--'}
                                                                            </span>
                                                                        </div>
                                                                        {actualCompletion && (
                                                                            <div>
                                                                                <span className="font-semibold block text-xs uppercase tracking-wider">Completed</span>
                                                                                <span className="text-green-600 font-medium">
                                                                                    {actualCompletion}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {waitingMinutes !== null && (
                                                                            <div>
                                                                                <span className="font-semibold block text-xs uppercase tracking-wider">Wait Time</span>
                                                                                <span className="font-medium">
                                                                                    {waitingMinutes} min
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        )}
                                                    </div>

                                                    {/* Dispatcher Force Actions */}
                                                    {job.status !== 'completed' && job.status !== 'cancelled' && (
                                                        <div className="flex gap-2 mb-2">
                                                            {/* Force Arrived */}
                                                            {!stop.actual_arrival_time && stop.status !== 'completed' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:pointer-events-none"
                                                                    onClick={() => updateStopMutation.mutate({
                                                                        id: stop.id,
                                                                        updates: {
                                                                            actual_arrival_time: new Date().toISOString(),
                                                                        }
                                                                    })}
                                                                    disabled={updateStopMutation.isPending || job.status !== 'in_progress'}
                                                                >
                                                                    <MapPin className="h-3 w-3 mr-1" /> Mark Arrived
                                                                </Button>
                                                            )}

                                                            {/* Force Complete */}
                                                            {stop.status !== 'completed' && (
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50 disabled:pointer-events-none"
                                                                            disabled={forceCompleteStopMutation.isPending || job.status !== 'in_progress'}
                                                                        >
                                                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Force Complete
                                                                        </Button>
                                                                    </DialogTrigger>
                                                                    <DialogContent>
                                                                        <DialogHeader>
                                                                            <DialogTitle>Force Complete Stop #{index + 1}</DialogTitle>
                                                                            <CardDescription>Manually mark this stop as completed. You can add notes.</CardDescription>
                                                                        </DialogHeader>
                                                                        <div className="grid gap-4 py-4">
                                                                            <div className="space-y-2">
                                                                                <label className="text-sm font-medium">Notes (Optional)</label>
                                                                                <textarea
                                                                                    id={`notes-${stop.id}`}
                                                                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                                    placeholder="Dispatcher note: Verified with customer..."
                                                                                />
                                                                            </div>
                                                                            <Button onClick={() => {
                                                                                const notesElement = document.getElementById(`notes-${stop.id}`) as HTMLTextAreaElement
                                                                                forceCompleteStopMutation.mutate({
                                                                                    stopId: stop.id,
                                                                                    jobId: job.id,
                                                                                    notes: notesElement ? notesElement.value : ''
                                                                                })
                                                                            }} disabled={forceCompleteStopMutation.isPending || job.status !== 'in_progress'}>
                                                                                {forceCompleteStopMutation.isPending ? 'Completing...' : 'Confirm Completion'}
                                                                            </Button>
                                                                        </div>
                                                                    </DialogContent>
                                                                </Dialog>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                                        <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                                                            <Clock className="h-3 w-3" />
                                                            <span>Sched: {scheduledTime}</span>
                                                        </div>
                                                        {actualArrival && (
                                                            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${isLate ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                <span>Arrived: {actualArrival}</span>
                                                            </div>
                                                        )}
                                                        {actualCompletion && (
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 text-green-700">
                                                                <CheckCircle2 className="h-3 w-3" />
                                                                <span>Completed: {actualCompletion}</span>
                                                            </div>
                                                        )}
                                                        {waitingMinutes !== null && (
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                                                                <Timer className="h-3 w-3" />
                                                                <span>Wait: {waitingMinutes} min</span>
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

                            <JobFinancialsCard job={job as any} />

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

                <TabsContent value="documents" className="flex-1 mt-0 h-full min-h-0">
                    <div className={`grid grid-cols-1 ${job.proof_of_delivery?.length ? 'lg:grid-cols-2' : ''} gap-6 h-full`}>
                        {/* POD Section - Only shows if data exists */}
                        {job.proof_of_delivery && job.proof_of_delivery.length > 0 && (
                            <div className="h-full overflow-y-auto pr-1">
                                <JobPODViewer podData={job.proof_of_delivery} />
                            </div>
                        )}

                        {/* General Documents Section */}
                        <Card className="h-full flex flex-col border-slate-200 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Job Documents</CardTitle>
                                <CardDescription>Upload and manage job-related files.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 min-h-0 overflow-y-auto">
                                <EntityDocuments entityId={id} entityType="job" />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Financial Review Modal */}
            <FinancialReviewModal
                job={job}
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                onConfirm={handleFinancialReviewConfirm}
                isSubmitting={isReviewSubmitting}
            />
        </div>
    )
}
