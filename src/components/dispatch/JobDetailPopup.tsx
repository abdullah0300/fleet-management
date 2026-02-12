'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Clock, MapPin, User, Truck, Calendar, Package } from 'lucide-react'
import { ManifestRouteMap } from '@/components/manifests/ManifestRouteMap'
import { useMemo } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EntityDocuments } from '@/components/documents/EntityDocuments'

interface JobDetailPopupProps {
    job: any
    open: boolean
    onOpenChange: (open: boolean) => void
    onEdit?: (job: any) => void
}

export function JobDetailPopup({ job, open, onOpenChange, onEdit }: JobDetailPopupProps) {
    if (!job) return null

    // Calculate Waypoints for Map
    const waypoints = useMemo(() => {
        if (!job.job_stops || !Array.isArray(job.job_stops)) return []

        const points = job.job_stops
            .filter((stop: any) => stop.latitude && stop.longitude)
            .map((stop: any, index: number) => ({
                lat: stop.latitude,
                lng: stop.longitude,
                type: stop.type || 'waypoint',
                sequence: stop.sequence_order || index + 1,
                address: stop.address || 'Unknown Address',
                jobId: job.id,
                stopId: stop.id
            }))

        // Sort waypoints by sequence
        points.sort((a: any, b: any) => a.sequence - b.sequence)
        return points
    }, [job])

    // Mock driver/vehicle info (if available on job)
    // If getting from manifest/assignment, we might need extra props or assume job has these fields populated
    const driverName = job.manifest?.drivers?.profiles?.full_name || job.driver_name
    const vehicleNumber = job.manifest?.vehicles?.license_plate || job.vehicle_number

    const statusColors: any = {
        pending: 'bg-slate-100 text-slate-700',
        assigned: 'bg-blue-100 text-blue-700',
        in_progress: 'bg-amber-100 text-amber-700',
        completed: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-700'
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto flex flex-col p-6">
                <DialogHeader className="mb-4">
                    <div className="flex items-center justify-between mr-4">
                        <div className="flex items-center gap-3">
                            <DialogTitle className="text-xl">Job #{job.job_number}</DialogTitle>
                            <Badge variant="secondary" className={statusColors[job.status] || 'bg-gray-100'}>
                                {job.status}
                            </Badge>
                        </div>
                        {onEdit && (
                            <Button variant="outline" size="sm" onClick={() => onEdit(job)}>
                                Edit Job
                            </Button>
                        )}
                    </div>
                    <DialogDescription className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" /> {job.customer_name}
                        </span>
                        {job.scheduled_date && (
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(job.scheduled_date).toLocaleDateString()}
                            </span>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="details" className="flex-1 flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 mb-6 h-11 bg-muted/50 p-1">
                        <TabsTrigger value="details" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
                        <TabsTrigger value="documents" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Documents</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="flex-1 mt-0 outline-none">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[400px]">
                            {/* Left Column: Details & Stops */}
                            <div className="space-y-4 lg:col-span-1 overflow-y-auto pr-1">

                                {/* Assignment Details (if applicable) */}
                                {(driverName || vehicleNumber) && (
                                    <Card>
                                        <CardHeader className="py-3 px-4">
                                            <CardTitle className="text-sm">Assigned Resource</CardTitle>
                                        </CardHeader>
                                        <CardContent className="py-3 px-4 space-y-2">
                                            {driverName && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-medium">{driverName}</span>
                                                </div>
                                            )}
                                            {vehicleNumber && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Truck className="h-4 w-4 text-muted-foreground" />
                                                    <span>{vehicleNumber}</span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Job Details Card (New - Weight etc) */}
                                {(job.weight || job.notes) && (
                                    <Card>
                                        <CardHeader className="py-3 px-4">
                                            <CardTitle className="text-sm">Details</CardTitle>
                                        </CardHeader>
                                        <CardContent className="py-3 px-4 space-y-3">
                                            {job.weight && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Total Weight:</span>
                                                    <span className="font-medium">{job.weight} lbs</span>
                                                </div>
                                            )}
                                            {job.notes && (
                                                <div className="text-sm">
                                                    <span className="text-muted-foreground block mb-1">Notes:</span>
                                                    <p className="bg-slate-50 p-2 rounded text-slate-700">{job.notes}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Stops List */}
                                <Card className="border-0 shadow-none">
                                    <CardHeader className="py-0 px-0 mb-3">
                                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                                            <Package className="h-4 w-4" />
                                            Stops ({job.job_stops?.length || 0})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0 space-y-4 relative">
                                        <div className="absolute left-[0.9rem] top-2 bottom-2 w-0.5 bg-slate-200" />

                                        {(job.job_stops || []).map((stop: any, index: number) => (
                                            <div key={stop.id} className="relative z-10 flex gap-3">
                                                <div className="flex-none flex flex-col items-center">
                                                    <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold bg-white
                                                        ${stop.type === 'pickup' ? 'border-green-500 text-green-600' :
                                                            stop.type === 'dropoff' ? 'border-red-500 text-red-600' : 'border-blue-500 text-blue-600'}
                                                    `}>
                                                        {index + 1}
                                                    </div>
                                                </div>
                                                <div className="flex-1 pb-2">
                                                    <div className="text-xs font-semibold uppercase tracking-wider mb-0.5 text-muted-foreground">
                                                        {stop.type}
                                                    </div>
                                                    <p className="text-sm font-medium leading-tight">{stop.address}</p>

                                                    {/* Time Info */}
                                                    <div className="mt-1.5 flex flex-wrap gap-2">
                                                        {(stop.arrival_mode === 'window' && stop.window_start && stop.window_end) ? (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                {new Date(stop.window_start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - {new Date(stop.window_end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                            </span>
                                                        ) : (stop.arrival_mode === 'fixed' && stop.scheduled_arrival) ? (
                                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-200">
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                {new Date(stop.scheduled_arrival).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    {stop.notes && (
                                                        <p className="text-xs text-muted-foreground mt-1 bg-muted/50 p-1.5 rounded">
                                                            <span className="font-semibold">Note:</span> {stop.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right Column: Map */}
                            <div className="lg:col-span-2 h-[400px] lg:h-auto min-h-[400px] rounded-xl overflow-hidden border shadow-sm">
                                <ManifestRouteMap
                                    waypoints={waypoints}
                                    driverName={driverName}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="documents" className="flex-1 mt-0 h-[500px] outline-none">
                        <EntityDocuments entityId={job.id} entityType="job" />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    )
}

