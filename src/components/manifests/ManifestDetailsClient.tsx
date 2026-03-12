'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Manifest } from '@/types/database'
import { ManifestRouteMap } from './ManifestRouteMap'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EntityDocuments } from '@/components/documents/EntityDocuments'
import {
    Truck, User, Calendar, MapPin, CheckCircle2, Play, Navigation,
    AlertCircle, Clock, Package, Info, ArrowRight, Smartphone,
    Route, CircleDot, Timer, DollarSign, Download
} from 'lucide-react'
import { useStartTrip, useCompleteTrip } from '@/hooks/useTrips'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ProofOfDeliveryMap } from '@/components/manifests/ProofOfDeliveryMap'
import { format } from 'date-fns'
import { useRealtimeUpdate } from '@/hooks/useRealtimeUpdate'
import { manifestKeys, useUpdateManifest } from '@/hooks/useManifests'
import { formatDate, formatTime, parseTime } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ManifestFinancialReviewModal } from '@/components/manifests/ManifestFinancialReviewModal'
import { generateManifestPDF } from '@/lib/generateManifestPDF'
import { JobPODViewer } from '@/components/jobs/JobPODViewer'
import { JobFinancialsCard } from '@/components/jobs/JobFinancialsCard'
import { TrendingUp, PieChart, FileText, IndianRupee } from 'lucide-react'

interface ManifestDetailsClientProps {
    manifest: any
}

// Status config for better UX
const statusConfig: Record<string, {
    label: string
    color: string
    bgColor: string
    description: string
    icon: any
}> = {
    draft: {
        label: 'Draft',
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        description: 'Manifest is being prepared. Add jobs and assign a driver.',
        icon: CircleDot
    },
    planning: {
        label: 'Planning',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        description: 'Route is being planned. Review jobs and optimize the route.',
        icon: Route
    },
    scheduled: {
        label: 'Scheduled',
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        description: 'Ready for dispatch. Click "Start Trip" when the driver begins.',
        icon: Calendar
    },
    dispatched: {
        label: 'Dispatched',
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        description: 'Driver has been notified. Waiting for trip to start.',
        icon: Play
    },
    in_transit: {
        label: 'In Transit',
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        description: 'Driver is on the road. Track progress via driver location.',
        icon: Truck
    },
    completed: {
        label: 'Completed',
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        description: 'All jobs have been delivered successfully.',
        icon: CheckCircle2
    },
    cancelled: {
        label: 'Cancelled',
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        description: 'This manifest has been cancelled.',
        icon: AlertCircle
    }
}

export function ManifestDetailsClient({ manifest }: ManifestDetailsClientProps) {
    const router = useRouter()
    const startTrip = useStartTrip()
    const completeTrip = useCompleteTrip()
    const updateManifestMutation = useUpdateManifest()
    const [isActionLoading, setIsActionLoading] = useState(false)
    const [isStartModalOpen, setIsStartModalOpen] = useState(false)
    const [startOdometer, setStartOdometer] = useState(manifest.vehicles?.odometer_reading?.toString() || '')

    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)

    // --- Real-time Updates ---
    // 1. Listen for changes to THIS manifest
    useRealtimeUpdate('manifests', manifestKeys.detail(manifest.id), `id=eq.${manifest.id}`)

    // 2. Listen for changes to jobs in this manifest
    useRealtimeUpdate('jobs', manifestKeys.detail(manifest.id), `manifest_id=eq.${manifest.id}`)

    // 3. Listen for stop changes (broad listener for simplicity)
    useRealtimeUpdate('job_stops', manifestKeys.detail(manifest.id))
    // Note: We ideally want to filter by job_id, but supabase realtime filters are simple.
    // Invalidating the manifest detail query will refresh everything (jobs + stops) which is what we want.

    // Get status config
    const status = statusConfig[manifest.status] || statusConfig.draft
    const StatusIcon = status.icon

    // Calculate Waypoints for Map from job_stops
    const waypoints = useMemo(() => {
        const points = manifest?.jobs?.flatMap((job: any, jobIndex: number) => {
            if (!job.job_stops || !Array.isArray(job.job_stops)) return []

            return job.job_stops
                .filter((stop: any) => stop.latitude && stop.longitude)
                .map((stop: any) => ({
                    lat: stop.latitude,
                    lng: stop.longitude,
                    type: stop.type || 'waypoint',
                    sequence: (job.sequence_order || jobIndex + 1) * 100 + (stop.sequence_order || 0),
                    address: stop.address || 'Unknown Address',
                    jobId: job.id,
                    stopId: stop.id
                }))
        }) || []

        // Sort waypoints by sequence
        points.sort((a: any, b: any) => a.sequence - b.sequence)
        return points
    }, [manifest?.jobs])

    // Calculate job statistics
    const jobStats = useMemo(() => {
        const jobs = manifest?.jobs || []
        const totalJobs = jobs.length
        const completedJobs = jobs.filter((j: any) => j.status === 'completed').length
        const totalStops = jobs.reduce((acc: number, job: any) => acc + (job.job_stops?.length || 0), 0)

        return { totalJobs, completedJobs, totalStops }
    }, [manifest?.jobs])

    // Get all job IDs for document aggregation
    const jobIds = useMemo(() => {
        return manifest?.jobs?.map((j: any) => j.id) || []
    }, [manifest?.jobs])

    // Aggregate Proof of Delivery data from all jobs
    const allPodData = useMemo(() => {
        return manifest?.jobs?.flatMap((j: any) => j.proof_of_delivery || []) || []
    }, [manifest?.jobs])

    // Calculate Manifest Financial Summary
    const financialSummary = useMemo(() => {
        const jobs = manifest?.jobs || []
        const authorizedJobs = jobs.filter((j: any) => j.financial_status === 'approved')
        
        const totalRevenue = authorizedJobs.reduce((sum: number, j: any) => sum + (j.revenue || 0), 0)
        
        // This is tricky because costs are in a separate table
        // But we can show what we have in the jobs table (revenue) 
        // and later integrate more if needed.
        return { totalRevenue, authorizedCount: authorizedJobs.length }
    }, [manifest?.jobs])

    // Mock driver location (in real app, this would come from real-time tracking)
    // For now, show the first waypoint as "last known location" when in transit
    const vehicleLocation = useMemo(() => {
        if (manifest.status !== 'in_transit' || waypoints.length === 0) return null

        // In a real implementation, this would be fetched from the vehicle's GPS
        // For demo, we could use the vehicle's current_location from the database
        if (manifest.vehicles?.current_location) {
            const loc = manifest.vehicles.current_location
            if (loc.lat && loc.lng) {
                return { lat: loc.lat, lng: loc.lng }
            }
        }
        return null
    }, [manifest.status, manifest.vehicles?.current_location, waypoints])

    const handleStartTrip = async () => {
        if (!manifest.driver_id || !manifest.vehicle_id) {
            alert("Driver and Vehicle required")
            return
        }
        setIsActionLoading(true)
        try {
            await startTrip.mutateAsync({
                manifestId: manifest.id,
                driverId: manifest.driver_id,
                vehicleId: manifest.vehicle_id,
                startOdometer: startOdometer ? parseInt(startOdometer) : undefined
            })
            alert("Trip Started. Manifest is now In Transit.")
            setIsStartModalOpen(false)
            router.refresh()
        } catch (error: any) {
            alert(error.message)
        } finally {
            setIsActionLoading(false)
        }
    }

    const handleCancelManifest = async () => {
        if (!confirm('Are you sure you want to cancel this manifest?')) return
        setIsActionLoading(true)
        try {
            await updateManifestMutation.mutateAsync({
                id: manifest.id,
                updates: { status: 'cancelled' }
            })
        } catch (error: any) {
            alert(error.message)
        } finally {
            setIsActionLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] gap-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">{manifest.manifest_number}</h1>
                        <Badge className={`${status.bgColor} ${status.color} border-0`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <Calendar className="h-4 w-4" />
                            <span>{manifest.scheduled_date ? formatDate(manifest.scheduled_date) : 'No Date Set'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Package className="h-4 w-4" />
                            <span>{jobStats.totalJobs} Jobs • {jobStats.totalStops} Stops</span>
                        </div>
                    </div>
                </div>
                {/* Financial Overview Card */}
                {manifest.status === 'completed' && financialSummary.authorizedCount > 0 && financialSummary.authorizedCount < jobStats.totalJobs && (
                    <Card className="flex-1 max-w-xs bg-green-50 border-green-100 shadow-sm hidden md:flex">
                        <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wider">Total Revenue</p>
                                    <p className="text-lg font-bold text-green-900">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(financialSummary.totalRevenue)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Authorized</p>
                                <p className="text-sm font-bold text-slate-700">{financialSummary.authorizedCount} / {jobStats.totalJobs}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                    {manifest.status === 'scheduled' && (
                        <Dialog open={isStartModalOpen} onOpenChange={setIsStartModalOpen}>
                            <DialogTrigger asChild>
                                <Button disabled={isActionLoading} size="lg">
                                    <Play className="mr-2 h-4 w-4" />
                                    Start Trip
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Start Trip</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Starting Odometer Reading</Label>
                                        <Input
                                            type="number"
                                            value={startOdometer}
                                            onChange={(e) => setStartOdometer(e.target.value)}
                                            placeholder="Enter current odometer reading"
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            Last recorded: {manifest.vehicles?.odometer_reading || 'None'}
                                        </p>
                                    </div>
                                    <Button onClick={handleStartTrip} className="w-full" disabled={isActionLoading || !startOdometer}>
                                        {isActionLoading ? 'Starting...' : 'Confirm & Start Trip'}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}

                    {manifest.status === 'completed' && jobStats.totalJobs > 0 && financialSummary.authorizedCount < jobStats.totalJobs && (
                        <Button
                            onClick={() => setIsReviewModalOpen(true)}
                            variant="default"
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <DollarSign className="mr-2 h-4 w-4" /> Authorize Finances
                        </Button>
                    )}

                    {jobStats.totalJobs > 0 && (
                        <Button
                            variant="outline"
                            onClick={() => generateManifestPDF(manifest)}
                        >
                            <Download className="mr-2 h-4 w-4" /> Download PDF
                        </Button>
                    )}

                    {manifest.status !== 'cancelled' && manifest.status !== 'completed' && (
                        <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleCancelManifest} disabled={isActionLoading}>
                            <AlertCircle className="mr-2 h-4 w-4" /> Cancel Manifest
                        </Button>
                    )}
                </div>
            </div>

            {/* Status Alert - Explains what's happening */}
            <Alert className={`${status.bgColor} border-0`}>
                <StatusIcon className={`h-4 w-4 ${status.color}`} />
                <AlertTitle className={status.color}>{status.label}</AlertTitle>
                <AlertDescription className="text-gray-700">
                    {status.description}
                    {manifest.status === 'in_transit' && (
                        <span className="block mt-2">
                            <Smartphone className="inline h-4 w-4 mr-1" />
                            <strong>Note:</strong> The driver will mark stops as completed using the Driver App.
                            This dashboard shows real-time progress.
                        </span>
                    )}
                </AlertDescription>
            </Alert>

            {/* Main Content */}
            <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-[600px] grid-cols-3 mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="finance">Finance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="flex-1 min-h-0 mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                        {/* Left Panel - Details */}
                        <div className="space-y-4 overflow-auto pr-2 pb-2 h-full">
                            {/* Assignment Card */}
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium">Assignment Details</CardTitle>
                                    <CardDescription className="text-xs">Driver and vehicle assigned to this route</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                            <User className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold">{manifest.drivers?.profiles?.full_name || 'No Driver Assigned'}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {manifest.drivers?.profiles?.phone || 'Driver'}
                                            </div>
                                        </div>
                                        {manifest.status === 'in_transit' && (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                <div className="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse" />
                                                Active
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                            <Truck className="h-6 w-6 text-slate-600" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold">
                                                {manifest.vehicles ? manifest.vehicles.license_plate : 'No Vehicle Assigned'}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {manifest.vehicles ? `${manifest.vehicles.make} ${manifest.vehicles.model}` : 'Vehicle'}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Progress Card (when in transit) */}
                            {manifest.status === 'in_transit' && (
                                <Card className="border-amber-200 bg-amber-50/30">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <Timer className="h-4 w-4 text-amber-600" />
                                            Trip Progress
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Jobs Completed</span>
                                                <span className="font-medium">{jobStats.completedJobs} / {jobStats.totalJobs}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                                                    style={{ width: `${jobStats.totalJobs > 0 ? (jobStats.completedJobs / jobStats.totalJobs) * 100 : 0}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                <Smartphone className="inline h-3 w-3 mr-1" />
                                                Driver completes stops via the mobile app
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Stops Section Header */}
                            <div className="flex items-center justify-between pt-2 pb-2">
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Route Stops <span className="text-slate-400 font-normal ml-1">({jobStats.totalStops})</span>
                                </h3>
                            </div>

                            <div className="space-y-6">
                                {manifest.jobs?.length === 0 && (
                                    <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                        <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm font-medium">No jobs assigned</p>
                                        <p className="text-xs text-slate-400 mt-1">Add jobs to this manifest to see them here.</p>
                                    </div>
                                )}

                                {manifest.jobs?.map((job: any, jobIndex: number) => {
                                    const stops = job.job_stops || []
                                    const isJobCompleted = job.status === 'completed'

                                    return (
                                        <div key={job.id} className="rounded-xl border border-slate-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
                                            {/* Job Header */}
                                            <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="bg-slate-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">#{jobIndex + 1}</span>
                                                        <span className="font-bold text-slate-800 text-sm whitespace-nowrap">Job #{job.job_number}</span>
                                                        {isJobCompleted && (
                                                            <div className="flex items-center gap-2 ml-2">
                                                                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none shadow-none whitespace-nowrap">
                                                                    Completed
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-slate-500 min-w-0 pl-1">
                                                        <User className="h-3 w-3 text-slate-400 flex-none" />
                                                        <span className="text-xs font-semibold text-blue-600 truncate">
                                                            {(Array.isArray(job.customers) ? job.customers[0]?.name : job.customers?.name) || job.customer_name || 'Generic Customer'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {!isJobCompleted && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-white hover:shadow-sm transition-all flex-none"
                                                        onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                                                    >
                                                        View Details <ArrowRight className="h-3 w-3 ml-1.5 opacity-50" />
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Stops List */}
                                            <div className="divide-y divide-slate-50">
                                                {stops.length > 0 ? stops.map((stop: any, stopIndex: number) => {
                                                    const isStopCompleted = stop.status === 'completed'

                                                    return (
                                                        <div key={stop.id} className={`group flex items-start gap-4 p-4 hover:bg-slate-50/30 transition-colors ${isStopCompleted ? 'bg-slate-50/50' : ''}`}>
                                                            {/* Column 1: Indicator */}
                                                            <div className="flex-none pt-1">
                                                                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shadow-sm ${isStopCompleted
                                                                    ? 'bg-green-100 text-green-700 ring-4 ring-green-50'
                                                                    : stop.type === 'pickup'
                                                                        ? 'bg-white border-2 border-blue-100 text-blue-700 shadow-blue-100'
                                                                        : stop.type === 'dropoff'
                                                                            ? 'bg-white border-2 border-orange-100 text-orange-700 shadow-orange-100'
                                                                            : 'bg-white border-2 border-slate-100 text-slate-700'
                                                                    }`}>
                                                                    {isStopCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : stopIndex + 1}
                                                                </div>
                                                            </div>

                                                            {/* Column 2: Main Info */}
                                                            <div className="flex-1 min-w-0 grid gap-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${stop.type === 'pickup' ? 'bg-blue-50 text-blue-700' :
                                                                        stop.type === 'dropoff' ? 'bg-orange-50 text-orange-700' :
                                                                            'bg-slate-100 text-slate-700'
                                                                        }`}>
                                                                        {stop.type}
                                                                    </span>
                                                                    {stop.notes && (
                                                                        <span className="flex items-center text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full max-w-[200px] truncate">
                                                                            <Info className="h-2.5 w-2.5 mr-1" />
                                                                            {stop.notes}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <p className={`text-sm font-medium leading-normal ${isStopCompleted ? 'text-slate-500' : 'text-slate-900'}`}>
                                                                    {stop.location_name || stop.address}
                                                                </p>
                                                                {stop.location_name && (
                                                                    <p className="text-xs text-muted-foreground leading-normal">
                                                                        {stop.address}
                                                                    </p>
                                                                )}

                                                                {/* Metadata / Times */}
                                                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                                                    {(stop.arrival_mode === 'window' && stop.window_start && stop.window_end) ? (
                                                                        <span className="flex items-center bg-slate-50 px-1.5 py-0.5 rounded text-slate-600 border border-slate-100">
                                                                            <Clock className="w-3 h-3 mr-1.5 opacity-50" />
                                                                            {formatTime(stop.window_start)} - {formatTime(stop.window_end)}
                                                                        </span>
                                                                    ) : (stop.arrival_mode === 'fixed' && stop.scheduled_arrival) ? (
                                                                        <span className="flex items-center bg-slate-50 px-1.5 py-0.5 rounded text-slate-600 border border-slate-100">
                                                                            <Clock className="w-3 h-3 mr-1.5 opacity-50" />
                                                                            {formatTime(stop.scheduled_arrival)}
                                                                        </span>
                                                                    ) : null}

                                                                    {stop.actual_arrival_time && (
                                                                        <span className={`flex items-center px-1.5 py-0.5 rounded border ${(() => {
                                                                            const actualDate = parseTime(stop.actual_arrival_time)
                                                                            const scheduledDate = parseTime(stop.scheduled_arrival)
                                                                            return actualDate && scheduledDate && actualDate > scheduledDate
                                                                                ? 'text-red-700 bg-red-50 border-red-100'
                                                                                : 'text-green-700 bg-green-50 border-green-100'
                                                                        })()}`}>
                                                                            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${stop.actual_arrival_time ? (parseTime(stop.actual_arrival_time) && parseTime(stop.scheduled_arrival) && parseTime(stop.actual_arrival_time)! > parseTime(stop.scheduled_arrival)! ? 'bg-red-500' : 'bg-green-500') : 'bg-slate-400'
                                                                                }`} />
                                                                            Arrived: {formatTime(stop.actual_arrival_time)}
                                                                        </span>
                                                                    )}

                                                                    {stop.actual_completion_time && (
                                                                        <span className="flex items-center px-1.5 py-0.5 rounded border text-green-700 bg-green-50 border-green-100">
                                                                            <div className="w-1.5 h-1.5 rounded-full mr-1.5 bg-green-500" />
                                                                            Completed: {formatTime(stop.actual_completion_time)}
                                                                        </span>
                                                                    )}

                                                                    {stop.actual_arrival_time && stop.actual_completion_time && (() => {
                                                                        const waitMin = Math.round((new Date(stop.actual_completion_time).getTime() - new Date(stop.actual_arrival_time).getTime()) / 60000)
                                                                        return (
                                                                            <span className="flex items-center px-1.5 py-0.5 rounded border text-amber-700 bg-amber-50 border-amber-100">
                                                                                <Timer className="w-3 h-3 mr-1.5" />
                                                                                Wait: {waitMin} min
                                                                            </span>
                                                                        )
                                                                    })()}
                                                                </div>
                                                            </div>

                                                            {/* Column 3: Actions */}
                                                            {isStopCompleted && (stop.actual_arrival_lat || stop.actual_completion_lat) && (
                                                                <div className="flex-none self-center">
                                                                    <ProofOfDeliveryDialog stop={stop} formatTime={formatTime} parseTime={parseTime} />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                }) : (
                                                    <div className="p-8 text-center text-slate-400 text-sm">
                                                        No stops defined
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Right Panel - Map (takes 2 columns) */}
                        <div className="lg:col-span-2 h-[500px] lg:h-full rounded-xl overflow-hidden border shadow-sm">
                            <ManifestRouteMap
                                waypoints={waypoints}
                                vehicleLocation={vehicleLocation}
                                driverName={manifest.drivers?.profiles?.full_name}
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="documents" className="flex-1 mt-0 overflow-y-auto px-1 pb-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-full">
                        {allPodData.length > 0 && (
                            <div className="h-full overflow-y-auto">
                                <div className="mb-4">
                                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
                                        <FileText className="h-4 w-4 text-blue-600" />
                                        Driver Proof of Delivery
                                    </h3>
                                    <JobPODViewer podData={allPodData} />
                                </div>
                            </div>
                        )}
                        
                        <Card className="h-full border-slate-200 shadow-sm flex flex-col">
                            <CardHeader className="pb-3 px-4 pt-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base">Job Documents</CardTitle>
                                        <CardDescription className="text-xs">
                                            All uploaded files for jobs in this manifest.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 px-4 pb-4 overflow-y-auto">
                                <EntityDocuments
                                    entityType="job"
                                    entityIds={jobIds}
                                    relatedJobs={manifest.jobs}
                                    excludeTypes={[
                                        'proof_of_delivery', 'Proof of Delivery', 
                                        'proof_of_pickup', 'Proof of Pick Up', 
                                        'proof_of_completion', 'Proof of Completion'
                                    ]}
                                    className="h-full"
                                />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="finance" className="flex-1 mt-0 h-full min-h-0">
                    <div className="space-y-6 h-full overflow-y-auto pr-2 pb-6 pt-4">
                        {/* Summary Header */}
                        {financialSummary.authorizedCount > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="bg-green-50 border-green-100">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                                <DollarSign className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wider">Total Revenue</p>
                                                <p className="text-xl font-bold text-green-900">
                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(financialSummary.totalRevenue)}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-blue-50 border-blue-100">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider">Authorized Jobs</p>
                                                <p className="text-xl font-bold text-blue-900">{financialSummary.authorizedCount} / {jobStats.totalJobs}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {(manifest.jobs || []).map((job: any) => (
                                <div key={job.id} className="space-y-2">
                                    <div className="flex items-center justify-between px-2">
                                        <h4 className="text-sm font-bold text-slate-700">Job #{job.job_number}</h4>
                                        <Badge className={job.financial_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                                            {job.financial_status === 'approved' ? 'Authorized' : 'Pending Review'}
                                        </Badge>
                                    </div>
                                    <JobFinancialsCard job={job} />
                                </div>
                            ))}
                        </div>
                        
                        {(!manifest.jobs || manifest.jobs.length === 0) && (
                            <div className="text-center py-20 text-slate-400 italic">
                                No jobs assigned to this manifest.
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Financial Review Wizard */}
            <ManifestFinancialReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                manifestId={manifest.id}
                jobs={manifest.jobs || []}
            />
        </div>
    )
}

const ProofOfDeliveryDialog = ({ stop, formatTime, parseTime }: { stop: any, formatTime: any, parseTime: any }) => (
    <Dialog>
        <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-blue-600 hover:bg-blue-50 -mt-1 -mr-2">
                <MapPin className="h-3 w-3 mr-1" />
                Verify
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Proof of Delivery - {stop.type}</DialogTitle>
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
                    {(stop.arrival_mode === 'window' && stop.window_start && stop.window_end)
                        ? `${formatTime(stop.window_start)} - ${formatTime(stop.window_end)}`
                        : stop.scheduled_arrival ? formatTime(stop.scheduled_arrival) : '--:--'}
                </div>
                <div>
                    <span className="font-semibold block text-xs uppercase tracking-wider">Arrived</span>
                    <span className={(() => {
                        const actualDate = parseTime(stop.actual_arrival_time)
                        const scheduledDate = parseTime(stop.scheduled_arrival)
                        return actualDate && scheduledDate && actualDate > scheduledDate ? "text-red-600 font-medium" : "text-green-600 font-medium"
                    })()}>
                        {formatTime(stop.actual_arrival_time) || '--:--'}
                    </span>
                </div>
                {stop.actual_completion_time && (
                    <div>
                        <span className="font-semibold block text-xs uppercase tracking-wider">Completed</span>
                        <span className="text-green-600 font-medium">
                            {formatTime(stop.actual_completion_time)}
                        </span>
                    </div>
                )}
                {stop.actual_arrival_time && stop.actual_completion_time && (
                    <div>
                        <span className="font-semibold block text-xs uppercase tracking-wider">Wait Time</span>
                        <span className="font-medium">
                            {Math.round((new Date(stop.actual_completion_time).getTime() - new Date(stop.actual_arrival_time).getTime()) / 60000)} min
                        </span>
                    </div>
                )}
            </div>
        </DialogContent>
    </Dialog>
)
