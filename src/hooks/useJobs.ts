import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCompanyId } from './useCurrentUser'
import { Job, JobInsert, JobUpdate, JobStop, JobStopInsert, JobWithStops, Vehicle, Route } from '@/types/database'
import { DriverWithProfile } from './useDrivers'
import { vehicleKeys } from './useVehicles'
import { driverKeys } from './useDrivers'

// ============================================
// EXTENDED TYPES
// ============================================

// Job with all relations including stops
export type JobWithRelations = JobWithStops & {
    routes: Route | null
    vehicles: Vehicle | null
    drivers: DriverWithProfile | null
    manifests?: { id: string; manifest_number: string | null; status: string | null } | null
}

// ============================================
// HELPER FUNCTIONS (DRY - Use across all components)
// ============================================

/**
 * Get the first pickup address from a job's stops
 * Prefers location_name for display, falls back to full address
 */
export function getJobPickupAddress(job: { job_stops?: JobStop[] } | null | undefined): string {
    if (!job?.job_stops?.length) return 'No pickup address'
    const pickup = job.job_stops
        .filter(s => s.type === 'pickup')
        .sort((a, b) => a.sequence_order - b.sequence_order)[0]
    return pickup?.location_name || pickup?.address || job.job_stops[0]?.address || 'No pickup address'
}

/**
 * Get the last dropoff address from a job's stops
 * Prefers location_name for display, falls back to full address
 */
export function getJobDeliveryAddress(job: { job_stops?: JobStop[] } | null | undefined): string {
    if (!job?.job_stops?.length) return 'No delivery address'
    const dropoffs = job.job_stops
        .filter(s => s.type === 'dropoff')
        .sort((a, b) => b.sequence_order - a.sequence_order)
    const lastDropoff = dropoffs[0] || job.job_stops[job.job_stops.length - 1]
    return lastDropoff?.location_name || lastDropoff?.address || 'No delivery address'
}

/**
 * Get all stops formatted for map rendering
 */
export function getJobMapPoints(job: { job_stops?: JobStop[] } | null | undefined): Array<{
    lat: number
    lng: number
    type: 'pickup' | 'dropoff' | 'waypoint'
    address: string
    sequence: number
}> {
    if (!job?.job_stops?.length) return []
    return job.job_stops
        .filter(s => s.latitude && s.longitude)
        .sort((a, b) => a.sequence_order - b.sequence_order)
        .map(s => ({
            lat: s.latitude!,
            lng: s.longitude!,
            type: s.type,
            address: s.address,
            sequence: s.sequence_order
        }))
}

/**
 * Get total stop count for a job
 */
export function getJobStopCount(job: { job_stops?: JobStop[] } | null | undefined): number {
    return job?.job_stops?.length || 0
}

// ============================================
// QUERY KEYS
// ============================================

export const jobKeys = {
    all: ['jobs'] as const,
    lists: () => [...jobKeys.all, 'list'] as const,
    list: (filters?: { status?: string; page?: number }) =>
        [...jobKeys.lists(), filters] as const,
    details: () => [...jobKeys.all, 'detail'] as const,
    detail: (id: string) => [...jobKeys.details(), id] as const,
}

const supabase = createClient()

// ============================================
// API FUNCTIONS
// ============================================

// Fetch all jobs with pagination (includes stops)
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
            job_stops (*),
            routes:route_id (*),
            vehicles:vehicle_id (*, profiles:current_driver_id(full_name)),
            manifests:manifest_id (id, manifest_number, status),
            drivers:driver_id (
                *,
                profiles (*)
            )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

    if (error) throw error

    // Sort job_stops by sequence_order for each job
    const jobsWithSortedStops = (data || []).map(job => ({
        ...job,
        job_stops: (job.job_stops || []).sort((a: JobStop, b: JobStop) =>
            a.sequence_order - b.sequence_order
        )
    }))

    return {
        data: jobsWithSortedStops as JobWithRelations[],
        count: count || 0,
        hasMore: (count || 0) > to + 1,
    }
}

/**
 * Fetch jobs for a specific driver
 */
async function fetchDriverJobs(driverId: string, limit = 10): Promise<JobWithRelations[]> {
    const { data, error } = await supabase
        .from('jobs')
        .select(`
            *,
            job_stops (*),
            routes:route_id (*),
            vehicles:vehicle_id (*),
            manifests:manifest_id (id, manifest_number, status),
            drivers:driver_id (
                *,
                profiles (*)
            )
        `)
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) throw error

    // Sort job_stops by sequence_order for each job
    const jobsWithSortedStops = (data || []).map(job => ({
        ...job,
        job_stops: (job.job_stops || []).sort((a: JobStop, b: JobStop) =>
            a.sequence_order - b.sequence_order
        )
    }))

    return jobsWithSortedStops as JobWithRelations[]
}

/**
 * Hook to fetch jobs for a specific driver
 */
export function useDriverJobs(driverId: string, limit = 10) {
    return useQuery({
        queryKey: [...jobKeys.all, 'driver', driverId, { limit }] as const,
        queryFn: () => fetchDriverJobs(driverId, limit),
        enabled: !!driverId,
    })
}

// Fetch single job (includes stops)
async function fetchJob(id: string): Promise<JobWithRelations> {
    const { data, error } = await supabase
        .from('jobs')
        .select(`
            *,
            job_stops (*),
            routes:route_id (*),
            vehicles:vehicle_id (*, profiles:current_driver_id(full_name)),
            manifests:manifest_id (id, manifest_number, status),
            drivers:driver_id (
                *,
                profiles (*)
            )
        `)
        .eq('id', id)
        .single()

    if (error) throw error

    // Sort stops by sequence
    const jobWithSortedStops = {
        ...data,
        job_stops: (data.job_stops || []).sort((a: JobStop, b: JobStop) =>
            a.sequence_order - b.sequence_order
        )
    }

    return jobWithSortedStops as JobWithRelations
}

// Input type for creating job with stops
export interface CreateJobWithStopsInput {
    job: JobInsert
    stops: Omit<JobStopInsert, 'job_id'>[]
}

// Create job with stops (single transaction pattern)
async function createJobWithStopsApi(input: CreateJobWithStopsInput): Promise<JobWithRelations> {
    // 1. Insert the job first
    const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .insert([input.job])
        .select('*')
        .single()

    if (jobError) throw jobError

    // 2. Insert all stops with the new job_id
    if (input.stops.length > 0) {
        const stopsWithJobId: JobStopInsert[] = input.stops.map((stop, index) => ({
            ...stop,
            job_id: jobData.id,
            sequence_order: stop.sequence_order ?? index + 1,
            arrival_mode: stop.arrival_mode,  // Explicitly map new fields
            scheduled_arrival: stop.scheduled_arrival,
            window_start: stop.window_start,
            window_end: stop.window_end,
            service_duration: stop.service_duration
        }))

        const { error: stopsError } = await supabase
            .from('job_stops')
            .insert(stopsWithJobId)

        if (stopsError) throw stopsError
    }

    // 3. Fetch the complete job with all relations
    return fetchJob(jobData.id)
}

// Update job with stops (transaction pattern)
export async function updateJobWithStopsApi(input: {
    id: string
    job: JobUpdate
    stops: Omit<JobStopInsert, 'job_id'>[]
}): Promise<JobWithRelations> {
    const { id, job, stops } = input

    // 1. Update the job details
    const { error: jobError } = await supabase
        .from('jobs')
        .update(job)
        .eq('id', id)

    if (jobError) throw jobError

    // 2. Handle stops synchronization
    // Strategy: Delete all existing stops and re-insert them
    // This is safer/easier than diffing since we have the complete new state
    // and stop IDs might change or be re-ordered.
    // Ideally we would upsert, but re-creating ensures sequence is perfect.

    // First, delete existing stops
    const { error: deleteError } = await supabase
        .from('job_stops')
        .delete()
        .eq('job_id', id)

    if (deleteError) throw deleteError

    // Then insert new stops
    if (stops.length > 0) {
        const stopsWithJobId: JobStopInsert[] = stops.map((stop, index) => ({
            ...stop,
            job_id: id,
            sequence_order: index + 1,
            // Ensure all fields are mapped correctly
            arrival_mode: stop.arrival_mode,
            scheduled_arrival: stop.scheduled_arrival,
            window_start: stop.window_start,
            window_end: stop.window_end,
            service_duration: stop.service_duration
        }))

        const { error: stopsError } = await supabase
            .from('job_stops')
            .insert(stopsWithJobId)

        if (stopsError) throw stopsError
    }

    // 3. Fetch the complete job with all relations
    return fetchJob(id)
}



// Legacy create job (for backward compatibility)
async function createJobApi(job: JobInsert): Promise<JobWithRelations> {
    const { data, error } = await supabase
        .from('jobs')
        .insert([job])
        .select(`
            *,
            job_stops (*),
            routes:route_id (*),
            vehicles:vehicle_id (*),
            manifests:manifest_id (id, manifest_number, status),
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
            job_stops (*),
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

// Delete job (stops are cascade deleted via FK)
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
            job_stops (*),
            routes:route_id (*),
            vehicles:vehicle_id (*),
            drivers:driver_id (
                *,
                profiles (*)
            )
        `)
        .single()

    if (jobError) throw jobError

    // Sync to Manifest if applicable (Reverse Sync: Job -> Manifest)
    if (jobData.manifest_id) {
        const { error: manifestError } = await supabase
            .from('manifests')
            .update({
                driver_id: driverId,
                vehicle_id: vehicleId,
                // We don't automatically change status to 'scheduled' or 'in_transit' 
                // to avoid overriding specific manifest flows, but driver/vehicle must sync.
            })
            .eq('id', jobData.manifest_id)

        if (manifestError) {
            console.error('Failed to sync job assignment to manifest:', manifestError)
        }
    }

    // Update vehicle and driver status with proper error handling
    const [vehicleResult, driverResult] = await Promise.all([
        supabase
            .from('vehicles')
            .update({ status: 'in_use', current_driver_id: driverId })
            .eq('id', vehicleId),
        supabase
            .from('drivers')
            .update({ status: 'on_trip', assigned_vehicle_id: vehicleId })
            .eq('id', driverId)
    ])

    // Log errors but don't fail the entire operation - job assignment succeeded
    if (vehicleResult.error) {
        console.error('Failed to update vehicle status:', vehicleResult.error)
    }
    if (driverResult.error) {
        console.error('Failed to update driver status:', driverResult.error)
    }

    return jobData as JobWithRelations
}

// ============================================
// HOOKS
// ============================================

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
 * Hook to create a new job with stops
 */
export function useCreateJobWithStops() {
    const queryClient = useQueryClient()
    const companyId = useCompanyId()

    return useMutation({
        mutationFn: (input: CreateJobWithStopsInput) => {
            if (!companyId) throw new Error('Company ID is required')
            return createJobWithStopsApi({
                ...input,
                job: { ...input.job, company_id: companyId }
            })
        },
        onSuccess: (newJob) => {
            queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
            queryClient.setQueryData(jobKeys.detail(newJob.id), newJob)
        },
    })
}

/**
 * Hook to update a job with stops
 */
export function useUpdateJobWithStops() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateJobWithStopsApi,
        onSuccess: (updatedJob) => {
            queryClient.setQueryData(jobKeys.detail(updatedJob.id), updatedJob)
            queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
        },
    })
}

/**
 * Hook to create a new job (legacy - no stops)
 */
export function useCreateJob() {
    const queryClient = useQueryClient()
    const companyId = useCompanyId()

    return useMutation({
        mutationFn: (job: JobInsert) => {
            if (!companyId) throw new Error('Company ID is required')
            return createJobApi({ ...job, company_id: companyId })
        },
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

            // Invalidate manifests if the job belonged to one
            if (updatedJob.manifest_id) {
                queryClient.invalidateQueries({ queryKey: ['manifests'] })
            }
        },
    })
}

// Update a specific job stop
async function updateJobStopApi({
    id,
    updates,
}: {
    id: string
    updates: Partial<JobStop>
}): Promise<void> {
    const { error } = await supabase
        .from('job_stops')
        .update(updates)
        .eq('id', id)

    if (error) throw error
}

/**
 * Hook to update a job stop
 */
export function useUpdateJobStop() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateJobStopApi,
        onSuccess: () => {
            // Invalidate job lists to refresh the parent job and its stops
            queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
        },
    })
}
