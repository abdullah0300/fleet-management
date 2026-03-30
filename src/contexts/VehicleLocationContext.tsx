'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Vehicle } from '@/types/database'

// Single module-level client — never recreated on re-renders
const supabase = createClient()

export interface LocationUpdate {
    lat: number
    lng: number
    heading?: number
    speed?: number
    timestamp?: string
}

interface VehicleLocationContextType {
    locations: Record<string, LocationUpdate>
    getLocation: (vehicleId: string) => LocationUpdate | null
}

const VehicleLocationContext = createContext<VehicleLocationContextType | undefined>(undefined)

export function VehicleLocationProvider({ children }: { children: ReactNode }) {
    const [locations, setLocations] = useState<Record<string, LocationUpdate>>({})

    useEffect(() => {
        // Single global subscription — stable because supabase is module-level
        const channel = supabase
            .channel('global-vehicle-locations')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'vehicles',
                },
                (payload) => {
                    const newVehicle = payload.new as Vehicle
                    const newLocation = newVehicle.current_location as unknown as LocationUpdate

                    // Use null checks instead of falsy — correctly handles lat/lng = 0
                    if (newLocation && newLocation.lat != null && newLocation.lng != null) {
                        setLocations(prev => ({
                            ...prev,
                            [newVehicle.id]: newLocation
                        }))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, []) // No deps — supabase is stable, no need to re-subscribe

    const getLocation = (vehicleId: string) => locations[vehicleId] || null

    return (
        <VehicleLocationContext.Provider value={{ locations, getLocation }}>
            {children}
        </VehicleLocationContext.Provider>
    )
}

export function useVehicleLocationContext() {
    const context = useContext(VehicleLocationContext)
    if (context === undefined) {
        throw new Error('useVehicleLocationContext must be used within a VehicleLocationProvider')
    }
    return context
}
