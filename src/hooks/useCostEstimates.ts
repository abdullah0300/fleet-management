import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { CostEstimate, CostEstimateInsert, CostEstimateUpdate, JobPayAdjustment, JobPayAdjustmentInsert, JobPayAdjustmentUpdate } from '@/types/database'

const supabase = createClient()

export const costKeys = {
    all: ['cost_estimates'] as const,
    job: (jobId: string) => [...costKeys.all, 'job', jobId] as const,
    adjustments: (jobId: string) => ['job_pay_adjustments', jobId] as const,
}

// ------------------------------------------------------------------
// Cost Estimates (The main calculation record)
// ------------------------------------------------------------------

export function useJobCostEstimate(jobId: string) {
    return useQuery({
        queryKey: costKeys.job(jobId),
        queryFn: async () => {
            if (!jobId) return null
            const { data, error } = await supabase
                .from('cost_estimates')
                .select('*')
                .eq('job_id', jobId)
                .maybeSingle()
            if (error) throw error
            return data as CostEstimate | null
        },
        enabled: !!jobId
    })
}

export function useSaveCostEstimate() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (estimate: CostEstimateInsert | (CostEstimateUpdate & { id: string })) => {
            if ('id' in estimate && estimate.id) {
                // Update
                const { id, ...updates } = estimate as CostEstimateUpdate & { id: string }
                const { data, error } = await supabase
                    .from('cost_estimates')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single()
                if (error) throw error
                return data
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('cost_estimates')
                    .insert(estimate as CostEstimateInsert)
                    .select()
                    .single()
                if (error) throw error
                return data
            }
        },
        onSuccess: (data) => {
            if (data?.job_id) {
                queryClient.invalidateQueries({ queryKey: costKeys.job(data.job_id) })
            }
            queryClient.invalidateQueries({ queryKey: costKeys.all })
        }
    })
}

// ------------------------------------------------------------------
// Job Pay Adjustments (Overrides, bonuses, detention, etc.)
// ------------------------------------------------------------------

export function useJobPayAdjustments(jobId: string) {
    return useQuery({
        queryKey: costKeys.adjustments(jobId),
        queryFn: async () => {
            if (!jobId) return []
            const { data, error } = await supabase
                .from('job_pay_adjustments')
                .select('*')
                .eq('job_id', jobId)
                .order('created_at', { ascending: true })
            if (error) throw error
            return data as JobPayAdjustment[]
        },
        enabled: !!jobId
    })
}

export function useSavePayAdjustment() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (adjustment: JobPayAdjustmentInsert | (JobPayAdjustmentUpdate & { id: string })) => {
            if ('id' in adjustment && adjustment.id) {
                // Update
                const { id, ...updates } = adjustment as JobPayAdjustmentUpdate & { id: string }
                const { data, error } = await supabase
                    .from('job_pay_adjustments')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single()
                if (error) throw error
                return data
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('job_pay_adjustments')
                    .insert(adjustment as JobPayAdjustmentInsert)
                    .select()
                    .single()
                if (error) throw error
                return data
            }
        },
        onSuccess: (data) => {
            if (data?.job_id) {
                queryClient.invalidateQueries({ queryKey: costKeys.adjustments(data.job_id) })
                queryClient.invalidateQueries({ queryKey: costKeys.job(data.job_id) }) // Total might change
            }
        }
    })
}

export function useDeletePayAdjustment() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id }: { id: string }) => {
            const { data, error } = await supabase
                .from('job_pay_adjustments')
                .delete()
                .eq('id', id)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: (data) => {
            if (data?.job_id) {
                queryClient.invalidateQueries({ queryKey: costKeys.adjustments(data.job_id) })
                queryClient.invalidateQueries({ queryKey: costKeys.job(data.job_id) })
            }
        }
    })
}

// ------------------------------------------------------------------
// Calculation Helper
// ------------------------------------------------------------------

export function calculateJobCosts(
    job: any,
    vehicle: any | null,
    driver: any | null,
    route: any | null,
    distanceKm: number,
    tripDurationMinutes: number = 0
): CostEstimateInsert {
    // 1. Fuel Cost
    // We assume vehicle.fuel_efficiency is in km/L or MPG. 
    // This is a rough estimation based on the inputs available.
    let fuelCost = 0
    let fuelPrice = route?.fuel_price_per_liter || 1.10 // Default $1.10/Liter if no route
    let efficiency = vehicle?.fuel_efficiency || 10 // default 10

    // Simplistic formula assuming efficiency is km per unit and price is per unit
    fuelCost = (distanceKm / efficiency) * fuelPrice

    // 2. Driver Cost
    let driverCost = 0
    let paymentType = driver?.payment_type || 'per_mile'
    let rateAmount = driver?.rate_amount || 0

    // Override from job
    if (job?.driver_pay_rate_override) {
        rateAmount = job.driver_pay_rate_override
    }

    switch (paymentType) {
        case 'per_mile':
            // Convert km to miles for per_mile pay usually (distance_km * 0.621371)
            const distanceMiles = distanceKm * 0.621371
            driverCost = distanceMiles * rateAmount
            break
        case 'per_trip':
            driverCost = rateAmount
            break
        case 'hourly':
            const hours = tripDurationMinutes / 60
            driverCost = hours * rateAmount
            break
        case 'salary':
            driverCost = 0
            break
    }

    // 3. Toll Cost
    let tollCost = route?.estimated_toll_cost || 0

    // 4. Other Costs
    let otherCosts = 0

    const totalCost = fuelCost + driverCost + tollCost + otherCosts

    return {
        job_id: job.id,
        vehicle_id: vehicle?.id || null,
        driver_id: driver?.id || null,
        distance_km: distanceKm,
        fuel_efficiency: efficiency,
        fuel_price_per_liter: fuelPrice,
        fuel_cost: fuelCost,
        toll_cost: tollCost,
        driver_payment_type: paymentType,
        driver_rate: rateAmount,
        driver_cost: driverCost,
        trip_duration_minutes: tripDurationMinutes,
        other_costs: otherCosts,
        total_cost: totalCost,
        status: 'final'
    }
}
