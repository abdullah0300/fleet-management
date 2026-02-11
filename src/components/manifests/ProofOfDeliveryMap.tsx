'use client'

import React, { useRef, useState, useEffect } from 'react'
import Map, { Marker, NavigationControl, FullscreenControl, Source, Layer, MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPin, Flag, CheckCircle2, AlertTriangle, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PodMapProps {
    plannedLocation: { lat: number, lng: number, address?: string }
    actualLocation?: { lat: number, lng: number, timestamp?: string }
    completionType: 'pickup' | 'dropoff' | 'waypoint'
    flagged?: boolean
}

export function ProofOfDeliveryMap({ plannedLocation, actualLocation, completionType, flagged }: PodMapProps) {
    const mapRef = useRef<MapRef>(null)
    const [mapboxToken, setMapboxToken] = useState<string>('')
    const [viewState, setViewState] = useState({
        longitude: plannedLocation.lng,
        latitude: plannedLocation.lat,
        zoom: 14
    })

    useEffect(() => {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
        setMapboxToken(token)
    }, [])

    // Fit bounds to show both points if actual exists
    useEffect(() => {
        if (!mapRef.current || !actualLocation) return

        const minLng = Math.min(plannedLocation.lng, actualLocation.lng)
        const maxLng = Math.max(plannedLocation.lng, actualLocation.lng)
        const minLat = Math.min(plannedLocation.lat, actualLocation.lat)
        const maxLat = Math.max(plannedLocation.lat, actualLocation.lat)

        // Add padding
        const lngPadding = (maxLng - minLng) * 0.3 || 0.005
        const latPadding = (maxLat - minLat) * 0.3 || 0.005

        mapRef.current.fitBounds(
            [
                [minLng - lngPadding, minLat - latPadding],
                [maxLng + lngPadding, maxLat + latPadding]
            ],
            { padding: 40, duration: 1000 }
        )
    }, [plannedLocation, actualLocation])

    if (!mapboxToken) return <div className="h-48 w-full bg-muted animate-pulse rounded-md" />

    // GeoJSON for the line connecting planned vs actual
    const connectionLine = actualLocation ? {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [
                [plannedLocation.lng, plannedLocation.lat],
                [actualLocation.lng, actualLocation.lat]
            ]
        }
    } : null

    return (
        <div className="relative w-full h-full min-h-[300px] rounded-lg overflow-hidden border">
            <Map
                ref={mapRef}
                mapboxAccessToken={mapboxToken}
                initialViewState={viewState}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v11"
            >
                <NavigationControl position="top-right" />

                {/* Connection Line */}
                {connectionLine && (
                    <Source id="pod-connection" type="geojson" data={connectionLine as any}>
                        <Layer
                            id="pod-line"
                            type="line"
                            paint={{
                                'line-color': flagged ? '#ef4444' : '#94a3b8',
                                'line-width': 2,
                                'line-dasharray': [2, 1]
                            }}
                        />
                    </Source>
                )}

                {/* Planned Location Marker */}
                <Marker longitude={plannedLocation.lng} latitude={plannedLocation.lat} anchor="bottom">
                    <div className="flex flex-col items-center group">
                        <div className="bg-white p-1.5 rounded-full shadow-md border-2 border-blue-500 text-blue-600">
                            <MapPin className="h-4 w-4" />
                        </div>
                        <div className="bg-white/90 text-[10px] px-1.5 py-0.5 rounded shadow mt-1 font-medium whitespace-nowrap">
                            Planned
                        </div>
                    </div>
                </Marker>

                {/* Actual Location Marker */}
                {actualLocation && (
                    <Marker longitude={actualLocation.lng} latitude={actualLocation.lat} anchor="bottom">
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
                    </Marker>
                )}
            </Map>

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
