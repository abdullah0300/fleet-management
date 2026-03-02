'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
    APIProvider,
    Map,
    AdvancedMarker,
    useMap,
    useMapsLibrary
} from '@vis.gl/react-google-maps'
import { Truck, MapPin, Layers, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { truckingMapStyle } from '@/lib/map-styles'
import { useVehicleLocation } from '@/hooks/useVehicleLocation'
import { useVehicleHistory } from '@/hooks/useVehicleHistory'

interface Waypoint {
    lat: number
    lng: number
    type: 'pickup' | 'delivery' | 'dropoff' | 'waypoint'
    sequence: number
    address?: string
    jobId?: string
}

interface ManifestRouteMapProps {
    waypoints: Waypoint[]
    vehicleLocation?: { lat: number; lng: number } | null
    driverName?: string
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

        const validStops = [...waypoints].sort((a, b) => a.sequence - b.sequence).filter(s => s.lat !== undefined && s.lng !== undefined);
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

function HistoryLine({ show, historyData }: { show: boolean, historyData: { lat: number, lng: number }[] | undefined }) {
    const map = useMap();
    const [polyline, setPolyline] = useState<google.maps.Polyline>();

    useEffect(() => {
        if (!map) return;
        const line = new google.maps.Polyline({
            geodesic: true,
            strokeOpacity: 0,
            icons: [{
                icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: 0.8,
                    strokeColor: '#9333ea', // purple-600
                    strokeWeight: 4,
                    scale: 3
                },
                offset: '0',
                repeat: '20px'
            }],
        });
        setPolyline(line);
        return () => line.setMap(null);
    }, [map]);

    useEffect(() => {
        if (!polyline) return;
        if (show && historyData && historyData.length >= 2) {
            polyline.setPath(historyData.map(h => ({ lat: h.lat, lng: h.lng })));
            polyline.setMap(map);
        } else {
            polyline.setMap(null);
        }
    }, [show, historyData, polyline, map]);

    return null;
}

export function ManifestRouteMap({ waypoints, vehicleLocation: initialVehicleLocation, driverName, vehicleId }: ManifestRouteMapProps) {
    const [apiKey, setApiKey] = useState<string>('')
    const [showTraffic, setShowTraffic] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)

    const { location: liveLocation } = useVehicleLocation(vehicleId)
    const { data: historyData } = useVehicleHistory(vehicleId, undefined, undefined)

    const vehicleLocation = liveLocation || initialVehicleLocation

    useEffect(() => {
        setApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')
    }, [])

    const fitBounds = useCallback(() => {
        if (!mapInstance || waypoints.length === 0) return

        const allPoints = [...waypoints]
        if (vehicleLocation) allPoints.push({ ...vehicleLocation, type: 'pickup', sequence: 0 } as any)
        if (allPoints.length === 0) return

        const bounds = new google.maps.LatLngBounds()
        allPoints.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }))

        mapInstance.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
    }, [mapInstance, waypoints, vehicleLocation])

    useEffect(() => {
        if (mapInstance && waypoints.length > 0) {
            const timer = setTimeout(fitBounds, 500)
            return () => clearTimeout(timer)
        }
    }, [mapInstance, fitBounds, waypoints])

    const initialViewState = useMemo(() => {
        if (waypoints.length === 0 && !vehicleLocation) return { lat: 40.7128, lng: -74.006 }
        const allPoints = [...waypoints]
        if (vehicleLocation) allPoints.push({ ...vehicleLocation, type: 'pickup', sequence: 0 } as any)
        const lngs = allPoints.map(p => p.lng)
        const lats = allPoints.map(p => p.lat)
        return {
            lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
            lat: (Math.min(...lats) + Math.max(...lats)) / 2,
        }
    }, [waypoints, vehicleLocation])

    if (!apiKey) return <div className="h-full bg-muted animate-pulse rounded-xl" />

    return (
        <div className="relative h-full w-full">
            <APIProvider apiKey={apiKey}>
                <Map
                    defaultCenter={initialViewState}
                    defaultZoom={10}
                    mapId="manifest_route_map"
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

                    <div className="absolute top-2 left-12 z-10">
                        <button onClick={() => setShowHistory(!showHistory)} className={cn("bg-background/90 p-2 rounded-md shadow-md border hover:bg-muted transition-colors", showHistory && "bg-purple-600 text-white hover:bg-purple-700")} title="Toggle Route History">
                            <Clock className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="absolute top-14 left-2 z-10">
                        <button onClick={fitBounds} className="bg-background/90 p-2 rounded-md shadow-md border hover:bg-muted transition-colors" title="Fit entire route">
                            <MapPin className="h-4 w-4" />
                        </button>
                    </div>

                    <Traffic show={showTraffic} />
                    <HistoryLine show={showHistory} historyData={historyData} />
                    <Directions waypoints={waypoints} />

                    {waypoints.map((point, index) => (
                        <AdvancedMarker key={index} position={{ lat: point.lat, lng: point.lng }}>
                            <div className="flex flex-col items-center">
                                <div className={cn("bg-white p-1.5 rounded-full shadow-lg border-2", point.type === 'pickup' ? "border-green-500 text-green-600" : (point.type === 'dropoff' || point.type === 'delivery') ? "border-red-500 text-red-600" : "border-blue-500 text-blue-600")}>
                                    <span className="text-xs font-bold w-4 h-4 flex items-center justify-center">{index + 1}</span>
                                </div>
                            </div>
                        </AdvancedMarker>
                    ))}

                    {vehicleLocation && (
                        <AdvancedMarker position={{ lat: vehicleLocation.lat, lng: vehicleLocation.lng }}>
                            <div className="flex flex-col items-center">
                                <div className="bg-blue-600 text-white p-2 rounded-full shadow-lg animate-pulse ring-4 ring-blue-500/30">
                                    <Truck className="h-5 w-5 fill-current" />
                                </div>
                                {driverName && <div className="mt-1 bg-white px-2 py-0.5 rounded shadow text-xs font-medium whitespace-nowrap">{driverName}</div>}
                            </div>
                        </AdvancedMarker>
                    )}
                </Map>
            </APIProvider>

            <div className="absolute bottom-4 left-4 bg-white/95 rounded-lg shadow-lg p-3 text-xs space-y-2">
                <div className="font-semibold text-gray-700">Legend</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-green-500" /><span>Pickup</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-red-500" /><span>Dropoff</span></div>
                {vehicleLocation && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-600" /><span>Driver Location</span></div>}
                <div className="flex items-center gap-2"><div className="w-6 h-1 bg-sky-500 rounded" /><span>Route</span></div>
                {showHistory && <div className="flex items-center gap-2"><div className="w-6 h-1 bg-purple-600 rounded border-dashed border-white" /><span>Actual Path</span></div>}
            </div>

            {waypoints.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                    <div className="bg-white rounded-lg shadow-lg p-6 text-center max-w-sm">
                        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                        <p className="font-medium">No Route Available</p>
                        <p className="text-sm text-muted-foreground mt-1">Jobs in this manifest don't have location coordinates set.</p>
                    </div>
                </div>
            )}
        </div>
    )
}
