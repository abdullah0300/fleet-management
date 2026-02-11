import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCompanyId } from './useCurrentUser'
import { Route, RouteInsert, RouteUpdate } from '@/types/database'

// Query keys for cache management
export const routeKeys = {
    all: ['routes'] as const,
    lists: () => [...routeKeys.all, 'list'] as const,
    list: (filters?: { page?: number }) =>
        [...routeKeys.lists(), filters] as const,
    details: () => [...routeKeys.all, 'detail'] as const,
    detail: (id: string) => [...routeKeys.details(), id] as const,
}

const supabase = createClient()

// Fetch all routes with pagination
async function fetchRoutes(page = 1, pageSize = 50): Promise<{
    data: Route[]
    count: number
    hasMore: boolean
}> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error, count } = await supabase
        .from('routes')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

    if (error) throw error

    return {
        data: data || [],
        count: count || 0,
        hasMore: (count || 0) > to + 1,
    }
}

// Fetch single route
async function fetchRoute(id: string): Promise<Route> {
    const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error
    return data
}

// Create route
async function createRouteApi(route: RouteInsert): Promise<Route> {
    const { data, error } = await supabase
        .from('routes')
        .insert([route])
        .select()
        .single()

    if (error) throw error
    return data
}

// Update route
async function updateRouteApi({
    id,
    updates,
}: {
    id: string
    updates: RouteUpdate
}): Promise<Route> {
    const { data, error } = await supabase
        .from('routes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

// Delete route
async function deleteRouteApi(id: string): Promise<void> {
    const { error } = await supabase.from('routes').delete().eq('id', id)
    if (error) throw error
}

// ==================== HOOKS ====================

/**
 * Hook to fetch all routes with caching
 */
export function useRoutes(page = 1, pageSize = 50) {
    return useQuery({
        queryKey: routeKeys.list({ page }),
        queryFn: () => fetchRoutes(page, pageSize),
    })
}

/**
 * Hook to fetch a single route by ID
 */
export function useRoute(id: string) {
    const queryClient = useQueryClient()

    return useQuery({
        queryKey: routeKeys.detail(id),
        queryFn: () => fetchRoute(id),
        initialData: () => {
            const listData = queryClient.getQueryData<{ data: Route[] }>(
                routeKeys.list({ page: 1 })
            )
            return listData?.data.find((r) => r.id === id)
        },
    })
}

/**
 * Hook to create a new route
 */
export function useCreateRoute() {
    const queryClient = useQueryClient()
    const companyId = useCompanyId()

    return useMutation({
        mutationFn: (route: RouteInsert) => {
            if (!companyId) throw new Error('Company ID is required')
            return createRouteApi({ ...route, company_id: companyId })
        },
        onSuccess: (newRoute) => {
            queryClient.invalidateQueries({ queryKey: routeKeys.lists() })
            queryClient.setQueryData(routeKeys.detail(newRoute.id), newRoute)
        },
    })
}

/**
 * Hook to update a route
 */
export function useUpdateRoute() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: updateRouteApi,
        onSuccess: (updatedRoute) => {
            queryClient.setQueryData(routeKeys.detail(updatedRoute.id), updatedRoute)
            queryClient.invalidateQueries({ queryKey: routeKeys.lists() })
        },
    })
}

/**
 * Hook to delete a route
 */
export function useDeleteRoute() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteRouteApi,
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: routeKeys.lists() })
        },
    })
}

/**
 * Calculate route cost estimation
 */
export function calculateRouteCost(
    route: Route,
    vehicleFuelEfficiency: number,
    driverPaymentType: string,
    driverRateAmount: number,
    fuelPricePerLiter: number = 1.5
) {
    const distance = route.distance_km || 0
    const duration = route.estimated_duration || 0

    // Fuel cost
    const fuelCost = vehicleFuelEfficiency > 0
        ? (distance / vehicleFuelEfficiency) * fuelPricePerLiter
        : 0

    // Toll cost (from route)
    const tollCost = route.estimated_toll_cost || 0

    // Driver pay based on payment type
    let driverPay = 0
    switch (driverPaymentType) {
        case 'per_mile':
            driverPay = distance * driverRateAmount
            break
        case 'per_trip':
            driverPay = driverRateAmount
            break
        case 'hourly':
            driverPay = (duration / 60) * driverRateAmount
            break
        case 'salary':
            driverPay = 0 // Salary is fixed, not per trip
            break
    }

    const total = fuelCost + tollCost + driverPay

    return {
        fuelCost: Number(fuelCost.toFixed(2)),
        tollCost: Number(tollCost.toFixed(2)),
        driverPay: Number(driverPay.toFixed(2)),
        total: Number(total.toFixed(2))
    }
}
