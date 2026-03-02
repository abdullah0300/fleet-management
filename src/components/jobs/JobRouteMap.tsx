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
            polylineOptions: { strokeColor: '#0ea5e9', strokeWeight: 5, strokeOpacity: 0.8 }
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

export function JobRouteMap({ pickup, delivery, waypoints: externalWaypoints, vehicleLocation: initialVehicleLocation, vehicleId }: JobRouteMapProps) {
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
        if (!mapInstance || waypoints.length === 0) return

        const allPoints = [...waypoints]
        if (vehicleLocation) allPoints.push({ ...vehicleLocation, type: 'pickup', sequence: -1 } as Waypoint)
        if (allPoints.length === 0) return

        const bounds = new google.maps.LatLngBounds()
        allPoints.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }))

        mapInstance.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 })
    }, [mapInstance, waypoints, vehicleLocation])

    useEffect(() => {
        if (mapInstance && waypoints.length > 0) {
            const timer = setTimeout(fitBounds, 300)
            return () => clearTimeout(timer)
        }
    }, [mapInstance, fitBounds, waypoints])

    const initialViewState = useMemo(() => {
        if (waypoints.length === 0 && !vehicleLocation) return { lat: 40.7128, lng: -74.006 }
        const allPoints = [...waypoints]
        if (vehicleLocation) allPoints.push({ ...vehicleLocation, type: 'pickup', sequence: -1 } as Waypoint)
        const lngs = allPoints.map(p => p.lng)
        const lats = allPoints.map(p => p.lat)
        return {
            lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
            lat: (Math.min(...lats) + Math.max(...lats)) / 2,
        }
    }, [waypoints, vehicleLocation])

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
                    disableDefaultUI={false}
                    styles={truckingMapStyle}
                    onIdle={(map) => {
                        if (!mapInstance) setMapInstance(map.map)
                    }}
                >
                    <div className="absolute top-2 left-2 z-10">
                        <button onClick={() => setShowTraffic(!showTraffic)} className={cn("bg-background/90 p-2 rounded-md shadow-md border hover:bg-muted transition-colors", showTraffic && "bg-primary text-primary-foreground hover:bg-primary/90")} title="Toggle Traffic">
                            <Layers className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="absolute top-14 left-2 z-10">
                        <button onClick={fitBounds} className="bg-background/90 p-2 rounded-md shadow-md border hover:bg-muted transition-colors" title="Fit entire route">
                            <MapPin className="h-4 w-4" />
                        </button>
                    </div>

                    <Traffic show={showTraffic} />
                    <Directions waypoints={waypoints} />

                    {displayWaypoints.map((point, index) => (
                        <AdvancedMarker key={index} position={{ lat: point.displayLat, lng: point.displayLng }}>
                            <div className="flex flex-col items-center">
                                <div className={cn("bg-white p-1.5 rounded-full shadow-lg border-2", point.type === 'pickup' ? "border-green-500 text-green-600" : point.type === 'dropoff' ? "border-red-500 text-red-600" : "border-blue-500 text-blue-600")}>
                                    <span className="text-xs font-bold w-4 h-4 flex items-center justify-center">{index + 1}</span>
                                </div>
                                {point.type === 'pickup' && index === 0 && <div className="bg-background/90 text-xs px-2 py-0.5 rounded shadow mt-1 font-medium">Pickup</div>}
                                {point.type === 'dropoff' && index === waypoints.length - 1 && <div className="bg-background/90 text-xs px-2 py-0.5 rounded shadow mt-1 font-medium">Delivery</div>}
                            </div>
                        </AdvancedMarker>
                    ))}

                    {vehicleLocation && (
                        <AdvancedMarker position={{ lat: vehicleLocation.lat, lng: vehicleLocation.lng }}>
                            <div className="flex flex-col items-center">
                                <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg animate-pulse ring-4 ring-blue-500/30">
                                    <Truck className="h-5 w-5 fill-current" />
                                </div>
                                <div className="bg-background/90 text-xs px-2 py-0.5 rounded shadow mt-1 font-bold text-blue-600">Live</div>
                            </div>
                        </AdvancedMarker>
                    )}
                </Map>
            </APIProvider>

            <div className="absolute bottom-4 left-4 bg-white/95 rounded-lg shadow-lg p-2 text-xs space-y-1">
                {waypoints.length > 0 && (
                    <>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-green-500" /><span>Pickup</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-red-500" /><span>Dropoff</span></div>
                    </>
                )}
                {vehicleLocation && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600" /><span>Vehicle</span></div>}
            </div>

            {waypoints.length === 0 && !vehicleLocation && (
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
