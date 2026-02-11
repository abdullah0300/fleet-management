import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type VehicleLocationHistory = Database['public']['Tables']['vehicle_location_history']['Row']

const supabase = createClient()

export const historyKeys = {
    all: ['vehicle_history'] as const,
    list: (vehicleId: string, start?: string, end?: string) =>
        [...historyKeys.all, vehicleId, { start, end }] as const,
}

async function fetchVehicleHistory(
    vehicleId: string,
    startTime?: string,
    endTime?: string
): Promise<VehicleLocationHistory[]> {
    if (!vehicleId) return []

    let query = supabase
        .from('vehicle_location_history')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('timestamp', { ascending: true })

    if (startTime) {
        query = query.gte('timestamp', startTime)
    }

    if (endTime) {
        query = query.lte('timestamp', endTime)
    } else {
        // If no end time, maybe limit to last 24h by default if also no start time?
        // But if start time is provided, we want everything since then.
        // If neither, let's limit to 1000 records to be safe.
        if (!startTime) {
            query = query.limit(500)
        }
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching vehicle history:', error)
        throw error
    }

    return data || []
}

/**
 * Hook to fetch vehicle location history
 */
export function useVehicleHistory(vehicleId: string | null | undefined, startTime?: string, endTime?: string) {
    return useQuery({
        queryKey: historyKeys.list(vehicleId || '', startTime, endTime),
        queryFn: () => fetchVehicleHistory(vehicleId!, startTime, endTime),
        enabled: !!vehicleId,
        staleTime: 60 * 1000, // 1 minute
    })
}
