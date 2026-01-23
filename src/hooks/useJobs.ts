import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Job, JobInsert, JobUpdate, Vehicle, Route } from '@/types/database'
import { DriverWithProfile } from './useDrivers'
import { vehicleKeys } from './useVehicles'
import { driverKeys } from './useDrivers'

// Job with all relations
export type JobWithRelations = Job & {
    routes: Route | null
    vehicles: Vehicle | null
    drivers: DriverWithProfile | null
}

// Query keys for cache management
export const jobKeys = {
    all: ['jobs'] as const,
    lists: () => [...jobKeys.all, 'list'] as const,
    list: (filters?: { status?: string; page?: number }) =>
        [...jobKeys.lists(), filters] as const,
    details: () => [...jobKeys.all, 'detail'] as const,
    detail: (id: string) => [...jobKeys.details(), id] as const,
}

const supabase = createClient()

// Fetch all jobs with pagination
async function fetchJobs(page = 1, pageSize = 50): Promise<{
    data: JobWithRelations[]
    count: number
    hasMore: boolean
}> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
        .from('jobs')
        .select(`
            *,
            routes:route_id (*),
            vehicles:vehicle_id (*),
            drivers:driver_id (
                *,
                profiles (*)
            )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

    if (error) throw error

    return {
        data: (data as JobWithRelations[]) || [],
        count: count || 0,
        hasMore: (count || 0) > to + 1,
    }
}

// Fetch single job
async function fetchJob(id: string): Promise<JobWithRelations> {
    const { data, error } = await supabase
        .from('jobs')
        .select(`
            *,
            routes:route_id (*),
            vehicles:vehicle_id (*),
            drivers:driver_id (
                *,
                profiles (*)
            )
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data as JobWithRelations
}

// Create job
async function createJobApi(job: JobInsert): Promise<JobWithRelations> {
    const { data, error } = await supabase
        .from('jobs')
        .insert([job])
        .select(`
            *,
            routes:route_id (*),
            vehicles:vehicle_id (*),
            drivers:driver_id (
                *,
                profiles (*)
            )
        `)
        .single()

    if (error) throw error
    return data as JobWithRelations
}

// Update job
async function updateJobApi({
    id,
    updates,
}: {
    id: string
    updates: JobUpdate
}): Promise<JobWithRelations> {
    const { data, error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', id)
        .select(`
            *,
            routes:route_id (*),
            vehicles:vehicle_id (*),
            drivers:driver_id (
                *,
                profiles (*)
            )
        `)
        .single()

    if (error) throw error
    return data as JobWithRelations
}

// Delete job
async function deleteJobApi(id: string): Promise<void> {
    const { error } = await supabase.from('jobs').delete().eq('id', id)
    if (error) throw error
}

// Assign job (updates job, vehicle, and driver in one operation)
async function assignJobApi({
    jobId,
    vehicleId,
    driverId,
}: {
    jobId: string
    vehicleId: string
    driverId: string
}): Promise<JobWithRelations> {
    // Update job
    const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .update({
            vehicle_id: vehicleId,
            driver_id: driverId,
            status: 'assigned'
        })
        .eq('id', jobId)
        .select(`
            *,
            routes:route_id (*),
            vehicles:vehicle_id (*),
            drivers:driver_id (
                *,
                profiles (*)
            )
        `)
        .single()

    if (jobError) throw jobError

    // Update vehicle status (fire and forget - cache will be invalidated)
    supabase
        .from('vehicles')
        .update({ status: 'in_use', current_driver_id: driverId })
        .eq('id', vehicleId)
        .then()

    // Update driver status (fire and forget - cache will be invalidated)
    supabase
        .from('drivers')
        .update({ status: 'on_trip', assigned_vehicle_id: vehicleId })
        .eq('id', driverId)
        .then()

    return jobData as JobWithRelations
}

// ==================== HOOKS ====================

/**
 * Hook to fetch all jobs with caching
 */
export function useJobs(page = 1, pageSize = 50) {
    return useQuery({
        queryKey: jobKeys.list({ page }),
        queryFn: () => fetchJobs(page, pageSize),
    })
}

/**
 * Hook to fetch a single job by ID
 */
export function useJob(id: string) {
    const queryClient = useQueryClient()

    return useQuery({
        queryKey: jobKeys.detail(id),
        queryFn: () => fetchJob(id),
        initialData: () => {
            const listData = queryClient.getQueryData<{ data: JobWithRelations[] }>(
                jobKeys.list({ page: 1 })
            )
            return listData?.data.find((j) => j.id === id)
        },
    })
}

/**
 * Hook to create a new job
 */
export function useCreateJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createJobApi,
        onSuccess: (newJob) => {
            queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
            queryClient.setQueryData(jobKeys.detail(newJob.id), newJob)
        },
    })
}

/**
 * Hook to update a job
 */
export function useUpdateJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateJobApi,
        onSuccess: (updatedJob) => {
            queryClient.setQueryData(jobKeys.detail(updatedJob.id), updatedJob)
            queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
        },
    })
}

/**
 * Hook to delete a job
 */
export function useDeleteJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteJobApi,
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
        },
    })
}

/**
 * Hook to assign a job to a vehicle and driver
 * Also invalidates vehicle and driver caches
 */
export function useAssignJob() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: assignJobApi,
        onSuccess: (updatedJob) => {
            // Update job caches
            queryClient.setQueryData(jobKeys.detail(updatedJob.id), updatedJob)
            queryClient.invalidateQueries({ queryKey: jobKeys.lists() })

            // Invalidate vehicle and driver caches to reflect status changes
            queryClient.invalidateQueries({ queryKey: vehicleKeys.lists() })
            queryClient.invalidateQueries({ queryKey: driverKeys.lists() })
        },
    })
}
