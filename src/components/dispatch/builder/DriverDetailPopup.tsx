'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Truck, MapPin, Calendar, Package, Clock, CheckCircle2, AlertCircle, Navigation, ArrowRight } from 'lucide-react'
import { useJobs } from '@/hooks/useJobs'
import { useVehicles } from '@/hooks/useVehicles'
import { useManifests } from '@/hooks/useManifests'

interface DriverDetailPopupProps {
    driver: any
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelectForManifest?: () => void
}

export function DriverDetailPopup({ driver, open, onOpenChange, onSelectForManifest }: DriverDetailPopupProps) {
    // Fetch all jobs
    const { data: jobsData } = useJobs()
    const allJobs = jobsData?.data || []

    // Fetch vehicles to get assigned vehicle details
    const { data: vehiclesData } = useVehicles()
    const allVehicles = vehiclesData?.data || []

    // Fetch manifests to get current active trip
    const { data: manifestsData } = useManifests()
    const allManifests = manifestsData || []

    // Find the assigned vehicle details
    const assignedVehicle = driver?.assigned_vehicle_id
        ? allVehicles.find((v: any) => v.id === driver.assigned_vehicle_id)
        : null

    // Find current active manifest for this driver
    const currentManifest = allManifests.find(
        (m: any) => m.driver_id === driver?.id && ['scheduled', 'in_progress'].includes(m.status)
    )

    // Get current job from the manifest
    // Get current job from the manifest
    const currentJob = currentManifest?.jobs?.[0] || null

    // Filter completed jobs for this driver (last 5)
    const driverJobs = allJobs
        .filter(job => job.driver_id === driver?.id)
        .slice(0, 5)

    if (!driver) return null

    const statusColorMap: Record<string, string> = {
        available: 'bg-green-100 text-green-700 border-green-200',
        on_trip: 'bg-blue-100 text-blue-700 border-blue-200',
        off_duty: 'bg-slate-100 text-slate-700 border-slate-200',
        unavailable: 'bg-red-100 text-red-700 border-red-200'
    }

    const statusColor = statusColorMap[driver.status || 'available'] || 'bg-slate-100 text-slate-700'

    const isOnTrip = driver.status === 'on_trip' || !!currentManifest

    // Calculate estimated time when driver becomes free
    const getEstimatedFreeTime = () => {
        if (!currentManifest) return null

        // Get the last stop from current manifest jobs
        const manifestJobs = currentManifest.jobs || []
        if (manifestJobs.length === 0) return null

        const lastJob = manifestJobs[manifestJobs.length - 1]
        if (!lastJob) return null

        // Use scheduled_time if available
        if (lastJob.scheduled_time) {
            const [hours, minutes] = lastJob.scheduled_time.split(':')
            const eta = new Date()
            eta.setHours(parseInt(hours), parseInt(minutes) + 30) // Add 30 min buffer
            return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }

        return 'Unknown'
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader className="pb-4 border-b">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-7 w-7 text-blue-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl">
                                    {driver.profiles?.full_name || 'Unknown Driver'}
                                </DialogTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge className={statusColor}>
                                        {driver.status || 'available'}
                                    </Badge>
                                    {driver.license_number && (
                                        <span className="text-sm text-muted-foreground">
                                            License: {driver.license_number}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {onSelectForManifest && (
                            <Button onClick={() => {
                                onSelectForManifest()
                                onOpenChange(false)
                            }}>
                                Select for Manifest
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="space-y-4 pt-4">
                    {/* Current Trip Status */}
                    <Card className={isOnTrip ? "border-blue-200 bg-blue-50/50" : "border-green-200 bg-green-50/50"}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                {isOnTrip ? (
                                    <><Clock className="h-4 w-4 text-blue-600" /> Currently On Trip</>
                                ) : (
                                    <><CheckCircle2 className="h-4 w-4 text-green-600" /> Available for Dispatch</>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isOnTrip && currentManifest ? (
                                <div className="space-y-3">
                                    {/* Manifest Info */}
                                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border">
                                        <div>
                                            <p className="font-medium text-sm">
                                                Manifest #{currentManifest.manifest_number || currentManifest.id?.slice(0, 8)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {currentManifest.jobs?.length || 0} job(s) • {currentManifest.status}
                                            </p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {currentManifest.status}
                                        </Badge>
                                    </div>

                                    {/* Current Job Details */}
                                    {currentJob && (
                                        <div className="p-3 bg-white rounded-lg border space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-medium text-sm">Current Job: {currentJob.job_number}</span>
                                                <span className="text-xs text-muted-foreground">{currentJob.customer_name}</span>
                                            </div>

                                            {/* Route */}
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                                    <span className="truncate max-w-[150px]">
                                                        {currentJob.pickup_location?.address || 'Pickup'}
                                                    </span>
                                                </div>
                                                <ArrowRight className="h-3 w-3 flex-shrink-0" />
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                                    <span className="truncate max-w-[150px]">
                                                        {currentJob.delivery_location?.address || 'Delivery'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ETA When Free */}
                                    <div className="flex items-center gap-2 text-sm">
                                        <Clock className="h-4 w-4 text-blue-500" />
                                        <span className="text-muted-foreground">Est. Available:</span>
                                        <span className="font-medium">{getEstimatedFreeTime() || 'Calculating...'}</span>
                                    </div>
                                </div>
                            ) : isOnTrip ? (
                                <p className="text-sm text-muted-foreground">
                                    Driver is marked as on trip but no active manifest found.
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Driver is ready to be assigned to a new manifest.
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Location Map Placeholder */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <MapPin className="h-4 w-4" /> Last Known Location
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-40 bg-slate-100 rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                                <div className="text-center">
                                    <Navigation className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                                    <p>GPS tracking available in Phase 2</p>
                                    <p className="text-xs">Real-time location will be shown here</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Assigned Vehicle - Now shows actual vehicle info */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Truck className="h-4 w-4" /> Assigned Vehicle
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {assignedVehicle ? (
                                <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
                                    <div className="h-10 w-10 rounded bg-orange-100 flex items-center justify-center">
                                        <Truck className="h-5 w-5 text-orange-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{assignedVehicle.registration_number}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {assignedVehicle.make} {assignedVehicle.model} {assignedVehicle.year && `(${assignedVehicle.year})`}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        {assignedVehicle.status || 'available'}
                                    </Badge>
                                </div>
                            ) : driver.assigned_vehicle_id ? (
                                <div className="flex items-center gap-3 p-2 bg-orange-50 border border-orange-200 rounded-md">
                                    <div className="h-8 w-8 rounded bg-orange-100 flex items-center justify-center">
                                        <Truck className="h-4 w-4 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">Vehicle Assigned</p>
                                        <p className="text-xs text-muted-foreground">Loading details...</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <AlertCircle className="h-4 w-4" />
                                    No vehicle currently assigned
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recent Jobs */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Package className="h-4 w-4" /> Recent Jobs
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {driverJobs.length > 0 ? (
                                <div className="space-y-2">
                                    {driverJobs.map(job => (
                                        <div key={job.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-md text-sm">
                                            <div>
                                                <span className="font-medium">{job.job_number}</span>
                                                <span className="text-muted-foreground ml-2">{job.customer_name}</span>
                                            </div>
                                            <Badge variant="outline" className="text-xs">
                                                {job.status}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No recent jobs found</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Contact Info */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <User className="h-4 w-4" /> Contact Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Phone</p>
                                    <p className="font-medium">{driver.profiles?.phone || 'Not provided'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Email</p>
                                    <p className="font-medium">{driver.profiles?.email || 'Not provided'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">License Expiry</p>
                                    <p className="font-medium">
                                        {driver.license_expiry
                                            ? new Date(driver.license_expiry).toLocaleDateString()
                                            : 'Not set'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Member Since</p>
                                    <p className="font-medium">
                                        {driver.created_at
                                            ? new Date(driver.created_at).toLocaleDateString()
                                            : 'Unknown'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    )
}
