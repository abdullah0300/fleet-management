'use client'

import { useVehicleLocationContext } from '@/contexts/VehicleLocationContext'

interface LocationUpdate {
    lat: number
    lng: number
    heading?: number
    speed?: number
    timestamp?: string
}

/**
 * Hook to listen for real-time vehicle location updates
 * Uses the global VehicleLocationContext to avoid multiple socket connections.
 * 
 * @param vehicleId - Optional. If provided, returns location for specific vehicle. 
 *                    If null/undefined, returns map of all vehicles.
 */
export function useVehicleLocation(vehicleId?: string | null) {
    const { locations, getLocation } = useVehicleLocationContext()

    const location = vehicleId ? getLocation(vehicleId) : null

    return { location, locations }
}
