'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
    CostEstimate,
    CostEstimateInsert,
    CostEstimateUpdate,
    CostEstimateWithRelations,
    Vehicle,
    Driver
} from '@/types/database'

const supabase = createClient()

// ==================== QUERY KEYS ====================
export const costKeys = {
    all: ['costEstimates'] as const,
    lists: () => [...costKeys.all, 'list'] as const,
    list: (filters: { jobId?: string; vehicleId?: string; status?: string }) =>
        [...costKeys.lists(), filters] as const,
    details: () => [...costKeys.all, 'detail'] as const,
    detail: (id: string) => [...costKeys.details(), id] as const,
    forJob: (jobId: string) => [...costKeys.all, 'job', jobId] as const,
}

// ==================== FETCH FUNCTIONS ====================

/**
 * Fetch all cost estimates with optional filters
 */
async function fetchCostEstimates(filters?: {
    jobId?: string
    vehicleId?: string
    driverId?: string
    status?: string
    limit?: number
}): Promise<CostEstimateWithRelations[]> {
    let query = supabase
        .from('cost_estimates')
        .select(`
            *,
            jobs:job_id (*),
            vehicles:vehicle_id (*),
            drivers:driver_id (
                *,
                profiles (*)
            )
        `)
        .order('created_at', { ascending: false })

    if (filters?.jobId) {
        query = query.eq('job_id', filters.jobId)
    }
    if (filters?.vehicleId) {
        query = query.eq('vehicle_id', filters.vehicleId)
    }
    if (filters?.driverId) {
        query = query.eq('driver_id', filters.driverId)
    }
    if (filters?.status) {
        query = query.eq('status', filters.status)
    }
    if (filters?.limit) {
        query = query.limit(filters.limit)
    }

    const { data, error } = await query

    if (error) throw error
    return data as CostEstimateWithRelations[]
}

/**
 * Fetch a single cost estimate by ID
 */
async function fetchCostEstimate(id: string): Promise<CostEstimateWithRelations> {
    const { data, error } = await supabase
        .from('cost_estimates')
        .select(`
            *,
            jobs:job_id (*),
            vehicles:vehicle_id (*),
            drivers:driver_id (
                *,
                profiles (*)
            )
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    return data as CostEstimateWithRelations
}

/**
 * Fetch cost estimates for a specific job
 */
async function fetchCostEstimatesForJob(jobId: string): Promise<CostEstimateWithRelations[]> {
    const { data, error } = await supabase
        .from('cost_estimates')
        .select(`
            *,
            jobs:job_id (*),
            vehicles:vehicle_id (*),
            drivers:driver_id (
                *,
                profiles (*)
            )
        `)
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data as CostEstimateWithRelations[]
}

/**
 * Create a new cost estimate
 */
async function createCostEstimate(data: CostEstimateInsert): Promise<CostEstimate> {
    // Get current user for created_by
    const { data: { user } } = await supabase.auth.getUser()

    const { data: result, error } = await supabase
        .from('cost_estimates')
        .insert({ ...data, created_by: user?.id })
        .select()
        .single()

    if (error) throw error
    return result as CostEstimate
}

/**
 * Update a cost estimate
 */
async function updateCostEstimate(id: string, updates: CostEstimateUpdate): Promise<CostEstimate> {
    const { data, error } = await supabase
        .from('cost_estimates')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as CostEstimate
}

/**
 * Delete a cost estimate
 */
async function deleteCostEstimate(id: string): Promise<void> {
    const { error } = await supabase
        .from('cost_estimates')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ==================== HOOKS ====================

/**
 * Hook to fetch all cost estimates with optional filters
 */
export function useCostEstimates(filters?: {
    jobId?: string
    vehicleId?: string
    driverId?: string
    status?: string
    limit?: number
}) {
    return useQuery({
        queryKey: costKeys.list(filters || {}),
        queryFn: () => fetchCostEstimates(filters),
    })
}

/**
 * Hook to fetch a single cost estimate by ID
 */
export function useCostEstimate(id: string) {
    return useQuery({
        queryKey: costKeys.detail(id),
        queryFn: () => fetchCostEstimate(id),
        enabled: !!id,
    })
}

/**
 * Hook to fetch cost estimates for a specific job
 */
export function useCostEstimatesForJob(jobId: string) {
    return useQuery({
        queryKey: costKeys.forJob(jobId),
        queryFn: () => fetchCostEstimatesForJob(jobId),
        enabled: !!jobId,
    })
}

/**
 * Hook to create a new cost estimate
 */
export function useCreateCostEstimate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: createCostEstimate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: costKeys.all })
        },
    })
}

/**
 * Hook to update a cost estimate
 */
export function useUpdateCostEstimate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: CostEstimateUpdate }) =>
            updateCostEstimate(id, updates),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: costKeys.detail(id) })
            queryClient.invalidateQueries({ queryKey: costKeys.lists() })
        },
    })
}

/**
 * Hook to delete a cost estimate
 */
export function useDeleteCostEstimate() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteCostEstimate,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: costKeys.all })
        },
    })
}

// ==================== HELPER HOOKS ====================

/**
 * Calculate cost from inputs (utility function)
 */
export function calculateCosts(input: {
    distance: number
    fuelEfficiency: number // mpg or km/l
    fuelPrice: number // $/gal or $/l
    tollCost: number
    driverPaymentType: 'per_mile' | 'per_trip' | 'hourly' | 'salary'
    driverRate: number
    tripDurationMinutes?: number
}) {
    // Calculate fuel cost
    const fuelCost = input.fuelEfficiency > 0
        ? (input.distance / input.fuelEfficiency) * input.fuelPrice
        : 0

    // Calculate driver cost
    let driverCost = 0
    switch (input.driverPaymentType) {
        case 'per_mile': // Treated as "per distance unit"
            driverCost = input.distance * input.driverRate
            break
        case 'per_trip':
            driverCost = input.driverRate
            break
        case 'hourly':
            driverCost = ((input.tripDurationMinutes || 0) / 60) * input.driverRate
            break
        case 'salary':
            driverCost = 0 // Salary is fixed, not calculated per trip
            break
    }

    const totalCost = fuelCost + input.tollCost + driverCost

    return {
        fuelCost,
        driverCost,
        totalCost,
    }
}

/**
 * Hook to fetch vehicles for cost estimation
 */
export function useVehiclesForCost() {
    return useQuery({
        queryKey: ['vehicles', 'forCost'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('vehicles')
                .select('id, registration_number, make, model, fuel_efficiency')
                .order('registration_number')
            if (error) throw error
            return data as Pick<Vehicle, 'id' | 'registration_number' | 'make' | 'model' | 'fuel_efficiency'>[]
        },
    })
}

/**
 * Hook to fetch drivers for cost estimation
 */
export function useDriversForCost() {
    return useQuery({
        queryKey: ['drivers', 'forCost'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('drivers')
                .select(`
                    id, 
                    payment_type, 
                    rate_amount,
                    profiles (full_name)
                `)
                .order('created_at')
            if (error) throw error

            // Supabase sometimes returns relation as array even if 1:1
            return (data || []).map((d: any) => ({
                id: d.id,
                payment_type: d.payment_type,
                rate_amount: d.rate_amount,
                profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
            })) as (Pick<Driver, 'id' | 'payment_type' | 'rate_amount'> & { profiles: { full_name: string } | null })[]
        },
    })
}

/**
 * Hook to fetch jobs for cost estimation
 */
export function useJobsForCost() {
    return useQuery({
        queryKey: ['jobs', 'forCost'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('jobs')
                .select('id, job_number, customer_name, status')
                .in('status', ['pending', 'assigned', 'in_progress'])
                .order('scheduled_date', { ascending: false })
            if (error) throw error
            return data
        },
    })
}

// ==================== COST SUMMARY HOOKS ====================

/**
 * Fetch cost summary statistics
 */
export function useCostSummary(period?: 'week' | 'month' | 'year') {
    return useQuery({
        queryKey: ['costSummary', period],
        queryFn: async () => {
            let query = supabase
                .from('cost_estimates')
                .select('fuel_cost, toll_cost, driver_cost, other_costs, total_cost, created_at')
                .eq('status', 'final')

            // Add date filter based on period
            if (period) {
                const now = new Date()
                let startDate: Date
                switch (period) {
                    case 'week':
                        startDate = new Date(now.setDate(now.getDate() - 7))
                        break
                    case 'month':
                        startDate = new Date(now.setMonth(now.getMonth() - 1))
                        break
                    case 'year':
                        startDate = new Date(now.setFullYear(now.getFullYear() - 1))
                        break
                }
                query = query.gte('created_at', startDate.toISOString())
            }

            const { data, error } = await query
            if (error) throw error

            // Calculate totals
            const totals = (data || []).reduce(
                (acc, cost) => ({
                    fuelCost: acc.fuelCost + (cost.fuel_cost || 0),
                    tollCost: acc.tollCost + (cost.toll_cost || 0),
                    driverCost: acc.driverCost + (cost.driver_cost || 0),
                    otherCosts: acc.otherCosts + (cost.other_costs || 0),
                    totalCost: acc.totalCost + (cost.total_cost || 0),
                    count: acc.count + 1,
                }),
                { fuelCost: 0, tollCost: 0, driverCost: 0, otherCosts: 0, totalCost: 0, count: 0 }
            )

            return totals
        },
    })
}
