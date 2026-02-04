'use client'

import { useRouter } from 'next/navigation'
import { Truck, MapPin, User, Gauge, Wrench } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { VehicleWithDriver } from '@/hooks/useVehicles'

interface VehicleCardProps {
    vehicle: VehicleWithDriver
    onEdit?: (vehicle: VehicleWithDriver) => void
}

export function VehicleCard({ vehicle, onEdit }: VehicleCardProps) {
    const router = useRouter()

    // Design system semantic status styles
    const getStatusStyles = (status: string | null) => {
        switch (status) {
            case 'available': return { label: 'Available', className: 'badge-success' }
            case 'in_use': return { label: 'En Route', className: 'badge-info' }
            case 'maintenance': return { label: 'Maintenance', className: 'badge-error' }
            case 'inactive': return { label: 'Inactive', className: 'badge-neutral' }
            default: return { label: 'Unknown', className: 'badge-neutral' }
        }
    }

    const statusStyle = getStatusStyles(vehicle.status)
    const registration = vehicle.registration_number
    const odometer = vehicle.odometer_reading || 0

    // Parse current_location JSONB (format: {lat, lng, address})
    const location = vehicle.current_location as { lat?: number; lng?: number; address?: string } | null
    const locationText = location?.address || 'Location not set'

    // Get driver name from joined profile
    const driverName = vehicle.profiles?.full_name || 'Unassigned'

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-all border-none shadow-sm flex flex-col h-full bg-card group rounded-xl">
            <div className="p-4 sm:p-5 flex-1 space-y-3 sm:space-y-4">
                {/* Header: Image & Title */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 sm:gap-4">
                        {/* Placeholder for Vehicle Image - Using Icon for now */}
                        <div className="h-10 w-16 sm:h-12 sm:w-20 bg-muted rounded-lg flex items-center justify-center group-hover:bg-accent transition-colors">
                            <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                        </div>
                        <div>
                            <div className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded mb-1 w-fit border ${statusStyle.className}`}>
                                {statusStyle.label}
                            </div>
                            <h3 className="font-bold text-foreground leading-tight text-sm sm:text-base">
                                {vehicle.make} {vehicle.model}
                            </h3>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">{registration}</p>
                        </div>
                    </div>
                </div>

                {/* Info Rows */}
                <div className="space-y-2 sm:space-y-3 pt-1 sm:pt-2">
                    {/* Location */}
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 flex justify-center">
                            <MapPin className="h-4 w-4 text-status-error" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground uppercase">Current Location</p>
                            <p className="font-medium text-foreground text-xs truncate">
                                {locationText}
                            </p>
                        </div>
                    </div>

                    {/* Assigned Driver */}
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 flex justify-center">
                            <User className="h-4 w-4 text-status-info" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-muted-foreground uppercase">Assigned Driver</p>
                            <p className="font-medium text-foreground text-xs truncate">
                                {driverName}
                            </p>
                        </div>
                    </div>

                    {/* Mileage */}
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 flex justify-center">
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Odometer</p>
                            <p className="font-medium text-foreground text-xs">
                                {odometer.toLocaleString()} mi
                            </p>
                        </div>
                    </div>

                    {/* Fuel Info */}
                    <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 flex justify-center">
                            <Wrench className="h-4 w-4 text-accent-purple" />
                        </div>
                        <div>
                            <p className="text-[10px] text-muted-foreground uppercase">Fuel Type</p>
                            <p className="font-medium text-foreground text-xs capitalize">
                                {vehicle.fuel_type || 'Not specified'}
                                {vehicle.fuel_efficiency ? ` • ${vehicle.fuel_efficiency} MPG` : ''}
                            </p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Action Footer */}
            <div className="p-2 sm:p-3 bg-muted/50 border-t flex gap-2">
                <Button
                    variant="ghost"
                    className="flex-1 text-xs h-8 hover:bg-card hover:shadow-sm border border-transparent hover:border-border"
                    onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/dashboard/vehicles/${vehicle.id}`)
                    }}
                >
                    View Details
                </Button>
                <Button
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-8"
                    onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/dashboard/jobs/new?vehicle_id=${vehicle.id}`)
                    }}
                >
                    Assign Job
                </Button>
            </div>
        </Card>
    )
}
