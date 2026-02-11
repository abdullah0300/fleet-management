import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCompanyId } from './useCurrentUser'
import { Vehicle, VehicleInsert, VehicleUpdate, Profile } from '@/types/database'

// Vehicle with driver profile joined
export type VehicleWithDriver = Vehicle & {
    profiles: Profile | null // via current_driver_id FK
}

// Query keys for cache management
export const vehicleKeys = {
    all: ['vehicles'] as const,
    lists: () => [...vehicleKeys.all, 'list'] as const,
    list: (filters?: { status?: string; page?: number }) =>
        [...vehicleKeys.lists(), filters] as const,
    details: () => [...vehicleKeys.all, 'detail'] as const,
    detail: (id: string) => [...vehicleKeys.details(), id] as const,
}

const supabase = createClient()

// Fetch all vehicles with pagination
async function fetchVehicles(page = 1, pageSize = 50): Promise<{
    data: VehicleWithDriver[]
    count: number
    hasMore: boolean
}> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
        .from('vehicles')
        .select(`
            *,
            profiles:current_driver_id (*)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

    if (error) throw error

    return {
        data: (data as VehicleWithDriver[]) || [],
        count: count || 0,
        hasMore: (count || 0) > to + 1,
    }
}

// Fetch single vehicle
async function fetchVehicle(id: string): Promise<VehicleWithDriver> {
    const { data, error } = await supabase
        .from('vehicles')
        .select(`
            *,
            profiles:current_driver_id (*)
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data as VehicleWithDriver
}

// Create vehicle
async function createVehicleApi(vehicle: VehicleInsert): Promise<VehicleWithDriver> {
    const { data, error } = await supabase
        .from('vehicles')
        .insert([vehicle])
        .select(`
            *,
            profiles:current_driver_id (*)
        `)
        .single()

    if (error) throw error
    return data as VehicleWithDriver
}

// Update vehicle
async function updateVehicleApi({
    id,
    updates,
}: {
    id: string
    updates: VehicleUpdate
}): Promise<VehicleWithDriver> {
    const { data, error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id)
        .select(`
            *,
            profiles:current_driver_id (*)
        `)
        .single()

    if (error) throw error
    return data as VehicleWithDriver
}

// Delete vehicle
async function deleteVehicleApi(id: string): Promise<void> {
    const { error } = await supabase.from('vehicles').delete().eq('id', id)
    if (error) throw error
}

// Bulk create vehicles
async function bulkCreateVehiclesApi(vehicles: VehicleInsert[]): Promise<{
    successful: VehicleWithDriver[]
    failed: { index: number; error: string; data: VehicleInsert }[]
}> {
    const successful: VehicleWithDriver[] = []
    const failed: { index: number; error: string; data: VehicleInsert }[] = []

    // Process in batches of 10 to avoid overwhelming the database
    const batchSize = 10
    for (let i = 0; i < vehicles.length; i += batchSize) {
        const batch = vehicles.slice(i, i + batchSize)

        const { data, error } = await supabase
            .from('vehicles')
            .insert(batch)
            .select(`
                *,
                profiles:current_driver_id (*)
            `)

        if (error) {
            // If batch fails, try individual inserts to identify problematic records
            for (let j = 0; j < batch.length; j++) {
                const vehicle = batch[j]
                const { data: singleData, error: singleError } = await supabase
                    .from('vehicles')
                    .insert([vehicle])
                    .select(`
                        *,
                        profiles:current_driver_id (*)
                    `)
                    .single()

                if (singleError) {
                    failed.push({
                        index: i + j,
                        error: singleError.message,
                        data: vehicle,
                    })
                } else if (singleData) {
                    successful.push(singleData as VehicleWithDriver)
                }
            }
        } else if (data) {
            successful.push(...(data as VehicleWithDriver[]))
        }
    }

    return { successful, failed }
}

// ==================== HOOKS ====================

/**
 * Hook to fetch all vehicles with caching
 * Data is cached for 5 minutes - no refetch on navigation
 */
export function useVehicles(page = 1, pageSize = 50) {
    return useQuery({
        queryKey: vehicleKeys.list({ page }),
        queryFn: () => fetchVehicles(page, pageSize),
    })
}

/**
 * Hook to fetch a single vehicle by ID
 * Uses cached data if available, otherwise fetches
 */
export function useVehicle(id: string) {
    const queryClient = useQueryClient()

    return useQuery({
        queryKey: vehicleKeys.detail(id),
        queryFn: () => fetchVehicle(id),
        // Try to use data from the list cache first
        initialData: () => {
            const listData = queryClient.getQueryData<{
                data: VehicleWithDriver[]
            }>(vehicleKeys.list({ page: 1 }))
            return listData?.data.find((v) => v.id === id)
        },
        // Only set initial data stale time if we found it in cache
        initialDataUpdatedAt: () =>
            queryClient.getQueryState(vehicleKeys.list({ page: 1 }))?.dataUpdatedAt,
    })
}

/**
 * Hook to create a new vehicle
 * Automatically invalidates the list cache after creation
 */
export function useCreateVehicle() {
    const queryClient = useQueryClient()
    const companyId = useCompanyId()

    return useMutation({
        mutationFn: (vehicle: VehicleInsert) => {
            if (!companyId) throw new Error('Company ID is required')
            return createVehicleApi({ ...vehicle, company_id: companyId })
        },
        onSuccess: (newVehicle) => {
            // Invalidate list to refetch
            queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() })
            // Add to detail cache
            queryClient.setQueryData(vehicleKeys.detail(newVehicle.id), newVehicle)
        },
    })
}

/**
 * Hook to update a vehicle
 * Updates both list and detail caches optimistically
 */
export function useUpdateVehicle() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateVehicleApi,
        onSuccess: (updatedVehicle) => {
            // Update detail cache
            queryClient.setQueryData(
                vehicleKeys.detail(updatedVehicle.id),
                updatedVehicle
            )
            // Invalidate list to reflect changes
            queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() })
        },
    })
}

/**
 * Hook to delete a vehicle
 * Removes from cache immediately (optimistic)
 */
export function useDeleteVehicle() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteVehicleApi,
        onMutate: async (id) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: vehicleKeys.lists() })

            // Snapshot the previous value
            const previousVehicles = queryClient.getQueryData(
                vehicleKeys.list({ page: 1 })
            )

            // Optimistically remove from cache
            queryClient.setQueryData<{ data: VehicleWithDriver[]; count: number }>(
                vehicleKeys.list({ page: 1 }),
                (old) => {
                    if (!old) return old
                    return {
                        ...old,
                        data: old.data.filter((v) => v.id !== id),
                        count: old.count - 1,
                    }
                }
            )

            return { previousVehicles }
        },
        onError: (err, id, context) => {
            // Rollback on error
            if (context?.previousVehicles) {
                queryClient.setQueryData(
                    vehicleKeys.list({ page: 1 }),
                    context.previousVehicles
                )
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() })
        },
    })
}

/**
 * Hook to bulk create vehicles from CSV import
 * Returns detailed results with successful and failed records
 */
export function useBulkCreateVehicles() {
    const queryClient = useQueryClient()
    const companyId = useCompanyId()

    return useMutation({
        mutationFn: (vehicles: VehicleInsert[]) => {
            if (!companyId) throw new Error('Company ID is required')
            const vehiclesWithCompany = vehicles.map(v => ({ ...v, company_id: companyId }))
            return bulkCreateVehiclesApi(vehiclesWithCompany)
        },
        onSuccess: (result) => {
            // Invalidate list to refetch all new vehicles
            queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() })
            // Add successful vehicles to detail cache
            result.successful.forEach((vehicle) => {
                queryClient.setQueryData(vehicleKeys.detail(vehicle.id), vehicle)
            })
        },
    })
}
