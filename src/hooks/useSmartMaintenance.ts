import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { VehicleServiceProgram, ServiceProgram } from '@/types/maintenance_extensions'

const supabase = createClient()

// Query Keys
export const smartMaintenanceKeys = {
    all: ['smart-maintenance'] as const,
    programs: () => [...smartMaintenanceKeys.all, 'programs'] as const,
    vehicleStatus: (vehicleId: string) => [...smartMaintenanceKeys.all, 'vehicle', vehicleId] as const,
}

// 1. Fetch All Available Service Programs (Standard Templates)
export function useServicePrograms() {
    return useQuery({
        queryKey: smartMaintenanceKeys.programs(),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('service_programs')
                .select('*')
                .order('name')

            if (error) throw error
            return data as ServiceProgram[]
        }
    })
}

// 2. Fetch Status for a specific Vehicle
export function useVehicleMaintenanceStatus(vehicleId: string) {
    return useQuery({
        queryKey: smartMaintenanceKeys.vehicleStatus(vehicleId),
        queryFn: async () => {
            // We join with service_programs to get details like "interval_miles"
            const { data, error } = await supabase
                .from('vehicle_service_programs')
                .select(`
                    *,
                    service_programs (
                        name,
                        interval_miles,
                        interval_months
                    )
                `)
                .eq('vehicle_id', vehicleId)

            if (error) throw error
            return data as (VehicleServiceProgram & { service_programs: ServiceProgram })[]
        },
        enabled: !!vehicleId
    })
}

// 3. Assign a Program to a Vehicle
export function useAssignServiceProgram() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ vehicleId, programId, currentOdometer }: { vehicleId: string, programId: string, currentOdometer: number }) => {
            // Default to "Fresh" status
            const { data, error } = await supabase
                .from('vehicle_service_programs')
                .insert({
                    vehicle_id: vehicleId,
                    program_id: programId,
                    last_service_odometer: currentOdometer,
                    last_service_date: new Date().toISOString().split('T')[0],
                    status: 'ok'
                })
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: smartMaintenanceKeys.vehicleStatus(variables.vehicleId) })
        }
    })
}
