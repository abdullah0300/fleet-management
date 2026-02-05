'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Map, { Marker, NavigationControl, FullscreenControl, Source, Layer, MapRef } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Truck, MapPin, Flag, Layers, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Waypoint {
    lat: number
    lng: number
    type: 'pickup' | 'dropoff' | 'waypoint'
    sequence: number
    address?: string
}

interface JobRouteMapProps {
    // Support both old interface (pickup/delivery) and new (waypoints)
    pickup?: { lat: number; lng: number; address?: string }
    delivery?: { lat: number; lng: number; address?: string }
    waypoints?: Waypoint[]
    vehicleLocation?: { lat: number; lng: number }
}

export function JobRouteMap({ pickup, delivery, waypoints: externalWaypoints, vehicleLocation }: JobRouteMapProps) {
    const mapRef = useRef<MapRef>(null)
    const [mapboxToken, setMapboxToken] = useState<string>('')
    const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null)
    const [showTraffic, setShowTraffic] = useState(false)
    const [mapLoaded, setMapLoaded] = useState(false)

    useEffect(() => {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
        setMapboxToken(token)
    }, [])

    // Convert old pickup/delivery props to waypoints format if needed
    const waypoints = useMemo(() => {
        if (externalWaypoints && externalWaypoints.length > 0) {
            return externalWaypoints.sort((a, b) => a.sequence - b.sequence)
        }

        // Fallback to old pickup/delivery props
        const points: Waypoint[] = []
        if (pickup) {
            points.push({ lat: pickup.lat, lng: pickup.lng, type: 'pickup', sequence: 0, address: pickup.address })
        }
        if (delivery) {
            points.push({ lat: delivery.lat, lng: delivery.lng, type: 'dropoff', sequence: 1, address: delivery.address })
        }
        return points
    }, [externalWaypoints, pickup, delivery])

    // Fit map to show all waypoints
    const fitBounds = useCallback(() => {
        if (!mapRef.current || waypoints.length === 0) return

        const allPoints = [...waypoints]
        if (vehicleLocation) {
            allPoints.push({ ...vehicleLocation, type: 'pickup', sequence: -1 } as Waypoint)
        }

        if (allPoints.length === 0) return

        const lngs = allPoints.map(p => p.lng)
        const lats = allPoints.map(p => p.lat)

        const minLng = Math.min(...lngs)
        const maxLng = Math.max(...lngs)
        const minLat = Math.min(...lats)
        const maxLat = Math.max(...lats)

        // Add padding to the bounds
        const lngPadding = (maxLng - minLng) * 0.2 || 0.01
        const latPadding = (maxLat - minLat) * 0.2 || 0.01

        mapRef.current.fitBounds(
            [
                [minLng - lngPadding, minLat - latPadding],
                [maxLng + lngPadding, maxLat + latPadding]
            ],
            {
                padding: { top: 40, bottom: 40, left: 40, right: 40 },
                duration: 1000
            }
        )
    }, [waypoints, vehicleLocation])

    // Fit bounds when map loads or waypoints change
    useEffect(() => {
        if (mapLoaded && waypoints.length > 0) {
            const timer = setTimeout(fitBounds, 300)
            return () => clearTimeout(timer)
        }
    }, [mapLoaded, fitBounds, waypoints])

    // Fetch route from Mapbox Directions API
    useEffect(() => {
        if (waypoints.length < 2 || !mapboxToken) return

        const fetchRoute = async () => {
            try {
                const coords = waypoints.map(p => `${p.lng},${p.lat}`).join(';')
                const query = await fetch(
                    `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?steps=true&geometries=geojson&access_token=${mapboxToken}`
                )
                const json = await query.json()
                if (json.routes && json.routes.length > 0) {
                    setRouteGeoJSON({
                        type: 'Feature',
                        properties: {},
                        geometry: json.routes[0].geometry
                    })
                }
            } catch (error) {
                console.error('Error fetching route:', error)
            }
        }

        fetchRoute()
    }, [waypoints, mapboxToken])

    // Initial view
    const initialViewState = useMemo(() => {
        if (waypoints.length === 0 && !vehicleLocation) {
            return { longitude: -74.006, latitude: 40.7128, zoom: 10 }
        }

        const allPoints = [...waypoints]
        if (vehicleLocation) allPoints.push({ ...vehicleLocation, type: 'pickup', sequence: -1 } as Waypoint)

        const lngs = allPoints.map(p => p.lng)
        const lats = allPoints.map(p => p.lat)

        return {
            longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
            latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
            zoom: 10
        }
    }, [waypoints, vehicleLocation])

    // Process waypoints to handle identical coordinates (overlap)
    const displayWaypoints = useMemo(() => {
        const processedPoints = [...waypoints].map(p => ({ ...p, displayLat: p.lat, displayLng: p.lng }))

        // Group by coordinates
        const groups: { [key: string]: number[] } = {}
        processedPoints.forEach((p, index) => {
            const key = `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`
            if (!groups[key]) groups[key] = []
            groups[key].push(index)
        })

        // Apply offset to duplicates
        Object.values(groups).forEach(indices => {
            if (indices.length > 1) {
                const radius = 0.0002 // Approx 20 meters
                indices.forEach((pointIndex, i) => {
                    const angle = (2 * Math.PI * i) / indices.length
                    processedPoints[pointIndex].displayLat += radius * Math.cos(angle)
                    processedPoints[pointIndex].displayLng += radius * Math.sin(angle)
                })
            }
        })

        return processedPoints
    }, [waypoints])

    if (!mapboxToken) return <div className="h-full bg-muted animate-pulse rounded-xl" />

    return (
        <div className="relative h-full w-full">
            <Map
                ref={mapRef}
                mapboxAccessToken={mapboxToken}
                initialViewState={initialViewState}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v11"
                onLoad={() => setMapLoaded(true)}
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

                {/* Fit All Button */}
                <div className="absolute top-14 left-2 z-10">
                    <button
                        onClick={fitBounds}
                        className="bg-background/90 p-2 rounded-md shadow-md border hover:bg-muted transition-colors"
                        title="Fit entire route"
                    >
                        <MapPin className="h-4 w-4" />
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
                                'line-color': '#0ea5e9',
                                'line-width': 5,
                                'line-opacity': 0.8
                            }}
                        />
                    </Source>
                )}

                {/* Waypoint Markers */}
                {displayWaypoints.map((point, index) => (
                    <Marker key={index} longitude={point.displayLng} latitude={point.displayLat} anchor="bottom">
                        <div className="flex flex-col items-center">
                            <div className={cn(
                                "bg-white p-1.5 rounded-full shadow-lg border-2",
                                point.type === 'pickup' ? "border-green-500 text-green-600" :
                                    point.type === 'dropoff' ? "border-red-500 text-red-600" :
                                        "border-blue-500 text-blue-600"
                            )}>
                                <span className="text-xs font-bold w-4 h-4 flex items-center justify-center">
                                    {index + 1}
                                </span>
                            </div>
                            {point.type === 'pickup' && index === 0 && (
                                <div className="bg-background/90 text-xs px-2 py-0.5 rounded shadow mt-1 font-medium">
                                    Pickup
                                </div>
                            )}
                            {point.type === 'dropoff' && index === waypoints.length - 1 && (
                                <div className="bg-background/90 text-xs px-2 py-0.5 rounded shadow mt-1 font-medium">
                                    Delivery
                                </div>
                            )}
                        </div>
                    </Marker>
                ))}

                {/* Vehicle/Driver Location Marker */}
                {vehicleLocation && (
                    <Marker longitude={vehicleLocation.lng} latitude={vehicleLocation.lat} anchor="bottom">
                        <div className="flex flex-col items-center">
                            <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg animate-pulse ring-4 ring-blue-500/30">
                                <Truck className="h-5 w-5 fill-current" />
                            </div>
                            <div className="bg-background/90 text-xs px-2 py-0.5 rounded shadow mt-1 font-bold text-blue-600">
                                Live
                            </div>
                        </div>
                    </Marker>
                )}
            </Map>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/95 rounded-lg shadow-lg p-2 text-xs space-y-1">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-green-500" />
                    <span>Pickup</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border-2 border-red-500" />
                    <span>Dropoff</span>
                </div>
                {vehicleLocation && (
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-600" />
                        <span>Vehicle</span>
                    </div>
                )}
            </div>

            {/* No waypoints message */}
            {waypoints.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                    <div className="bg-white rounded-lg shadow-lg p-4 text-center max-w-xs">
                        <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                        <p className="font-medium text-sm">No Route Available</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            This job doesn't have location coordinates.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
