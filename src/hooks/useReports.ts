import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// Query keys factory for cache management
export const reportKeys = {
    all: ['reports'] as const,
    dashboard: () => [...reportKeys.all, 'dashboard'] as const,
    fleet: () => [...reportKeys.all, 'fleet'] as const,
    drivers: () => [...reportKeys.all, 'drivers'] as const,
    jobs: () => [...reportKeys.all, 'jobs'] as const,
    costs: () => [...reportKeys.all, 'costs'] as const,
}

// ==========================================
// REPORT TYPES
// ==========================================

interface DashboardStats {
    vehicles: {
        total: number
        available: number
        inUse: number
        maintenance: number
    }
    drivers: {
        total: number
        available: number
        onTrip: number
    }
    jobs: {
        total: number
        pending: number
        inProgress: number
        completedThisMonth: number
    }
    maintenance: {
        scheduled: number
        overdue: number
    }
    documents: {
        expiringSoon: number
        expired: number
    }
}

interface FleetMetrics {
    totalVehicles: number
    averageUtilization: number
    fuelEfficiency: number
    maintenanceCost: number
    vehiclesByType: Record<string, number>
    vehiclesByStatus: Record<string, number>
}

interface DriverMetrics {
    totalDrivers: number
    activeDrivers: number
    averageTripsPerDriver: number
    driversByStatus: Record<string, number>
}

interface JobMetrics {
    totalJobs: number
    completionRate: number
    averageJobDuration: number
    jobsByStatus: Record<string, number>
    jobsThisMonth: number
    jobsLastMonth: number
}

// ==========================================
// FETCH FUNCTIONS
// ==========================================

async function fetchDashboardStats(): Promise<DashboardStats> {
    // Fetch vehicles stats
    const { data: vehicles } = await supabase.from('vehicles').select('status')
    const vehicleStats = vehicles?.reduce((acc, v) => {
        acc.total++
        if (v.status === 'available') acc.available++
        if (v.status === 'in_use') acc.inUse++
        if (v.status === 'maintenance') acc.maintenance++
        return acc
    }, { total: 0, available: 0, inUse: 0, maintenance: 0 }) || { total: 0, available: 0, inUse: 0, maintenance: 0 }

    // Fetch drivers stats
    const { data: drivers } = await supabase.from('drivers').select('status')
    const driverStats = drivers?.reduce((acc, d) => {
        acc.total++
        if (d.status === 'available') acc.available++
        if (d.status === 'on_trip') acc.onTrip++
        return acc
    }, { total: 0, available: 0, onTrip: 0 }) || { total: 0, available: 0, onTrip: 0 }

    // Fetch jobs stats
    const { data: jobs } = await supabase.from('jobs').select('status, created_at')
    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const jobStats = jobs?.reduce((acc, j) => {
        acc.total++
        if (j.status === 'pending') acc.pending++
        if (j.status === 'in_progress') acc.inProgress++
        if (j.status === 'completed' && new Date(j.created_at) >= thisMonth) acc.completedThisMonth++
        return acc
    }, { total: 0, pending: 0, inProgress: 0, completedThisMonth: 0 }) || { total: 0, pending: 0, inProgress: 0, completedThisMonth: 0 }

    // Fetch maintenance stats
    const today = new Date().toISOString().split('T')[0]
    const { data: maintenance } = await supabase
        .from('maintenance_records')
        .select('status, next_service_date')
        .neq('status', 'completed')

    const maintenanceStats = maintenance?.reduce((acc, m) => {
        if (m.status === 'scheduled') acc.scheduled++
        if (m.next_service_date && m.next_service_date < today) acc.overdue++
        return acc
    }, { scheduled: 0, overdue: 0 }) || { scheduled: 0, overdue: 0 }

    // Fetch documents stats
    const thirtyDays = new Date()
    thirtyDays.setDate(thirtyDays.getDate() + 30)
    const { data: documents } = await supabase
        .from('documents')
        .select('expiry_date')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', thirtyDays.toISOString())

    const docStats = documents?.reduce((acc, d) => {
        if (d.expiry_date && new Date(d.expiry_date) < new Date()) acc.expired++
        else acc.expiringSoon++
        return acc
    }, { expiringSoon: 0, expired: 0 }) || { expiringSoon: 0, expired: 0 }

    return {
        vehicles: vehicleStats,
        drivers: driverStats,
        jobs: jobStats,
        maintenance: maintenanceStats,
        documents: docStats,
    }
}

async function fetchFleetMetrics(): Promise<FleetMetrics> {
    const { data: vehicles } = await supabase
        .from('vehicles')
        .select('status, vehicle_type, fuel_efficiency')

    const vehiclesByType: Record<string, number> = {}
    const vehiclesByStatus: Record<string, number> = {}
    let totalFuelEfficiency = 0
    let fuelCount = 0

    vehicles?.forEach(v => {
        // By type
        const type = v.vehicle_type || 'Unknown'
        vehiclesByType[type] = (vehiclesByType[type] || 0) + 1

        // By status
        const status = v.status || 'Unknown'
        vehiclesByStatus[status] = (vehiclesByStatus[status] || 0) + 1

        // Fuel efficiency
        if (v.fuel_efficiency) {
            totalFuelEfficiency += v.fuel_efficiency
            fuelCount++
        }
    })

    // Get maintenance costs this year
    const yearStart = new Date()
    yearStart.setMonth(0, 1)
    const { data: maintenanceRecords } = await supabase
        .from('maintenance_records')
        .select('cost')
        .gte('service_date', yearStart.toISOString())

    const maintenanceCost = maintenanceRecords?.reduce((sum, m) => sum + (m.cost || 0), 0) || 0

    const inUseCount = vehiclesByStatus['in_use'] || 0
    const totalVehicles = vehicles?.length || 1

    return {
        totalVehicles: vehicles?.length || 0,
        averageUtilization: Math.round((inUseCount / totalVehicles) * 100),
        fuelEfficiency: fuelCount > 0 ? Math.round(totalFuelEfficiency / fuelCount * 10) / 10 : 0,
        maintenanceCost,
        vehiclesByType,
        vehiclesByStatus,
    }
}

async function fetchDriverMetrics(): Promise<DriverMetrics> {
    const { data: drivers } = await supabase
        .from('drivers')
        .select('id, status')

    const driversByStatus: Record<string, number> = {}
    drivers?.forEach(d => {
        const status = d.status || 'Unknown'
        driversByStatus[status] = (driversByStatus[status] || 0) + 1
    })

    // Get trip counts per driver (simplified)
    const { data: jobs } = await supabase
        .from('jobs')
        .select('driver_id')
        .eq('status', 'completed')

    const driverIds = new Set(drivers?.map(d => d.id) || [])
    const tripsPerDriver = jobs?.reduce((acc, j) => {
        if (j.driver_id && driverIds.has(j.driver_id)) {
            acc[j.driver_id] = (acc[j.driver_id] || 0) + 1
        }
        return acc
    }, {} as Record<string, number>) || {}

    const tripCounts = Object.values(tripsPerDriver)
    const avgTrips = tripCounts.length > 0
        ? Math.round(tripCounts.reduce((a, b) => a + b, 0) / tripCounts.length * 10) / 10
        : 0

    return {
        totalDrivers: drivers?.length || 0,
        activeDrivers: driversByStatus['on_trip'] || 0,
        averageTripsPerDriver: avgTrips,
        driversByStatus,
    }
}

async function fetchJobMetrics(): Promise<JobMetrics> {
    const { data: jobs } = await supabase
        .from('jobs')
        .select('status, created_at')

    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    const lastMonth = new Date(thisMonth)
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const jobsByStatus: Record<string, number> = {}
    let jobsThisMonth = 0
    let jobsLastMonth = 0
    let completedCount = 0

    jobs?.forEach(j => {
        const status = j.status || 'Unknown'
        jobsByStatus[status] = (jobsByStatus[status] || 0) + 1

        const createdAt = new Date(j.created_at)
        if (createdAt >= thisMonth) jobsThisMonth++
        else if (createdAt >= lastMonth) jobsLastMonth++

        if (status === 'completed') completedCount++
    })

    const total = jobs?.length || 1
    const completionRate = Math.round((completedCount / total) * 100)

    return {
        totalJobs: jobs?.length || 0,
        completionRate,
        averageJobDuration: 45, // Placeholder - would need trip data
        jobsByStatus,
        jobsThisMonth,
        jobsLastMonth,
    }
}

// ==========================================
// QUERY HOOKS
// ==========================================

/**
 * Hook to fetch dashboard stats
 * Uses TanStack Query with 5 minute cache
 */
export function useDashboardStats() {
    return useQuery({
        queryKey: reportKeys.dashboard(),
        queryFn: fetchDashboardStats,
        staleTime: 5 * 60 * 1000, // 5 minutes
    })
}

/**
 * Hook to fetch fleet metrics
 */
export function useFleetMetrics() {
    return useQuery({
        queryKey: reportKeys.fleet(),
        queryFn: fetchFleetMetrics,
        staleTime: 5 * 60 * 1000,
    })
}

/**
 * Hook to fetch driver metrics
 */
export function useDriverMetrics() {
    return useQuery({
        queryKey: reportKeys.drivers(),
        queryFn: fetchDriverMetrics,
        staleTime: 5 * 60 * 1000,
    })
}

/**
 * Hook to fetch job metrics
 */
export function useJobMetrics() {
    return useQuery({
        queryKey: reportKeys.jobs(),
        queryFn: fetchJobMetrics,
        staleTime: 5 * 60 * 1000,
    })
}
