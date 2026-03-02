'use client'

import { useState, useEffect } from 'react'
import {
    APIProvider,
    Map,
    AdvancedMarker,
    InfoWindow
} from '@vis.gl/react-google-maps'
import { Truck, MapPin } from 'lucide-react'
import { VehicleWithDriver } from '@/hooks/useVehicles'
import { cn } from '@/lib/utils'
import { useVehicleLocation } from '@/hooks/useVehicleLocation'
import { truckingMapStyle } from '@/lib/map-styles'
interface FleetMapProps {
    vehicles: VehicleWithDriver[]
    selectedVehicle: string | null
    onSelectVehicle: (id: string | null) => void
}

const DEFAULT_CENTER = {
    lng: -74.006,  // NYC
    lat: 40.7128,
}

export function FleetMap({ vehicles, selectedVehicle, onSelectVehicle }: FleetMapProps) {
    const [popupInfo, setPopupInfo] = useState<VehicleWithDriver | null>(null)
    const [googleMapsKey, setGoogleMapsKey] = useState<string>('')

    const { locations: liveLocations } = useVehicleLocation()

    useEffect(() => {
        const token = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
        setGoogleMapsKey(token)
    }, [])

    const getVehicleLocation = (vehicle: VehicleWithDriver) => {
        const liveLoc = liveLocations[vehicle.id]
        if (liveLoc && liveLoc.lat && liveLoc.lng) {
            return { lat: liveLoc.lat, lng: liveLoc.lng }
        }

        const location = vehicle.current_location as { lat?: number; lng?: number } | null
        if (location?.lat && location?.lng) {
            return { lat: location.lat, lng: location.lng }
        }

        return null
    }

    const getMarkerColor = (status: string | null) => {
        switch (status) {
            case 'in_use': return 'bg-status-success'
            case 'available': return 'bg-status-info'
            case 'maintenance': return 'bg-status-error'
            default: return 'bg-muted-foreground'
        }
    }

    if (!googleMapsKey) {
        return (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl">
                <div className="text-center p-6">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <MapPin className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-muted-foreground">Google Maps Key Required</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Add <code className="bg-muted px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your .env.local file
                    </p>
                </div>
            </div>
        )
    }

    return (
        <APIProvider apiKey={googleMapsKey}>
            <Map
                defaultCenter={DEFAULT_CENTER}
                defaultZoom={10}
                mapId="fleet_map"
                className="w-full h-full"
                gestureHandling={'greedy'}
                disableDefaultUI={false}
                styles={truckingMapStyle}
            >
                {vehicles.map((vehicle) => {
                    const location = getVehicleLocation(vehicle)
                    const isSelected = selectedVehicle === vehicle.id

                    if (!location) return null

                    return (
                        <AdvancedMarker
                            key={vehicle.id}
                            position={location}
                            onClick={() => {
                                onSelectVehicle(vehicle.id)
                                setPopupInfo(vehicle)
                            }}
                        >
                            <div
                                className={cn(
                                    "cursor-pointer transition-all",
                                    isSelected && "scale-125"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center shadow-lg",
                                    getMarkerColor(vehicle.status),
                                    vehicle.status === 'in_use' && "animate-pulse"
                                )}>
                                    <Truck className="h-5 w-5 text-white" />
                                </div>
                                <div className="mt-1 px-2 py-0.5 bg-background/90 rounded text-xs font-medium text-center shadow">
                                    {vehicle.license_plate}
                                </div>
                            </div>
                        </AdvancedMarker>
                    )
                })}

                {popupInfo && getVehicleLocation(popupInfo) && (
                    <InfoWindow
                        position={getVehicleLocation(popupInfo)!}
                        onCloseClick={() => setPopupInfo(null)}
                    >
                        <div className="p-2 min-w-[200px] text-zinc-900">
                            <h3 className="font-bold">
                                {popupInfo.make} {popupInfo.model}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                {popupInfo.license_plate}
                            </p>
                            {popupInfo.profiles && (
                                <p className="text-sm mt-1">
                                    Driver: {popupInfo.profiles.full_name}
                                </p>
                            )}
                            <div className="mt-2 flex items-center gap-2">
                                <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    getMarkerColor(popupInfo.status)
                                )} />
                                <span className="text-xs capitalize">{popupInfo.status?.replace('_', ' ')}</span>
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </Map>
        </APIProvider>
    )
}
