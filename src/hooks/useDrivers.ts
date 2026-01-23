import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Driver, DriverInsert, DriverUpdate, Profile, Vehicle } from '@/types/database'

// Driver with profile and vehicle data joined
export type DriverWithProfile = Driver & {
    profiles: Profile | null
    vehicles: Vehicle | null // via assigned_vehicle_id FK
}

// Query keys for cache management
export const driverKeys = {
    all: ['drivers'] as const,
    lists: () => [...driverKeys.all, 'list'] as const,
    list: (filters?: { status?: string; page?: number }) =>
        [...driverKeys.lists(), filters] as const,
    details: () => [...driverKeys.all, 'detail'] as const,
    detail: (id: string) => [...driverKeys.details(), id] as const,
}

const supabase = createClient()

// Fetch all drivers with pagination
async function fetchDrivers(page = 1, pageSize = 50): Promise<{
    data: DriverWithProfile[]
    count: number
    hasMore: boolean
}> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
        .from('drivers')
        .select(`
            *,
            profiles (*),
            vehicles:assigned_vehicle_id (*)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

    if (error) throw error

    return {
        data: (data as DriverWithProfile[]) || [],
        count: count || 0,
        hasMore: (count || 0) > to + 1,
    }
}

// Fetch single driver
async function fetchDriver(id: string): Promise<DriverWithProfile> {
    const { data, error } = await supabase
        .from('drivers')
        .select(`
            *,
            profiles (*),
            vehicles:assigned_vehicle_id (*)
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data as DriverWithProfile
}

// Create driver
async function createDriverApi(driver: DriverInsert): Promise<DriverWithProfile> {
    const { data, error } = await supabase
        .from('drivers')
        .insert([driver])
        .select(`
            *,
            profiles (*),
            vehicles:assigned_vehicle_id (*)
        `)
        .single()

    if (error) throw error
    return data as DriverWithProfile
}

// Update driver
async function updateDriverApi({
    id,
    updates,
}: {
    id: string
    updates: DriverUpdate
}): Promise<DriverWithProfile> {
    const { data, error } = await supabase
        .from('drivers')
        .update(updates)
        .eq('id', id)
        .select(`
            *,
            profiles (*),
            vehicles:assigned_vehicle_id (*)
        `)
        .single()

    if (error) throw error
    return data as DriverWithProfile
}

// Delete driver
async function deleteDriverApi(id: string): Promise<void> {
    const { error } = await supabase.from('drivers').delete().eq('id', id)
    if (error) throw error
}

// ==================== HOOKS ====================

/**
 * Hook to fetch all drivers with caching
 * Data is cached for 5 minutes - no refetch on navigation
 */
export function useDrivers(page = 1, pageSize = 50) {
    return useQuery({
        queryKey: driverKeys.list({ page }),
        queryFn: () => fetchDrivers(page, pageSize),
    })
}

/**
 * Hook to fetch a single driver by ID
 * Uses cached data if available, otherwise fetches
 */
export function useDriver(id: string) {
    const queryClient = useQueryClient()

    return useQuery({
        queryKey: driverKeys.detail(id),
        queryFn: () => fetchDriver(id),
        // Try to use data from the list cache first
        initialData: () => {
            const listData = queryClient.getQueryData<{
                data: DriverWithProfile[]
            }>(driverKeys.list({ page: 1 }))
            return listData?.data.find((d) => d.id === id)
        },
        initialDataUpdatedAt: () =>
            queryClient.getQueryState(driverKeys.list({ page: 1 }))?.dataUpdatedAt,
    })
}

/**
 * Hook to create a new driver
 */
export function useCreateDriver() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createDriverApi,
        onSuccess: (newDriver) => {
            queryClient.invalidateQueries({ queryKey: driverKeys.lists() })
            queryClient.setQueryData(driverKeys.detail(newDriver.id), newDriver)
        },
    })
}

/**
 * Hook to update a driver
 */
export function useUpdateDriver() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateDriverApi,
        onSuccess: (updatedDriver) => {
            queryClient.setQueryData(
                driverKeys.detail(updatedDriver.id),
                updatedDriver
            )
            queryClient.invalidateQueries({ queryKey: driverKeys.lists() })
        },
    })
}

/**
 * Hook to delete a driver
 */
export function useDeleteDriver() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteDriverApi,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: driverKeys.lists() })

            const previousDrivers = queryClient.getQueryData(
                driverKeys.list({ page: 1 })
            )

            queryClient.setQueryData<{ data: DriverWithProfile[]; count: number }>(
                driverKeys.list({ page: 1 }),
                (old) => {
                    if (!old) return old
                    return {
                        ...old,
                        data: old.data.filter((d) => d.id !== id),
                        count: old.count - 1,
                    }
                }
            )

            return { previousDrivers }
        },
        onError: (err, id, context) => {
            if (context?.previousDrivers) {
                queryClient.setQueryData(
                    driverKeys.list({ page: 1 }),
                    context.previousDrivers
                )
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: driverKeys.lists() })
        },
    })
}
