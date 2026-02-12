'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Map, { Marker, NavigationControl, FullscreenControl, MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useVehicles } from '@/hooks/useVehicles'
import { Truck, Navigation, Maximize2, RefreshCw } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { cn } from '@/lib/utils'

export function FleetMapWidget() {
    const mapRef = useRef<MapRef>(null)
    const [mapboxToken, setMapboxToken] = useState<string>('')
    const { data: vehiclesData, refetch } = useVehicles()
    const vehicles = vehiclesData?.data || []

    const activeVehicles = vehicles.filter(v => v.current_location && (v.status === 'in_use' || v.status === 'available'))

    useEffect(() => {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
        setMapboxToken(token)
    }, [])

    const fitBounds = useCallback(() => {
        if (!mapRef.current || activeVehicles.length === 0) return

        const lngs = activeVehicles.map(v => (v.current_location as any).lng)
        const lats = activeVehicles.map(v => (v.current_location as any).lat)

        const minLng = Math.min(...lngs)
        const maxLng = Math.max(...lngs)
        const minLat = Math.min(...lats)
        const maxLat = Math.max(...lats)

        // Add padding
        const lngPadding = (maxLng - minLng) * 0.1 || 0.05
        const latPadding = (maxLat - minLat) * 0.1 || 0.05

        mapRef.current.fitBounds(
            [
                [minLng - lngPadding, minLat - latPadding],
                [maxLng + lngPadding, maxLat + latPadding]
            ],
            { padding: 40, duration: 1000 }
        )
    }, [activeVehicles])

    // Auto-fit on load
    useEffect(() => {
        if (mapboxToken && activeVehicles.length > 0) {
            const timer = setTimeout(fitBounds, 1000)
            return () => clearTimeout(timer)
        }
    }, [mapboxToken, activeVehicles.length, fitBounds])

    const initialViewState = useMemo(() => {
        return {
            longitude: -95.7129, // Center of US
            latitude: 37.0902,
            zoom: 3
        }
    }, [])

    if (!mapboxToken) return <div className="h-[450px] bg-muted animate-pulse rounded-xl" />

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
                <Map
                    ref={mapRef}
                    mapboxAccessToken={mapboxToken}
                    initialViewState={initialViewState}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/light-v11"
                    reuseMaps
                >
                    <NavigationControl position="bottom-right" />

                    {activeVehicles.map(vehicle => {
                        const loc = vehicle.current_location as any
                        if (!loc?.lat || !loc?.lng) return null

                        return (
                            <Marker
                                key={vehicle.id}
                                longitude={loc.lng}
                                latitude={loc.lat}
                                anchor="bottom"
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
                            </Marker>
                        )
                    })}
                </Map>
            </div>
        </Card>
    )
}
