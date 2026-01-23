import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { MaintenanceRecord, MaintenanceRecordInsert, MaintenanceRecordUpdate } from '@/types/database'

const supabase = createClient()

// Query keys factory for cache management
export const maintenanceKeys = {
    all: ['maintenance'] as const,
    lists: () => [...maintenanceKeys.all, 'list'] as const,
    list: (filters?: { vehicleId?: string; status?: string }) =>
        [...maintenanceKeys.lists(), filters] as const,
    details: () => [...maintenanceKeys.all, 'detail'] as const,
    detail: (id: string) => [...maintenanceKeys.details(), id] as const,
    upcoming: () => [...maintenanceKeys.all, 'upcoming'] as const,
    overdue: () => [...maintenanceKeys.all, 'overdue'] as const,
}

// Extended type with vehicle data
export type MaintenanceWithVehicle = MaintenanceRecord & {
    vehicles: {
        id: string
        registration_number: string
        make: string
        model: string
        odometer_reading: number | null
    } | null
}

interface MaintenanceQueryResult {
    data: MaintenanceWithVehicle[]
    count: number | null
}

/**
 * Fetch all maintenance records with vehicle info
 */
async function fetchMaintenance(filters?: { vehicleId?: string; status?: string }): Promise<MaintenanceQueryResult> {
    let query = supabase
        .from('maintenance_records')
        .select(`
            *,
            vehicles (
                id,
                registration_number,
                make,
                model,
                odometer_reading
            )
        `, { count: 'exact' })
        .order('next_service_date', { ascending: true })

    if (filters?.vehicleId) {
        query = query.eq('vehicle_id', filters.vehicleId)
    }
    if (filters?.status) {
        query = query.eq('status', filters.status)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: (data || []) as MaintenanceWithVehicle[], count }
}

/**
 * Fetch single maintenance record
 */
async function fetchMaintenanceById(id: string): Promise<MaintenanceWithVehicle | null> {
    const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
            *,
            vehicles (
                id,
                registration_number,
                make,
                model,
                odometer_reading
            )
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data as MaintenanceWithVehicle
}

/**
 * Fetch upcoming maintenance (within 30 days or 1000km)
 */
async function fetchUpcomingMaintenance(): Promise<MaintenanceWithVehicle[]> {
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
            *,
            vehicles (
                id,
                registration_number,
                make,
                model,
                odometer_reading
            )
        `)
        .neq('status', 'completed')
        .lte('next_service_date', thirtyDaysFromNow.toISOString())
        .order('next_service_date', { ascending: true })

    if (error) throw error
    return (data || []) as MaintenanceWithVehicle[]
}

/**
 * Fetch overdue maintenance
 */
async function fetchOverdueMaintenance(): Promise<MaintenanceWithVehicle[]> {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
            *,
            vehicles (
                id,
                registration_number,
                make,
                model,
                odometer_reading
            )
        `)
        .neq('status', 'completed')
        .lt('next_service_date', today)
        .order('next_service_date', { ascending: true })

    if (error) throw error
    return (data || []) as MaintenanceWithVehicle[]
}

// ==========================================
// QUERY HOOKS
// ==========================================

/**
 * Hook to fetch all maintenance records
 * Uses TanStack Query with 5 minute cache
 */
export function useMaintenance(filters?: { vehicleId?: string; status?: string }) {
    return useQuery({
        queryKey: maintenanceKeys.list(filters),
        queryFn: () => fetchMaintenance(filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}

/**
 * Hook to fetch single maintenance record
 */
export function useMaintenanceRecord(id: string) {
    return useQuery({
        queryKey: maintenanceKeys.detail(id),
        queryFn: () => fetchMaintenanceById(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    })
}

/**
 * Hook to fetch upcoming maintenance (due within 30 days)
 */
export function useUpcomingMaintenance() {
    return useQuery({
        queryKey: maintenanceKeys.upcoming(),
        queryFn: fetchUpcomingMaintenance,
        staleTime: 5 * 60 * 1000,
    })
}

/**
 * Hook to fetch overdue maintenance
 */
export function useOverdueMaintenance() {
    return useQuery({
        queryKey: maintenanceKeys.overdue(),
        queryFn: fetchOverdueMaintenance,
        staleTime: 5 * 60 * 1000,
    })
}

// ==========================================
// MUTATION HOOKS
// ==========================================

/**
 * Hook to create maintenance record
 */
export function useCreateMaintenance() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (record: MaintenanceRecordInsert) => {
            const { data, error } = await supabase
                .from('maintenance_records')
                .insert(record)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() })
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.upcoming() })
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.overdue() })
        },
    })
}

/**
 * Hook to update maintenance record
 */
export function useUpdateMaintenance() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: MaintenanceRecordUpdate }) => {
            const { data, error } = await supabase
                .from('maintenance_records')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() })
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(variables.id) })
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.upcoming() })
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.overdue() })
        },
    })
}

/**
 * Hook to delete maintenance record
 */
export function useDeleteMaintenance() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('maintenance_records')
                .delete()
                .eq('id', id)

            if (error) throw error
            return id
        },
        onMutate: async (id) => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: maintenanceKeys.lists() })
            const previousData = queryClient.getQueryData(maintenanceKeys.lists())
            return { previousData }
        },
        onError: (_, __, context) => {
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueryData(maintenanceKeys.lists(), context.previousData)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() })
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.upcoming() })
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.overdue() })
        },
    })
}

/**
 * Hook to complete maintenance (mark as done)
 */
export function useCompleteMaintenance() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({
            id,
            cost,
            notes,
            nextServiceDate,
            nextServiceOdometer
        }: {
            id: string
            cost?: number
            notes?: string
            nextServiceDate?: string
            nextServiceOdometer?: number
        }) => {
            const updates: MaintenanceRecordUpdate = {
                status: 'completed',
                service_date: new Date().toISOString().split('T')[0],
                cost: cost || null,
                next_service_date: nextServiceDate || null,
                next_service_odometer: nextServiceOdometer || null,
            }

            if (notes) {
                const { data: existing } = await supabase
                    .from('maintenance_records')
                    .select('description')
                    .eq('id', id)
                    .single()

                updates.description = `${existing?.description || ''}\n\nCompleted Notes: ${notes}`
            }

            const { data, error } = await supabase
                .from('maintenance_records')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.lists() })
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.detail(variables.id) })
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.upcoming() })
            queryClient.invalidateQueries({ queryKey: maintenanceKeys.overdue() })
        },
    })
}
