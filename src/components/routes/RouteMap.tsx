'use client'

import { useEffect, useState } from 'react'
import {
    APIProvider,
    Map,
    AdvancedMarker,
    useMap,
    useMapsLibrary
} from '@vis.gl/react-google-maps'
import { cn } from '@/lib/utils'
import { truckingMapStyle } from '@/lib/map-styles'
interface RouteMapProps {
    stops?: { lat: number; lng: number; type: 'origin' | 'waypoint' | 'destination' }[]
    className?: string
}

function Directions({ stops }: { stops: RouteMapProps['stops'] }) {
    const map = useMap();
    const routesLibrary = useMapsLibrary('routes');
    const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService>();
    const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer>();

    // Initialize directions service and renderer
    useEffect(() => {
        if (!routesLibrary || !map) return;
        setDirectionsService(new routesLibrary.DirectionsService());

        // Setup renderer
        const renderer = new routesLibrary.DirectionsRenderer({
            map,
            suppressMarkers: true, // We draw our own markers
            polylineOptions: {
                strokeColor: '#3b82f6',
                strokeWeight: 5,
                strokeOpacity: 0.75
            }
        });
        setDirectionsRenderer(renderer);

        return () => {
            renderer.setMap(null);
        };
    }, [routesLibrary, map]);

    // Calculate and draw route
    useEffect(() => {
        if (!directionsService || !directionsRenderer || !stops || stops.length < 2) {
            if (directionsRenderer) directionsRenderer.setDirections({ routes: [] } as any);

            // If only 1 stop, center map to it
            if (stops && stops.length === 1 && map) {
                map.panTo({ lat: stops[0].lat, lng: stops[0].lng });
                map.setZoom(12);
            }
            return;
        }

        const validStops = stops.filter(s => s.lat !== undefined && s.lng !== undefined);
        if (validStops.length < 2) return;

        const origin = validStops[0];
        const destination = validStops[validStops.length - 1];
        const waypoints = validStops.slice(1, -1).map(stop => ({
            location: { lat: stop.lat, lng: stop.lng },
            stopover: true
        }));

        directionsService.route({
            origin: { lat: origin.lat, lng: origin.lng },
            destination: { lat: destination.lat, lng: destination.lng },
            waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
        }).then(response => {
            directionsRenderer.setDirections(response);

            // Optional: fit bounds
            if (response.routes[0]?.bounds && map) {
                map.fitBounds(response.routes[0].bounds, {
                    top: 60, right: 60, bottom: 60, left: 60
                });
            }
        }).catch(e => {
            console.error('Directions request failed:', e);
            directionsRenderer.setDirections({ routes: [] } as any);
        });
    }, [directionsService, directionsRenderer, stops, map]);

    return null;
}

export function RouteMap({ stops = [], className }: RouteMapProps) {
    const [apiKey, setApiKey] = useState<string>('');

    useEffect(() => {
        setApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '');
    }, []);

    // US Center
    const defaultCenter = { lat: 39.8283, lng: -98.5795 };

    if (!apiKey) {
        return <div className={cn("bg-slate-100 flex items-center justify-center p-4 text-center", className)}>
            Google Maps API Key required
        </div>;
    }

    return (
        <div className={className}>
            <APIProvider apiKey={apiKey}>
                <Map
                    defaultCenter={defaultCenter}
                    defaultZoom={3}
                    mapId="route_map"
                    className="w-full h-full"
                    gestureHandling={'greedy'}
                    disableDefaultUI={false}
                    styles={truckingMapStyle}
                >
                    {/* Render custom markers for each stop */}
                    {stops.filter(s => s.lat && s.lng).map((stop, idx) => {
                        const color = stop.type === 'origin' ? 'bg-green-500' :
                            stop.type === 'destination' ? 'bg-red-500' : 'bg-blue-500';

                        return (
                            <AdvancedMarker
                                key={`${stop.type}-${idx}`}
                                position={{ lat: stop.lat, lng: stop.lng }}
                                title={stop.type}
                            >
                                <div className={cn(
                                    "w-4 h-4 rounded-full border-2 border-white shadow-md",
                                    color
                                )} />
                            </AdvancedMarker>
                        )
                    })}

                    {/* Directions drawing component */}
                    <Directions stops={stops} />
                </Map>
            </APIProvider>
        </div>
    )
}
