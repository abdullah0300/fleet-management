'use client'

import { useState, useEffect, useMemo } from 'react'
import Map, { Marker, NavigationControl, FullscreenControl, Source, Layer } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Truck, MapPin, Flag, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import mapboxgl from 'mapbox-gl'

interface JobRouteMapProps {
    pickup?: { lat: number; lng: number; address: string }
    delivery?: { lat: number; lng: number; address: string }
    vehicleLocation?: { lat: number; lng: number }
}

export function JobRouteMap({ pickup, delivery, vehicleLocation }: JobRouteMapProps) {
    const [mapboxToken, setMapboxToken] = useState<string>('')
    const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null)
    const [showTraffic, setShowTraffic] = useState(false)

    useEffect(() => {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
        setMapboxToken(token)
    }, [])

    useEffect(() => {
        if (!pickup || !delivery || !mapboxToken) return

        const fetchRoute = async () => {
            try {
                const query = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${delivery.lng},${delivery.lat}?steps=true&geometries=geojson&access_token=${mapboxToken}`
                )
                const json = await query.json()
                if (json.routes && json.routes.length > 0) {
                    const geometry = json.routes[0].geometry
                    const geojson = {
                        type: 'Feature',
                        properties: {},
                        geometry: geometry
                    }
                    setRouteGeoJSON(geojson)
                }
            } catch (error) {
                console.error('Error fetching route:', error)
            }
        }

        fetchRoute()
    }, [pickup, delivery, mapboxToken])

    const bounds = useMemo(() => {
        if (!pickup && !delivery && !vehicleLocation) return null

        const points = []
        if (pickup) points.push([pickup.lng, pickup.lat])
        if (delivery) points.push([delivery.lng, delivery.lat])
        if (vehicleLocation) points.push([vehicleLocation.lng, vehicleLocation.lat])

        if (points.length === 0) return null

        // Calculate bounds
        const lngs = points.map(p => p[0])
        const lats = points.map(p => p[1])

        return {
            minLng: Math.min(...lngs),
            maxLng: Math.max(...lngs),
            minLat: Math.min(...lats),
            maxLat: Math.max(...lats)
        }
    }, [pickup, delivery, vehicleLocation])

    const initialViewState = useMemo(() => {
        if (!bounds) return { longitude: -74.006, latitude: 40.7128, zoom: 10 }

        return {
            longitude: (bounds.minLng + bounds.maxLng) / 2,
            latitude: (bounds.minLat + bounds.maxLat) / 2,
            zoom: 11
        }
    }, [bounds])

    if (!mapboxToken) return <div className="h-full bg-muted animate-pulse rounded-xl" />

    return (
        <Map
            mapboxAccessToken={mapboxToken}
            initialViewState={initialViewState}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/streets-v11"
            reuseMaps
        >
            <NavigationControl position="top-right" />
            <FullscreenControl position="top-right" />

            {/* Traffic Toggle Button */}
            <div className="absolute top-2 left-2 z-10">
                <button
                    onClick={() => setShowTraffic(!showTraffic)}
                    className={cn(
                        "bg-background/90 p-2 rounded-md shadow-md border hover:bg-muted transition-colors",
                        showTraffic && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                    title="Toggle Traffic"
                >
                    <Layers className="h-4 w-4" />
                </button>
            </div>

            {/* Traffic Layer */}
            {showTraffic && (
                <Source id="mapbox-traffic" type="vector" url="mapbox://mapbox.mapbox-traffic-v1">
                    <Layer
                        id="traffic-layer"
                        source-layer="traffic"
                        type="line"
                        paint={{
                            'line-width': 2,
                            'line-color': [
                                'case',
                                ['==', ['get', 'congestion'], 'low'], '#4ade80',
                                ['==', ['get', 'congestion'], 'moderate'], '#facc15',
                                ['==', ['get', 'congestion'], 'heavy'], '#f87171',
                                ['==', ['get', 'congestion'], 'severe'], '#b91c1c',
                                '#000000'
                            ],
                            'line-offset': 1
                        }}
                    />
                </Source>
            )}

            {/* Route Line */}
            {routeGeoJSON && (
                <Source id="route" type="geojson" data={routeGeoJSON}>
                    <Layer
                        id="route-layer"
                        type="line"
                        layout={{
                            'line-join': 'round',
                            'line-cap': 'round'
                        }}
                        paint={{
                            'line-color': '#0ea5e9', // Blue-500 equivalent
                            'line-width': 4,
                            'line-opacity': 0.8
                        }}
                    />
                </Source>
            )}

            {/* Pickup Marker */}
            {pickup && (
                <Marker longitude={pickup.lng} latitude={pickup.lat} anchor="bottom">
                    <div className="flex flex-col items-center">
                        <div className="bg-status-success text-white p-1.5 rounded-full shadow-lg">
                            <MapPin className="h-4 w-4 fill-current" />
                        </div>
                        <div className="bg-background/90 text-xs px-2 py-0.5 rounded shadow mt-1 font-medium">
                            Pickup
                        </div>
                    </div>
                </Marker>
            )}

            {/* Delivery Marker */}
            {delivery && (
                <Marker longitude={delivery.lng} latitude={delivery.lat} anchor="bottom">
                    <div className="flex flex-col items-center">
                        <div className="bg-status-error text-white p-1.5 rounded-full shadow-lg">
                            <Flag className="h-4 w-4 fill-current" />
                        </div>
                        <div className="bg-background/90 text-xs px-2 py-0.5 rounded shadow mt-1 font-medium">
                            Delivery
                        </div>
                    </div>
                </Marker>
            )}

            {/* Vehicle Marker */}
            {vehicleLocation && (
                <Marker longitude={vehicleLocation.lng} latitude={vehicleLocation.lat} anchor="bottom">
                    <div className="flex flex-col items-center">
                        <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg animate-pulse ring-4 ring-blue-500/30">
                            <Truck className="h-5 w-5 fill-current" />
                        </div>
                        <div className="bg-background/90 text-xs px-2 py-0.5 rounded shadow mt-1 font-bold text-blue-600">
                            Live Truck
                        </div>
                    </div>
                </Marker>
            )}
        </Map>
    )
}
