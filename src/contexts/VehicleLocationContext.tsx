'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Vehicle } from '@/types/database'

interface LocationUpdate {
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
    const supabase = createClient()

    useEffect(() => {
        // Single global subscription
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

                    if (newLocation && newLocation.lat && newLocation.lng) {
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
    }, [supabase])

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
