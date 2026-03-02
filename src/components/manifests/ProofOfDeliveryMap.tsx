'use client'

import React, { useState, useEffect } from 'react'
import {
    APIProvider,
    Map,
    AdvancedMarker,
    useMap
} from '@vis.gl/react-google-maps'
import { MapPin, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { truckingMapStyle } from '@/lib/map-styles'

interface PodMapProps {
    plannedLocation: { lat: number, lng: number, address?: string }
    actualLocation?: { lat: number, lng: number, timestamp?: string }
    completionType: 'pickup' | 'dropoff' | 'waypoint'
    flagged?: boolean
}

function PodLine({ planned, actual, flagged }: { planned: { lat: number, lng: number }, actual: { lat: number, lng: number }, flagged?: boolean }) {
    const map = useMap();
    const [polyline, setPolyline] = useState<google.maps.Polyline>();

    useEffect(() => {
        if (!map) return;

        // Load the core maps library to access formatting (google.maps.SymbolPath)
        const line = new google.maps.Polyline({
            path: [planned, actual],
            geodesic: true,
            strokeOpacity: 0, // Hide the solid line
            icons: [{
                icon: {
                    path: 'M 0,-1 0,1', // Simple dash
                    strokeOpacity: 1,
                    strokeColor: flagged ? '#ef4444' : '#94a3b8',
                    strokeWeight: 2,
                    scale: 3
                },
                offset: '0',
                repeat: '15px'
            }],
        });
        setPolyline(line);
        return () => line.setMap(null);
    }, [map, flagged, planned, actual]);

    useEffect(() => {
        if (polyline && map) {
            polyline.setMap(map);
        }
    }, [polyline, map]);

    return null;
}

export function ProofOfDeliveryMap({ plannedLocation, actualLocation, completionType, flagged }: PodMapProps) {
    const [apiKey, setApiKey] = useState<string>('')
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)

    useEffect(() => {
        setApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')
    }, [])

    useEffect(() => {
        if (!mapInstance || !actualLocation) return

        const bounds = new google.maps.LatLngBounds()
        bounds.extend({ lat: plannedLocation.lat, lng: plannedLocation.lng })
        bounds.extend({ lat: actualLocation.lat, lng: actualLocation.lng })

        mapInstance.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
    }, [mapInstance, plannedLocation, actualLocation])

    if (!apiKey) return <div className="h-48 w-full bg-muted animate-pulse rounded-md" />

    const viewState = {
        lat: plannedLocation.lat,
        lng: plannedLocation.lng
    }

    return (
        <div className="relative w-full h-full min-h-[300px] rounded-lg overflow-hidden border">
            <APIProvider apiKey={apiKey}>
                <Map
                    defaultCenter={viewState}
                    defaultZoom={14}
                    mapId="pod_map"
                    className="w-full h-full"
                    gestureHandling={'greedy'}
                    disableDefaultUI={false}
                    styles={truckingMapStyle}
                    onIdle={(map) => {
                        if (!mapInstance) setMapInstance(map.map)
                    }}
                >
                    {actualLocation && (
                        <PodLine planned={plannedLocation} actual={actualLocation} flagged={flagged} />
                    )}

                    <AdvancedMarker position={{ lat: plannedLocation.lat, lng: plannedLocation.lng }}>
                        <div className="flex flex-col items-center group">
                            <div className="bg-white p-1.5 rounded-full shadow-md border-2 border-blue-500 text-blue-600">
                                <MapPin className="h-4 w-4" />
                            </div>
                            <div className="bg-white/90 text-[10px] px-1.5 py-0.5 rounded shadow mt-1 font-medium whitespace-nowrap">
                                Planned
                            </div>
                        </div>
                    </AdvancedMarker>

                    {actualLocation && (
                        <AdvancedMarker position={{ lat: actualLocation.lat, lng: actualLocation.lng }}>
                            <div className="flex flex-col items-center">
                                <div className={cn(
                                    "p-1.5 rounded-full shadow-md border-2 text-white",
                                    flagged ? "bg-red-500 border-red-600" : "bg-green-500 border-green-600"
                                )}>
                                    {flagged ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                </div>
                                <div className={cn(
                                    "text-[10px] px-1.5 py-0.5 rounded shadow mt-1 font-medium whitespace-nowrap text-white",
                                    flagged ? "bg-red-500" : "bg-green-500"
                                )}>
                                    Actual Location
                                </div>
                            </div>
                        </AdvancedMarker>
                    )}
                </Map>
            </APIProvider>

            {/* Legend / Info Overlay */}
            <div className="absolute top-2 left-2 bg-white/95 p-2 rounded shadow-md text-xs space-y-1 max-w-[200px]">
                <div className="font-semibold border-b pb-1 mb-1">Proof of Delivery</div>
                {flagged ? (
                    <div className="flex items-start gap-1 text-red-600">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>Location Mismatch Detected</span>
                    </div>
                ) : (
                    <div className="flex items-start gap-1 text-green-600">
                        <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>Location Verified</span>
                    </div>
                )}
                {actualLocation && actualLocation.timestamp && (
                    <div className="text-muted-foreground pt-1">
                        Time: {new Date(actualLocation.timestamp).toLocaleTimeString()}
                    </div>
                )}
            </div>
        </div>
    )
}
