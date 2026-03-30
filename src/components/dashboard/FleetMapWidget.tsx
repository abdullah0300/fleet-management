'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
    APIProvider,
    Map,
    AdvancedMarker,
} from '@vis.gl/react-google-maps'
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { useVehicles } from '@/hooks/useVehicles'
import { Truck, Maximize2, RefreshCw } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { cn } from '@/lib/utils'
import { truckingMapStyle } from '@/lib/map-styles'

export function FleetMapWidget() {
    // NEXT_PUBLIC_* vars are inlined at build time — read directly, no useEffect needed
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    const { data: vehiclesData, refetch } = useVehicles()
    const vehicles = vehiclesData?.data || []
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)

    const activeVehicles = vehicles.filter(v => v.current_location && (v.status === 'in_use' || v.status === 'available'))

    const fitBounds = useCallback(() => {
        if (!mapInstance || activeVehicles.length === 0) return

        const bounds = new google.maps.LatLngBounds()
        activeVehicles.forEach(v => {
            const loc = v.current_location as any
            if (loc?.lat && loc?.lng) {
                bounds.extend({ lat: loc.lat, lng: loc.lng })
            }
        })

        if (!bounds.isEmpty()) {
            mapInstance.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
        }
    }, [mapInstance, activeVehicles])

    // Auto-fit on load
    useEffect(() => {
        if (mapInstance && activeVehicles.length > 0) {
            const timer = setTimeout(fitBounds, 1000)
            return () => clearTimeout(timer)
        }
    }, [mapInstance, activeVehicles.length, fitBounds])

    const initialViewState = useMemo(() => {
        return {
            lng: -95.7129, // Center of US
            lat: 37.0902
        }
    }, [])

    if (!apiKey) return <div className="h-[450px] bg-muted animate-pulse rounded-xl" />

    return (
        <Card className="col-span-1 lg:col-span-2 h-[450px] flex flex-col relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 bg-white/90 z-10 absolute top-0 left-0 right-0 p-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                    <span className="text-red-500 animate-pulse">((●))</span> Live Fleet Tracking
                </CardTitle>
                <div className="flex gap-2">
                    <Button variant="secondary" size="icon" onClick={() => refetch()} className="h-8 w-8 bg-white shadow-sm">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={fitBounds} className="h-8 w-8 bg-white shadow-sm">
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <div className="flex-1 w-full h-full">
                <APIProvider apiKey={apiKey}>
                    <Map
                        defaultCenter={initialViewState}
                        defaultZoom={3}
                        mapId="fleet_map_widget"
                        className="w-full h-full"
                        gestureHandling={'greedy'}
                        disableDefaultUI={false}
                        styles={truckingMapStyle}
                        onIdle={(map) => {
                            if (!mapInstance) setMapInstance(map.map)
                        }}
                    >
                        {activeVehicles.map(vehicle => {
                            const loc = vehicle.current_location as any
                            if (!loc?.lat || !loc?.lng) return null

                            return (
                                <AdvancedMarker
                                    key={vehicle.id}
                                    position={{ lat: loc.lat, lng: loc.lng }}
                                >
                                    <div className="group relative flex flex-col items-center">
                                        <div className={cn(
                                            "p-2 rounded-full shadow-lg transition-transform hover:scale-110",
                                            vehicle.status === 'in_use' ? "bg-green-600 text-white" : "bg-blue-600 text-white"
                                        )}>
                                            <Truck className="h-4 w-4 fill-current" />
                                        </div>

                                        {/* Persistent Label */}
                                        <div className="absolute top-full mt-1 flex flex-col items-center bg-white/90 px-2 py-1 rounded shadow-sm border text-[10px] whitespace-nowrap z-40 backdrop-blur-sm">
                                            <div className="font-bold text-gray-900 leading-tight">{vehicle.license_plate}</div>
                                            {vehicle.profiles?.full_name && (
                                                <div className="text-gray-600 font-medium leading-tight max-w-[80px] truncate">{vehicle.profiles.full_name}</div>
                                            )}
                                        </div>
                                    </div>
                                </AdvancedMarker>
                            )
                        })}
                    </Map>
                </APIProvider>
            </div>
        </Card>
    )
}
