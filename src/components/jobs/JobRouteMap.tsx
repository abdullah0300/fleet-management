'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
    APIProvider,
    Map,
    AdvancedMarker,
    useMap,
    useMapsLibrary
} from '@vis.gl/react-google-maps'
import { Truck, MapPin, Layers, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { truckingMapStyle } from '@/lib/map-styles'
import { useVehicleLocation } from '@/hooks/useVehicleLocation'

interface Waypoint {
    lat: number
    lng: number
    type: 'pickup' | 'dropoff' | 'waypoint'
    sequence: number
    address?: string
}

interface JobRouteMapProps {
    pickup?: { lat: number; lng: number; address?: string }
    delivery?: { lat: number; lng: number; address?: string }
    waypoints?: Waypoint[]
    vehicleLocation?: { lat: number; lng: number }
    vehicleId?: string | null
    fleetLocations?: { id: string; lat: number; lng: number; label?: string }[]
}

function Traffic({ show }: { show: boolean }) {
    const map = useMap();
    const [trafficLayer, setTrafficLayer] = useState<google.maps.TrafficLayer>();

    useEffect(() => {
        if (!map) return;
        const layer = new google.maps.TrafficLayer();
        setTrafficLayer(layer);
        return () => layer.setMap(null);
    }, [map]);

    useEffect(() => {
        if (trafficLayer && map) {
            trafficLayer.setMap(show ? map : null);
        }
    }, [show, trafficLayer, map]);

    return null;
}

function Directions({ waypoints }: { waypoints: Waypoint[] }) {
    const map = useMap();
    const routesLibrary = useMapsLibrary('routes');
    const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
    const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();

    useEffect(() => {
        if (!routesLibrary || !map) return;
        setDirectionsService(new routesLibrary.DirectionsService());
        const renderer = new routesLibrary.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: { strokeColor: '#ea580c', strokeWeight: 4, strokeOpacity: 0.9 }
        });
        setDirectionsRenderer(renderer);
        return () => renderer.setMap(null);
    }, [routesLibrary, map]);

    useEffect(() => {
        if (!directionsService || !directionsRenderer || waypoints.length < 2) {
            if (directionsRenderer) directionsRenderer.setDirections({ routes: [] } as any);
            return;
        }

        const validStops = waypoints.filter(s => s.lat !== undefined && s.lng !== undefined);
        if (validStops.length < 2) return;

        const origin = validStops[0];
        const destination = validStops[validStops.length - 1];
        const wps = validStops.slice(1, -1).map(stop => ({
            location: { lat: stop.lat, lng: stop.lng },
            stopover: true
        }));

        directionsService.route({
            origin: { lat: origin.lat, lng: origin.lng },
            destination: { lat: destination.lat, lng: destination.lng },
            waypoints: wps,
            travelMode: google.maps.TravelMode.DRIVING,
        }).then(response => {
            directionsRenderer.setDirections(response);
        }).catch(e => {
            console.error('Directions request failed:', e);
            directionsRenderer.setDirections({ routes: [] } as any);
        });
    }, [directionsService, directionsRenderer, waypoints]);

    return null;
}

export function JobRouteMap({ pickup, delivery, waypoints: externalWaypoints, vehicleLocation: initialVehicleLocation, vehicleId, fleetLocations }: JobRouteMapProps) {
    const [apiKey, setApiKey] = useState<string>('')
    const [showTraffic, setShowTraffic] = useState(false)
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)

    const { location: liveLocation } = useVehicleLocation(vehicleId)
    const vehicleLocation = liveLocation || initialVehicleLocation

    useEffect(() => {
        setApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')
    }, [])

    const waypoints = useMemo(() => {
        if (externalWaypoints && externalWaypoints.length > 0) {
            return [...externalWaypoints].sort((a, b) => a.sequence - b.sequence)
        }
        const points: Waypoint[] = []
        if (pickup) points.push({ lat: pickup.lat, lng: pickup.lng, type: 'pickup', sequence: 0, address: pickup.address })
        if (delivery) points.push({ lat: delivery.lat, lng: delivery.lng, type: 'dropoff', sequence: 1, address: delivery.address })
        return points
    }, [externalWaypoints, pickup, delivery])

    const fitBounds = useCallback(() => {
        if (!mapInstance) return

        const allPoints = [...waypoints]
        if (vehicleLocation) allPoints.push({ ...vehicleLocation, type: 'pickup', sequence: -1 } as Waypoint)
        if (fleetLocations) {
            fleetLocations.forEach(loc => allPoints.push({ lat: loc.lat, lng: loc.lng, type: 'pickup', sequence: -1 } as Waypoint))
        }

        if (allPoints.length === 0) return

        const bounds = new google.maps.LatLngBounds()
        allPoints.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }))

        mapInstance.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
    }, [mapInstance, waypoints, vehicleLocation, fleetLocations])

    useEffect(() => {
        if (mapInstance && waypoints.length > 0) {
            const timer = setTimeout(fitBounds, 300)
            return () => clearTimeout(timer)
        }
    }, [mapInstance, fitBounds, waypoints])

    const initialViewState = useMemo(() => {
        const allPoints = [...waypoints]
        if (vehicleLocation) allPoints.push({ ...vehicleLocation, type: 'pickup', sequence: -1 } as Waypoint)
        if (fleetLocations) {
            fleetLocations.forEach(loc => allPoints.push({ lat: loc.lat, lng: loc.lng, type: 'pickup', sequence: -1 } as Waypoint))
        }

        if (allPoints.length === 0) return { lat: 40.7128, lng: -74.006 }

        const lngs = allPoints.map(p => p.lng)
        const lats = allPoints.map(p => p.lat)
        return {
            lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
            lat: (Math.min(...lats) + Math.max(...lats)) / 2,
        }
    }, [waypoints, vehicleLocation, fleetLocations])

    const displayWaypoints = useMemo(() => {
        const processedPoints = [...waypoints].map(p => ({ ...p, displayLat: p.lat, displayLng: p.lng }))
        const groups: { [key: string]: number[] } = {}
        processedPoints.forEach((p, index) => {
            const key = `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`
            if (!groups[key]) groups[key] = []
            groups[key].push(index)
        })
        Object.values(groups).forEach(indices => {
            if (indices.length > 1) {
                const radius = 0.0002
                indices.forEach((pointIndex, i) => {
                    const angle = (2 * Math.PI * i) / indices.length
                    processedPoints[pointIndex].displayLat += radius * Math.cos(angle)
                    processedPoints[pointIndex].displayLng += radius * Math.sin(angle)
                })
            }
        })
        return processedPoints
    }, [waypoints])

    if (!apiKey) return <div className="h-full bg-muted animate-pulse rounded-xl" />

    return (
        <div className="relative h-full w-full">
            <APIProvider apiKey={apiKey}>
                <Map
                    defaultCenter={initialViewState}
                    defaultZoom={10}
                    mapId="job_route_map"
                    className="w-full h-full"
                    gestureHandling={'greedy'}
                    disableDefaultUI={true}
                    zoomControl={true}
                    styles={truckingMapStyle}
                    onIdle={(map) => {
                        if (!mapInstance) setMapInstance(map.map)
                    }}
                >
                    <Directions waypoints={waypoints} />

                    {displayWaypoints.map((point, index) => (
                        <AdvancedMarker key={index} position={{ lat: point.displayLat, lng: point.displayLng }}>
                            <div className="relative flex flex-col items-center drop-shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#dc2626" stroke="#b91c1c" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                    <circle cx="12" cy="10" r="3" fill="white" stroke="none" />
                                </svg>
                            </div>
                        </AdvancedMarker>
                    ))}

                    {vehicleLocation && (
                        <AdvancedMarker position={{ lat: vehicleLocation.lat, lng: vehicleLocation.lng }}>
                            <div className="flex flex-col items-center">
                                <div className="bg-white text-slate-800 p-1.5 rounded-md shadow-lg border border-slate-200">
                                    <Truck className="h-5 w-5 fill-amber-400 stroke-amber-600" />
                                </div>
                            </div>
                        </AdvancedMarker>
                    )}

                    {fleetLocations?.map(loc => (
                        <AdvancedMarker key={`fleet-${loc.id}`} position={{ lat: loc.lat, lng: loc.lng }}>
                            <div className="flex flex-col items-center">
                                <div className="bg-white text-slate-800 p-1.5 rounded-md shadow-md border border-slate-200 hover:scale-110 transition-transform cursor-pointer">
                                    <Truck className="h-4 w-4 fill-amber-400 stroke-amber-600" />
                                </div>
                            </div>
                        </AdvancedMarker>
                    ))}
                </Map>
            </APIProvider>



            {waypoints.length === 0 && !vehicleLocation && (!fleetLocations || fleetLocations.length === 0) && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                    <div className="bg-white rounded-lg shadow-lg p-4 text-center max-w-xs">
                        <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
                        <p className="font-medium text-sm">No Location Data</p>
                        <p className="text-xs text-muted-foreground mt-1">This job/vehicle doesn't have location coordinates.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
