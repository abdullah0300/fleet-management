import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Trip, TripInsert, TripUpdate } from '@/types/database'

const supabase = createClient()

// Query keys factory
export const tripKeys = {
    all: ['trips'] as const,
    lists: () => [...tripKeys.all, 'list'] as const,
    list: (filters?: { jobId?: string; driverId?: string; vehicleId?: string; status?: string }) =>
        [...tripKeys.lists(), filters] as const,
    details: () => [...tripKeys.all, 'detail'] as const,
    detail: (id: string) => [...tripKeys.details(), id] as const,
    active: () => [...tripKeys.all, 'active'] as const,
}

// Extended type with relations
export type TripWithRelations = Trip & {
    jobs?: { job_number: string; customer_name: string } | null
    vehicles?: { registration_number: string; make: string; model: string } | null
    drivers?: { profiles: { full_name: string } | null } | null
}

/**
 * Fetch all trips with optional filters
 */
async function fetchTrips(filters?: { jobId?: string; driverId?: string; vehicleId?: string; status?: string }): Promise<TripWithRelations[]> {
    let query = supabase
        .from('trips')
        .select(`
            *,
            jobs (job_number, customer_name),
            vehicles (registration_number, make, model),
            drivers (profiles (full_name))
        `)
        .order('start_time', { ascending: false })

    if (filters?.jobId) query = query.eq('job_id', filters.jobId)
    if (filters?.driverId) query = query.eq('driver_id', filters.driverId)
    if (filters?.vehicleId) query = query.eq('vehicle_id', filters.vehicleId)
    if (filters?.status) query = query.eq('status', filters.status)

    const { data, error } = await query
    if (error) throw error
    return (data || []) as TripWithRelations[]
}

/**
 * Fetch single trip
 */
async function fetchTripById(id: string): Promise<TripWithRelations | null> {
    const { data, error } = await supabase
        .from('trips')
        .select(`
            *,
            jobs (job_number, customer_name),
            vehicles (registration_number, make, model),
            drivers (profiles (full_name))
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data as TripWithRelations
}

/**
 * Fetch active trips (started but not completed)
 */
async function fetchActiveTrips(): Promise<TripWithRelations[]> {
    const { data, error } = await supabase
        .from('trips')
        .select(`
            *,
            jobs (job_number, customer_name),
            vehicles (registration_number, make, model),
            drivers (profiles (full_name))
        `)
        .eq('status', 'started')
        .order('start_time', { ascending: false })

    if (error) throw error
    return (data || []) as TripWithRelations[]
}

// ==========================================
// QUERY HOOKS
// ==========================================

/**
 * Hook to fetch all trips
 */
export function useTrips(filters?: { jobId?: string; driverId?: string; vehicleId?: string; status?: string }) {
    return useQuery({
        queryKey: tripKeys.list(filters),
        queryFn: () => fetchTrips(filters),
        staleTime: 5 * 60 * 1000,
    })
}

/**
 * Hook to fetch single trip
 */
export function useTrip(id: string) {
    return useQuery({
        queryKey: tripKeys.detail(id),
        queryFn: () => fetchTripById(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    })
}

/**
 * Hook to fetch active trips
 */
export function useActiveTrips() {
    return useQuery({
        queryKey: tripKeys.active(),
        queryFn: fetchActiveTrips,
        staleTime: 1 * 60 * 1000, // Refresh more often for active trips
    })
}

// ==========================================
// MUTATION HOOKS
// ==========================================

/**
 * Hook to start a trip (create trip record)
 */
export function useStartTrip() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (data: { jobId: string; driverId: string; vehicleId: string; startOdometer?: number }) => {
            // Create trip record
            const tripData: TripInsert = {
                job_id: data.jobId,
                driver_id: data.driverId,
                vehicle_id: data.vehicleId,
                start_time: new Date().toISOString(),
                start_odometer: data.startOdometer || null,
                status: 'started',
            }

            const { data: trip, error: tripError } = await supabase
                .from('trips')
                .insert(tripData)
                .select()
                .single()

            if (tripError) throw tripError

            // Update job status
            await supabase
                .from('jobs')
                .update({ status: 'in_progress' })
                .eq('id', data.jobId)

            // Update vehicle status
            await supabase
                .from('vehicles')
                .update({ status: 'in_use' })
                .eq('id', data.vehicleId)

            // Update driver status
            await supabase
                .from('drivers')
                .update({ status: 'on_trip' })
                .eq('id', data.driverId)

            return trip
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tripKeys.lists() })
            queryClient.invalidateQueries({ queryKey: tripKeys.active() })
            queryClient.invalidateQueries({ queryKey: ['jobs'] })
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            queryClient.invalidateQueries({ queryKey: ['drivers'] })
        },
    })
}

/**
 * Hook to complete a trip
 */
export function useCompleteTrip() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (data: {
            tripId: string
            jobId: string
            driverId: string
            vehicleId: string
            endOdometer?: number
            actualFuelCost?: number
            actualTollCost?: number
        }) => {
            // Calculate distance if odometer provided
            const { data: trip } = await supabase
                .from('trips')
                .select('start_odometer')
                .eq('id', data.tripId)
                .single()

            const actualDistance = data.endOdometer && trip?.start_odometer
                ? data.endOdometer - trip.start_odometer
                : null

            // Update trip
            const { error: tripError } = await supabase
                .from('trips')
                .update({
                    end_time: new Date().toISOString(),
                    end_odometer: data.endOdometer || null,
                    actual_distance_km: actualDistance,
                    actual_fuel_cost: data.actualFuelCost || null,
                    actual_toll_cost: data.actualTollCost || null,
                    status: 'completed',
                })
                .eq('id', data.tripId)

            if (tripError) throw tripError

            // Update job status
            await supabase
                .from('jobs')
                .update({ status: 'completed' })
                .eq('id', data.jobId)

            // Update vehicle status
            await supabase
                .from('vehicles')
                .update({ status: 'available' })
                .eq('id', data.vehicleId)

            // Update driver status
            await supabase
                .from('drivers')
                .update({ status: 'available' })
                .eq('id', data.driverId)

            return data.tripId
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: tripKeys.lists() })
            queryClient.invalidateQueries({ queryKey: tripKeys.detail(variables.tripId) })
            queryClient.invalidateQueries({ queryKey: tripKeys.active() })
            queryClient.invalidateQueries({ queryKey: ['jobs'] })
            queryClient.invalidateQueries({ queryKey: ['vehicles'] })
            queryClient.invalidateQueries({ queryKey: ['drivers'] })
        },
    })
}

/**
 * Hook to update trip (for GPS tracking, etc.)
 */
export function useUpdateTrip() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: TripUpdate }) => {
            const { data, error } = await supabase
                .from('trips')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: tripKeys.detail(variables.id) })
        },
    })
}
