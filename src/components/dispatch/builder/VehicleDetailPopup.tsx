'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Truck, User, MapPin, Calendar, Fuel, Gauge, Wrench, Package, CheckCircle2, Clock, AlertCircle, Navigation, ArrowRight } from 'lucide-react'
import { useJobs } from '@/hooks/useJobs'
import { useDrivers } from '@/hooks/useDrivers'
import { useManifests } from '@/hooks/useManifests'

interface VehicleDetailPopupProps {
    vehicle: any
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelectForManifest?: () => void
}

export function VehicleDetailPopup({ vehicle, open, onOpenChange, onSelectForManifest }: VehicleDetailPopupProps) {
    // Fetch all jobs
    const { data: jobsData } = useJobs()
    const allJobs = jobsData?.data || []

    // Fetch drivers to get current driver details
    const { data: driversData } = useDrivers()
    const allDrivers = driversData?.data || []

    // Fetch manifests to get current active trip
    const { data: manifestsData } = useManifests()
    const allManifests = manifestsData || []

    // Find the current driver for this vehicle
    const currentDriver = vehicle?.current_driver_id
        ? allDrivers.find((d: any) => d.id === vehicle.current_driver_id)
        : allDrivers.find((d: any) => d.assigned_vehicle_id === vehicle?.id)

    // Find current active manifest for this vehicle
    const currentManifest = allManifests.find(
        (m: any) => m.vehicle_id === vehicle?.id && ['scheduled', 'in_progress'].includes(m.status)
    )

    // Get current job from the manifest
    const currentJob = currentManifest?.manifest_jobs?.[0]?.job || null

    // Filter jobs for this vehicle (last 5)
    const vehicleJobs = allJobs
        .filter(job => job.vehicle_id === vehicle?.id)
        .slice(0, 5)

    if (!vehicle) return null

    const statusColorMap: Record<string, string> = {
        available: 'bg-green-100 text-green-700 border-green-200',
        in_use: 'bg-blue-100 text-blue-700 border-blue-200',
        maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
        out_of_service: 'bg-red-100 text-red-700 border-red-200'
    }

    const statusColor = statusColorMap[vehicle.status || 'available'] || 'bg-slate-100 text-slate-700'

    const isInUse = vehicle.status === 'in_use' || !!currentManifest

    // Calculate estimated time when vehicle becomes free
    const getEstimatedFreeTime = () => {
        if (!currentManifest) return null

        const manifestJobs = currentManifest.manifest_jobs || []
        if (manifestJobs.length === 0) return null

        const lastJob = manifestJobs[manifestJobs.length - 1]?.job
        if (!lastJob) return null

        if (lastJob.scheduled_time) {
            const [hours, minutes] = lastJob.scheduled_time.split(':')
            const eta = new Date()
            eta.setHours(parseInt(hours), parseInt(minutes) + 30)
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
                            <div className="h-14 w-14 rounded-full bg-orange-100 flex items-center justify-center">
                                <Truck className="h-7 w-7 text-orange-600" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl">
                                    {vehicle.registration_number}
                                </DialogTitle>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge className={statusColor}>
                                        {vehicle.status || 'available'}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                        {vehicle.make} {vehicle.model} {vehicle.year && `(${vehicle.year})`}
                                    </span>
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
                    {/* Current Status */}
                    <Card className={isInUse ? "border-blue-200 bg-blue-50/50" : "border-green-200 bg-green-50/50"}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                {isInUse ? (
                                    <><Clock className="h-4 w-4 text-blue-600" /> Currently In Use</>
                                ) : (
                                    <><CheckCircle2 className="h-4 w-4 text-green-600" /> Available for Dispatch</>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isInUse && currentManifest ? (
                                <div className="space-y-3">
                                    {/* Manifest Info */}
                                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border">
                                        <div>
                                            <p className="font-medium text-sm">
                                                Manifest #{currentManifest.manifest_number || currentManifest.id?.slice(0, 8)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {currentManifest.manifest_jobs?.length || 0} job(s) • {currentManifest.status}
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
                            ) : isInUse ? (
                                <p className="text-sm text-muted-foreground">
                                    Vehicle is in use but no active manifest found.
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Vehicle is ready to be assigned to a new manifest.
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

                    {/* Current Driver - Now shows actual driver info */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <User className="h-4 w-4" /> Current Driver
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {currentDriver ? (
                                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <User className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">
                                            {currentDriver.profiles?.full_name || 'Unknown Driver'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {currentDriver.profiles?.phone || 'No phone'} • {currentDriver.status || 'available'}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        {currentDriver.status || 'available'}
                                    </Badge>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <AlertCircle className="h-4 w-4" />
                                    No driver currently assigned
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Vehicle Specs */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Gauge className="h-4 w-4" /> Vehicle Specifications
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div className="p-3 bg-slate-50 rounded-lg text-center">
                                    <Fuel className="h-5 w-5 mx-auto mb-1 text-slate-500" />
                                    <p className="text-muted-foreground text-xs">Fuel Type</p>
                                    <p className="font-medium">{vehicle.fuel_type || 'Diesel'}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg text-center">
                                    <Package className="h-5 w-5 mx-auto mb-1 text-slate-500" />
                                    <p className="text-muted-foreground text-xs">Capacity</p>
                                    <p className="font-medium">{vehicle.capacity || 'N/A'}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg text-center">
                                    <Calendar className="h-5 w-5 mx-auto mb-1 text-slate-500" />
                                    <p className="text-muted-foreground text-xs">Year</p>
                                    <p className="font-medium">{vehicle.year || 'N/A'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Maintenance Status */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Wrench className="h-4 w-4" /> Maintenance Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Last Service</p>
                                    <p className="font-medium">
                                        {vehicle.last_service_date
                                            ? new Date(vehicle.last_service_date).toLocaleDateString()
                                            : 'Not recorded'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Next Service Due</p>
                                    <p className="font-medium">
                                        {vehicle.next_service_date
                                            ? new Date(vehicle.next_service_date).toLocaleDateString()
                                            : 'Not scheduled'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Odometer</p>
                                    <p className="font-medium">
                                        {vehicle.odometer
                                            ? `${vehicle.odometer.toLocaleString()} km`
                                            : 'Not recorded'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Insurance Expiry</p>
                                    <p className="font-medium">
                                        {vehicle.insurance_expiry
                                            ? new Date(vehicle.insurance_expiry).toLocaleDateString()
                                            : 'Not set'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Jobs */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Package className="h-4 w-4" /> Recent Trips
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {vehicleJobs.length > 0 ? (
                                <div className="space-y-2">
                                    {vehicleJobs.map(job => (
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
                                <p className="text-sm text-muted-foreground">No recent trips found</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    )
}
