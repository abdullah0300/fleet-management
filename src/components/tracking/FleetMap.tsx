'use client'

import { useCallback, useState, useEffect } from 'react'
import Map, { Marker, Popup, NavigationControl, FullscreenControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Truck, MapPin } from 'lucide-react'
import { VehicleWithDriver } from '@/hooks/useVehicles'
import { cn } from '@/lib/utils'
import { useVehicleLocation } from '@/hooks/useVehicleLocation'

interface FleetMapProps {
    vehicles: VehicleWithDriver[]
    selectedVehicle: string | null
    onSelectVehicle: (id: string | null) => void
}

// Default center - can be configured via env
const DEFAULT_CENTER = {
    longitude: -74.006,  // NYC
    latitude: 40.7128,
    zoom: 10
}

export function FleetMap({ vehicles, selectedVehicle, onSelectVehicle }: FleetMapProps) {
    const [popupInfo, setPopupInfo] = useState<VehicleWithDriver | null>(null)
    const [mapboxToken, setMapboxToken] = useState<string>('')

    // Subscribe to ALL vehicle updates
    const { locations: liveLocations } = useVehicleLocation()

    useEffect(() => {
        // Get Mapbox token from environment
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
        setMapboxToken(token)
    }, [])

    // Extract vehicle locations from current_location JSONB
    const getVehicleLocation = (vehicle: VehicleWithDriver) => {
        // Check for live update first
        const liveLoc = liveLocations[vehicle.id]
        if (liveLoc && liveLoc.lat && liveLoc.lng) {
            return { latitude: liveLoc.lat, longitude: liveLoc.lng }
        }

        // Fallback to initial DB data
        const location = vehicle.current_location as { lat?: number; lng?: number } | null
        if (location?.lat && location?.lng) {
            return { latitude: location.lat, longitude: location.lng }
        }

        // Return null if no location data
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

    // If no token, show configuration prompt
    if (!mapboxToken) {
        return (
            <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl">
                <div className="text-center p-6">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <MapPin className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-muted-foreground">Mapbox Token Required</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                        Add <code className="bg-muted px-1 rounded">NEXT_PUBLIC_MAPBOX_TOKEN</code> to your .env.local file
                    </p>
                    <a
                        href="https://account.mapbox.com/access-tokens/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-4 text-sm text-primary hover:underline"
                    >
                        Get a free token from Mapbox →
                    </a>
                </div>
            </div>
        )
    }

    return (
        <Map
            mapboxAccessToken={mapboxToken}
            initialViewState={DEFAULT_CENTER}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            reuseMaps
        >
            <NavigationControl position="top-right" />
            <FullscreenControl position="top-right" />

            {vehicles.map((vehicle) => {
                const location = getVehicleLocation(vehicle)
                const isSelected = selectedVehicle === vehicle.id

                if (!location) return null

                return (
                    <Marker
                        key={vehicle.id}
                        longitude={location.longitude}
                        latitude={location.latitude}
                        anchor="bottom"
                        onClick={(e) => {
                            e.originalEvent.stopPropagation()
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
                    </Marker>
                )
            })}

            {popupInfo && getVehicleLocation(popupInfo) && (
                <Popup
                    anchor="top"
                    longitude={getVehicleLocation(popupInfo)!.longitude}
                    latitude={getVehicleLocation(popupInfo)!.latitude}
                    onClose={() => setPopupInfo(null)}
                    closeButton={true}
                    closeOnClick={false}
                >
                    <div className="p-2 min-w-[200px]">
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
                </Popup>
            )}
        </Map>
    )
}
