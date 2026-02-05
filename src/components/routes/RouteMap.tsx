'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface RouteMapProps {
    stops?: { lat: number; lng: number; type: 'origin' | 'waypoint' | 'destination' }[]
    className?: string
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export function RouteMap({ stops = [], className }: RouteMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<mapboxgl.Map | null>(null)
    const markers = useRef<mapboxgl.Marker[]>([])

    // Initialize Map
    useEffect(() => {
        if (!mapContainer.current || !MAPBOX_TOKEN) return

        mapboxgl.accessToken = MAPBOX_TOKEN

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [-98.5795, 39.8283], // US center
            zoom: 3,
        })

        return () => {
            map.current?.remove()
        }
    }, [])

    // Update Markers & Path when stops change
    useEffect(() => {
        if (!map.current) return

        // 1. Clear existing markers
        markers.current.forEach(m => m.remove())
        markers.current = []

        // 2. Add new markers for each stop
        stops.forEach((stop, idx) => {
            const color = stop.type === 'origin' ? '#22c55e' :
                stop.type === 'destination' ? '#ef4444' : '#3b82f6'

            const marker = new mapboxgl.Marker({ color })
                .setLngLat([stop.lng, stop.lat])
                .addTo(map.current!)

            markers.current.push(marker)
        })

        // 3. Fit bounds to show all stops
        if (stops.length >= 2) {
            const bounds = new mapboxgl.LngLatBounds()
            stops.forEach(stop => bounds.extend([stop.lng, stop.lat]))
            map.current.fitBounds(bounds, { padding: 60 })

            // 4. Fetch and draw route through all stops
            fetchRoute(stops)
        } else if (stops.length === 1) {
            // Single stop - just center on it
            map.current.flyTo({ center: [stops[0].lng, stops[0].lat], zoom: 12 })
            // Remove route if exists
            clearRouteLayer()
        } else {
            // No stops - clear route
            clearRouteLayer()
        }
    }, [stops])

    const clearRouteLayer = () => {
        if (!map.current) return
        if (map.current.getLayer('route')) map.current.removeLayer('route')
        if (map.current.getSource('route')) map.current.removeSource('route')
    }

    const fetchRoute = async (routeStops: { lat: number; lng: number }[]) => {
        if (!map.current || !MAPBOX_TOKEN || routeStops.length < 2) return

        try {
            // Ensure style is loaded before adding layers
            if (!map.current.isStyleLoaded()) {
                await new Promise<void>(resolve => {
                    map.current?.once('style.load', () => resolve())
                })
            }
            if (!map.current) return

            // Build coordinates string: lng,lat;lng,lat;...
            const coords = routeStops.map(s => `${s.lng},${s.lat}`).join(';')

            const query = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}`
            )
            const json = await query.json()

            if (!json.routes || !json.routes[0]) {
                console.warn('No route found')
                return
            }

            const data = json.routes[0]
            const route = data.geometry.coordinates

            const geojson: GeoJSON.Feature<GeoJSON.Geometry> = {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: route,
                },
            }

            if (map.current.getSource('route')) {
                (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData(geojson as any)
            } else {
                map.current.addLayer({
                    id: 'route',
                    type: 'line',
                    source: {
                        type: 'geojson',
                        data: geojson as any,
                    },
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round',
                    },
                    paint: {
                        'line-color': '#3b82f6',
                        'line-width': 5,
                        'line-opacity': 0.75,
                    },
                })
            }
        } catch (err) {
            console.error('Error fetching route:', err)
        }
    }

    return <div ref={mapContainer} className={className} />
}
