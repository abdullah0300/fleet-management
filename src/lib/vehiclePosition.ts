import { LocationUpdate } from '@/contexts/VehicleLocationContext'

/**
 * Returns the best available position for a vehicle.
 * Prefers the live WebSocket location, falls back to the last DB-persisted value.
 * Uses null-equality checks so lat/lng = 0 are treated as valid coordinates.
 */
export function getVehiclePosition(
    vehicle: { id: string; current_location: unknown },
    liveLocations: Record<string, LocationUpdate>
): { lat: number; lng: number } | null {
    const live = liveLocations[vehicle.id]
    if (live?.lat != null && live?.lng != null) {
        return { lat: live.lat, lng: live.lng }
    }
    const loc = vehicle.current_location as { lat?: number; lng?: number } | null
    if (loc?.lat != null && loc?.lng != null) {
        return { lat: loc.lat, lng: loc.lng }
    }
    return null
}

/**
 * Returns true if the vehicle has sent a GPS update within the last `thresholdSeconds`.
 * Checks the live WebSocket data first, then falls back to the DB snapshot.
 */
export function isVehicleLive(
    vehicle: { id: string; current_location: unknown },
    liveLocations: Record<string, LocationUpdate>,
    thresholdSeconds = 60
): boolean {
    const live = liveLocations[vehicle.id] ?? (vehicle.current_location as LocationUpdate | null)
    if (!live?.timestamp) return false
    const diffSeconds = (Date.now() - new Date(live.timestamp).getTime()) / 1000
    return diffSeconds < thresholdSeconds
}

/**
 * Returns the best available full location data (with heading/speed/timestamp).
 * Prefers live WebSocket data, falls back to DB snapshot.
 */
export function getVehicleLiveData(
    vehicle: { id: string; current_location: unknown },
    liveLocations: Record<string, LocationUpdate>
): LocationUpdate | null {
    const live = liveLocations[vehicle.id]
    if (live?.lat != null && live?.lng != null) return live
    return (vehicle.current_location as LocationUpdate | null) ?? null
}
