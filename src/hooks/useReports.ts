import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'

const supabase = createClient()

export const reportKeys = {
    all: ['reports'] as const,
    dashboard: (range: any) => [...reportKeys.all, 'dashboard', range] as const,
    fleet: (range: any) => [...reportKeys.all, 'fleet', range] as const,
    drivers: (range: any) => [...reportKeys.all, 'drivers', range] as const,
    jobs: (range: any) => [...reportKeys.all, 'jobs', range] as const,
    financials: (range: any) => [...reportKeys.all, 'financials', range] as const,
}

export interface DateRange {
    from: Date
    to: Date
}

// ----------------------------------------------------------------------
// FINANCIAL METRICS
// ----------------------------------------------------------------------
export interface FinancialMetrics {
    totalRevenue: number
    totalCost: number
    profitMargin: number
    netProfit: number
    dailyData: { date: string; revenue: number; cost: number; profit: number }[]
    costBreakdown: { name: string; value: number }[]
}

async function fetchFinancialMetrics(companyId: string | null, range?: DateRange): Promise<FinancialMetrics> {
    if (!companyId) throw new Error("No company ID provided")

    // Default to last 30 days
    const endDate = range?.to ? new Date(range.to) : new Date()
    const startDate = range?.from ? new Date(range.from) : new Date()
    if (!range?.from) startDate.setDate(endDate.getDate() - 30)

    // Ensure inclusive end of day
    const endOfDay = new Date(endDate)
    endOfDay.setHours(23, 59, 59, 999)

    // 1. Fetch Revenue from Jobs joined with their Finalized Cost Estimates
    const { data: jobCosts, error: jobError } = await supabase
        .from('jobs')
        .select(`
            id,
            created_at,
            updated_at,
            revenue,
            status,
            cost_estimates!inner (
                fuel_cost,
                toll_cost,
                driver_cost,
                other_costs,
                total_cost
            )
        `)
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .eq('financial_status', 'approved')
        .gte('updated_at', startDate.toISOString())
        .lte('updated_at', endOfDay.toISOString())

    if (jobError) {
        console.error('Error fetching job costs for reports:', jobError)
    }

    // 2. Fetch Maintenance Costs
    const { data: maintenance } = await supabase
        .from('maintenance_records')
        .select('created_at, service_date, cost')
        .eq('status', 'completed')
        .gte('service_date', startDate.toISOString())
        .lte('service_date', endOfDay.toISOString())

    // Grouping by Date
    const dailyMap: Record<string, { revenue: number, cost: number }> = {}
    let totalRevenue = 0
    let totalFuel = 0
    let totalToll = 0
    let totalDriverPay = 0
    let totalMaintenance = 0

    // Initialize daily map with 0s for the range
    for (let d = new Date(startDate); d <= endOfDay; d.setDate(d.getDate() + 1)) {
        dailyMap[d.toISOString().split('T')[0]] = { revenue: 0, cost: 0 }
    }

    jobCosts?.forEach(job => {
        const rev = Number(job.revenue || 0)
        totalRevenue += rev
        
        const est = (job as any).cost_estimates?.[0] || (job as any).cost_estimates
        if (!est) return

        const fCost = Number(est.fuel_cost || 0)
        const tCost = Number(est.toll_cost || 0)
        const dPay = Number(est.driver_cost || 0)
        const oCost = Number(est.other_costs || 0)
        
        const totalJobCost = fCost + tCost + dPay + oCost
        
        totalFuel += fCost
        totalToll += tCost
        totalDriverPay += dPay

        // For daily tracking, we use the date the job was finalized (updated_at)
        const dateKey = (job.updated_at || job.created_at).split('T')[0]
        if (dailyMap[dateKey]) {
            dailyMap[dateKey].revenue += rev
            dailyMap[dateKey].cost += totalJobCost
        }
    })

    maintenance?.forEach(m => {
        const cost = Number(m.cost || 0)
        totalMaintenance += cost
        // use service_date (YYYY-MM-DD) or fallback to created_at
        const dateKey = m.service_date || m.created_at.split('T')[0]
        if (dailyMap[dateKey]) dailyMap[dateKey].cost += cost
    })

    const totalCost = totalFuel + totalToll + totalDriverPay + totalMaintenance
    const netProfit = totalRevenue - totalCost
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    const dailyData = Object.keys(dailyMap).sort().map(date => ({
        date,
        revenue: dailyMap[date].revenue,
        cost: dailyMap[date].cost,
        profit: dailyMap[date].revenue - dailyMap[date].cost,
    }))

    const costBreakdown = [
        { name: 'Fuel', value: totalFuel },
        { name: 'Tolls', value: totalToll },
        { name: 'Driver Pay', value: totalDriverPay },
        { name: 'Maintenance', value: totalMaintenance },
    ].filter(item => item.value > 0)

    return {
        totalRevenue,
        totalCost,
        netProfit,
        profitMargin,
        dailyData,
        costBreakdown,
    }
}

// ----------------------------------------------------------------------
// JOB METRICS
// ----------------------------------------------------------------------
export interface JobMetrics {
    totalJobs: number
    completionRate: number
    jobsByStatus: Record<string, number>
    dailyCompletion: { date: string; completed: number; pending: number }[]
}

async function fetchJobMetrics(companyId: string | null, range?: DateRange): Promise<JobMetrics> {
    if (!companyId) throw new Error("No company ID provided")

    const endDate = range?.to ? new Date(range.to) : new Date()
    const startDate = range?.from ? new Date(range.from) : new Date()
    if (!range?.from) startDate.setDate(endDate.getDate() - 30)
    const endOfDay = new Date(endDate)
    endOfDay.setHours(23, 59, 59, 999)

    const { data: jobs } = await supabase
        .from('jobs')
        .select('created_at, status')
        .eq('company_id', companyId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endOfDay.toISOString())

    const jobsByStatus: Record<string, number> = {}
    let completedCount = 0
    const dailyMap: Record<string, { completed: number; pending: number }> = {}

    for (let d = new Date(startDate); d <= endOfDay; d.setDate(d.getDate() + 1)) {
        dailyMap[d.toISOString().split('T')[0]] = { completed: 0, pending: 0 }
    }

    jobs?.forEach(j => {
        const s = j.status || 'unknown'
        jobsByStatus[s] = (jobsByStatus[s] || 0) + 1

        if (s === 'completed') completedCount++

        const dateKey = j.created_at.split('T')[0]
        if (dailyMap[dateKey]) {
            if (s === 'completed') dailyMap[dateKey].completed++
            else if (s === 'pending' || s === 'assigned' || s === 'in_progress') dailyMap[dateKey].pending++
        }
    })

    const totalJobs = jobs?.length || 0
    const completionRate = totalJobs > 0 ? (completedCount / totalJobs) * 100 : 0

    const dailyCompletion = Object.keys(dailyMap).sort().map(date => ({
        date,
        completed: dailyMap[date].completed,
        pending: dailyMap[date].pending,
    }))

    return {
        totalJobs,
        completionRate,
        jobsByStatus,
        dailyCompletion,
    }
}

// ----------------------------------------------------------------------
// FLEET METRICS
// ----------------------------------------------------------------------
export interface FleetMetrics {
    totalVehicles: number
    utilizationRate: number // in_use / total
    maintenanceCostUpcoming: number
    vehiclesByStatus: Record<string, number>
}

async function fetchFleetMetrics(companyId: string | null): Promise<FleetMetrics> {
    if (!companyId) throw new Error("No company ID provided")

    const { data: vehicles } = await supabase
        .from('vehicles')
        .select('status')
        .eq('company_id', companyId)

    const vehiclesByStatus: Record<string, number> = {}
    vehicles?.forEach(v => {
        const s = v.status || 'unknown'
        vehiclesByStatus[s] = (vehiclesByStatus[s] || 0) + 1
    })

    const totalVehicles = vehicles?.length || 0
    const inUse = vehiclesByStatus['in_use'] || 0
    const utilizationRate = totalVehicles > 0 ? (inUse / totalVehicles) * 100 : 0

    // Fetch upcoming maintenance costs
    const today = new Date().toISOString()
    const { data: upcomingMaintenance } = await supabase
        .from('maintenance_records')
        .select('cost')
        .gte('service_date', today)
        .eq('status', 'scheduled') // Adjust depending on accurate status values

    const maintenanceCostUpcoming = upcomingMaintenance?.reduce((sum, m) => sum + Number(m.cost || 0), 0) || 0

    return {
        totalVehicles,
        utilizationRate,
        maintenanceCostUpcoming,
        vehiclesByStatus,
    }
}

// ----------------------------------------------------------------------
// DRIVER METRICS
// ----------------------------------------------------------------------
export interface DriverMetrics {
    totalDrivers: number
    activeRate: number // on_trip / total
    driversByStatus: Record<string, number>
}

async function fetchDriverMetrics(companyId: string | null): Promise<DriverMetrics> {
    if (!companyId) throw new Error("No company ID provided")

    const { data: drivers } = await supabase
        .from('drivers')
        .select('status')
        .eq('company_id', companyId)

    const driversByStatus: Record<string, number> = {}
    drivers?.forEach(d => {
        const s = d.status || 'unknown'
        driversByStatus[s] = (driversByStatus[s] || 0) + 1
    })

    const totalDrivers = drivers?.length || 0
    const active = driversByStatus['on_trip'] || 0
    const activeRate = totalDrivers > 0 ? (active / totalDrivers) * 100 : 0

    return {
        totalDrivers,
        activeRate,
        driversByStatus,
    }
}

// ==========================================
// QUERY HOOKS
// ==========================================

export function useFinancialMetrics(range?: DateRange) {
    const { data: user } = useCurrentUser()
    return useQuery({
        queryKey: reportKeys.financials(range),
        queryFn: () => fetchFinancialMetrics(user?.company_id || null, range),
        enabled: !!user?.company_id,
        staleTime: 5 * 60 * 1000,
    })
}

export function useJobMetrics(range?: DateRange) {
    const { data: user } = useCurrentUser()
    return useQuery({
        queryKey: reportKeys.jobs(range),
        queryFn: () => fetchJobMetrics(user?.company_id || null, range),
        enabled: !!user?.company_id,
        staleTime: 5 * 60 * 1000,
    })
}

export function useFleetMetrics(range?: DateRange) {
    const { data: user } = useCurrentUser()
    return useQuery({
        // date range not strictly applying to current fleet snapshot, 
        // but included in key if we want to expand it to historical fleet size
        queryKey: reportKeys.fleet(range),
        queryFn: () => fetchFleetMetrics(user?.company_id || null),
        enabled: !!user?.company_id,
        staleTime: 5 * 60 * 1000,
    })
}

export function useDriverMetrics(range?: DateRange) {
    const { data: user } = useCurrentUser()
    return useQuery({
        queryKey: reportKeys.drivers(range),
        queryFn: () => fetchDriverMetrics(user?.company_id || null),
        enabled: !!user?.company_id,
        staleTime: 5 * 60 * 1000,
    })
}
