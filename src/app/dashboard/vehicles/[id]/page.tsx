'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, Truck, Gauge, Fuel, Calendar, MapPin, User, Stethoscope } from 'lucide-react'
import { useVehicle, useUpdateVehicle, useDeleteVehicle, VehicleWithDriver } from '@/hooks/useVehicles'
import { useVehicleMaintenanceStatus } from '@/hooks/useSmartMaintenance'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { VehicleForm } from '@/components/vehicles/VehicleForm'
import { VehicleHealthVisualizer } from '@/components/maintenance/VehicleHealthVisualizer'
import { VehicleUpdate } from '@/types/database'
import { Skeleton } from '@/components/ui/skeleton'
import { useState } from 'react'

export default function VehicleDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    // Use the single vehicle hook - fetches only this vehicle, uses cache if available
    const { data: vehicle, isLoading, error } = useVehicle(id)
    // New: Fetch maintenance status
    const { data: maintenanceStatus, isLoading: isMaintenanceLoading } = useVehicleMaintenanceStatus(id)

    const updateMutation = useUpdateVehicle()
    const deleteMutation = useDeleteVehicle()
    const [isEditing, setIsEditing] = useState(false)

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this vehicle?')) return
        await deleteMutation.mutateAsync(id)
        router.push('/dashboard/vehicles')
    }

    const handleUpdate = async (data: VehicleUpdate) => {
        await updateMutation.mutateAsync({ id, updates: data })
        setIsEditing(false)
    }

    const getStatusBadge = (status: string | null) => {
        switch (status) {
            case 'available': return 'badge-success'
            case 'in_use': return 'badge-info'
            case 'maintenance': return 'badge-error'
            case 'inactive': return 'badge-neutral'
            default: return 'badge-neutral'
        }
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-[200px]" />
                        <Skeleton className="h-4 w-[150px]" />
                    </div>
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-[100px] rounded-xl" />
                    ))}
                </div>
                <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                    <Skeleton className="h-[200px] rounded-xl" />
                    <Skeleton className="h-[200px] rounded-xl" />
                </div>
            </div>
        )
    }

    if (error || !vehicle) {
        return <div className="p-8 text-center">Vehicle not found</div>
    }

    // Parse location JSONB
    const location = vehicle.current_location as { lat?: number; lng?: number; address?: string } | null
    const locationText = location?.address || 'Location not set'

    return (
        <div className="flex flex-col gap-4 sm:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 sm:gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{vehicle.make} {vehicle.model}</h1>
                            <Badge className={`capitalize border ${getStatusBadge(vehicle.status)}`}>
                                {vehicle.status?.replace('_', ' ') || 'Unknown'}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1 text-sm flex-wrap">
                            <span className="font-mono bg-muted px-1.5 rounded">{vehicle.license_plate}</span>
                            <span>•</span>
                            <span>{vehicle.year || 'Year unknown'}</span>
                            {vehicle.vehicle_type && (
                                <>
                                    <span className="hidden sm:inline">•</span>
                                    <span className="hidden sm:inline capitalize">{vehicle.vehicle_type}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 ml-10 sm:ml-0">
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                        <Button variant="outline" className="gap-2" onClick={() => setIsEditing(true)}>
                            <Edit className="h-4 w-4" />
                            <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Edit Vehicle</DialogTitle>
                            </DialogHeader>
                            <VehicleForm initialData={vehicle} onSubmit={handleUpdate} isSubmitting={updateMutation.isPending} />
                        </DialogContent>
                    </Dialog>

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

            {/* Smart Maintenance Visualizer */}
            {maintenanceStatus && maintenanceStatus.length > 0 && (
                <div className="rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <VehicleHealthVisualizer
                        currentOdometer={vehicle.odometer_reading || 0}
                        programs={maintenanceStatus}
                    />
                </div>
            )}


            {/* Stats Grid */}
            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Odometer</CardTitle>
                        <Gauge className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-xl sm:text-2xl font-bold">
                            {(vehicle.odometer_reading || 0).toLocaleString()} km
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Fuel Type</CardTitle>
                        <Fuel className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-xl sm:text-2xl font-bold capitalize">{vehicle.fuel_type || 'Not set'}</div>
                        {vehicle.fuel_efficiency && (
                            <p className="text-xs text-muted-foreground">{vehicle.fuel_efficiency} km/L</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Location</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-sm sm:text-lg font-medium truncate">{locationText}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium">Assigned Driver</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
                        <div className="text-sm sm:text-lg font-medium">
                            {vehicle.profiles?.full_name || 'Unassigned'}
                        </div>
                        {vehicle.profiles?.phone && (
                            <p className="text-xs text-muted-foreground">{vehicle.profiles.phone}</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Details Section */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
                <Card className="h-full">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg">Vehicle Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                                <span className="text-muted-foreground text-xs">Make</span>
                                <div className="font-medium">{vehicle.make}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-muted-foreground text-xs">Model</span>
                                <div className="font-medium">{vehicle.model}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-muted-foreground text-xs">Year</span>
                                <div className="font-medium">{vehicle.year || 'N/A'}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-muted-foreground text-xs">Vehicle Type</span>
                                <div className="font-medium">{vehicle.vehicle_type || 'N/A'}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-muted-foreground text-xs">License Plate</span>
                                <div className="font-medium font-mono">{vehicle.license_plate}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-muted-foreground text-xs">Created</span>
                                <div className="font-medium">{new Date(vehicle.created_at).toLocaleDateString()}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-muted-foreground text-xs">VIN #</span>
                                <div className="font-medium font-mono">{vehicle.vin_number || 'N/A'}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-muted-foreground text-xs">RFID Tag</span>
                                <div className="font-medium">{vehicle.rfid_tag || 'N/A'}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="h-full">
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-base sm:text-lg">Maintenance History</CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center justify-center p-6 text-muted-foreground h-[200px]">
                        {maintenanceStatus && maintenanceStatus.length > 0 ? (
                            <div className="space-y-2 w-full">
                                {maintenanceStatus.map(status => (
                                    <div key={status.id} className="flex justify-between items-center text-sm p-2 border rounded hover:bg-muted/50">
                                        <div className='flex flex-col'>
                                            <span className='font-medium'>{status.service_programs?.name}</span>
                                            <span className='text-xs'>Last: {status.last_service_odometer} km</span>
                                        </div>
                                        <Badge variant={status.status === 'ok' ? 'outline' : 'destructive'} className="uppercase text-[10px]">
                                            {status.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center">
                                <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No Smart Maintenance Configured</p>
                                <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/dashboard/maintenance/setup')}>
                                    Configure Program
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
