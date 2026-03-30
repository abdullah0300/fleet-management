'use client'

import { useVehicleLocationContext } from '@/contexts/VehicleLocationContext'
// LocationUpdate is exported from VehicleLocationContext — re-export here for convenience
export type { LocationUpdate } from '@/contexts/VehicleLocationContext'

/**
 * Hook to access real-time vehicle location updates.
 * Uses the global VehicleLocationContext to avoid multiple WebSocket connections.
 *
 * @param vehicleId - Optional. If provided, returns `location` for that specific vehicle.
 *                    If omitted, `location` is null but `locations` holds all vehicles.
 */
export function useVehicleLocation(vehicleId?: string | null) {
    const { locations, getLocation } = useVehicleLocationContext()

    const location = vehicleId ? getLocation(vehicleId) : null

    return { location, locations }
}
