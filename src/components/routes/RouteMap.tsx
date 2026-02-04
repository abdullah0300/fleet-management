'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface RouteMapProps {
    origin?: { lat: number; lng: number }
    destination?: { lat: number; lng: number }
    className?: string
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export function RouteMap({ origin, destination, className }: RouteMapProps) {
    const mapContainer = useRef<HTMLDivElement>(null)
    const map = useRef<mapboxgl.Map | null>(null)
    const originMarker = useRef<mapboxgl.Marker | null>(null)
    const destMarker = useRef<mapboxgl.Marker | null>(null)

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

    // Update Markers & Path
    useEffect(() => {
        if (!map.current) return

        // 1. Update Origin Marker
        if (origin) {
            if (!originMarker.current) {
                originMarker.current = new mapboxgl.Marker({ color: '#22c55e' }) // Green
                    .setLngLat([origin.lng, origin.lat])
                    .addTo(map.current)
            } else {
                originMarker.current.setLngLat([origin.lng, origin.lat])
            }
        } else if (originMarker.current) {
            originMarker.current.remove()
            originMarker.current = null
        }

        // 2. Update Destination Marker
        if (destination) {
            if (!destMarker.current) {
                destMarker.current = new mapboxgl.Marker({ color: '#ef4444' }) // Red
                    .setLngLat([destination.lng, destination.lat])
                    .addTo(map.current)
            } else {
                destMarker.current.setLngLat([destination.lng, destination.lat])
            }
        } else if (destMarker.current) {
            destMarker.current.remove()
            destMarker.current = null
        }

        // 3. Fit Bounds & Draw Route
        if (origin && destination) {
            // Fit bounds
            const bounds = new mapboxgl.LngLatBounds()
                .extend([origin.lng, origin.lat])
                .extend([destination.lng, destination.lat])

            map.current.fitBounds(bounds, { padding: 50 })

            // Fetch Route Polyline
            fetchRoute(origin, destination)
        } else {
            // Remove route layer if exists
            if (map.current.getSource('route')) {
                if (map.current.getLayer('route')) map.current.removeLayer('route')
                map.current.removeSource('route')
            }
        }
    }, [origin, destination])

    const fetchRoute = async (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => {
        if (!map.current || !MAPBOX_TOKEN) return

        try {
            const query = await fetch(
                `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}`
            )
            const json = await query.json()
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
