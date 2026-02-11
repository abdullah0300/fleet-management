'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Package, DollarSign, User, Activity } from 'lucide-react'
import { useVehicles } from '@/hooks/useVehicles'
import { useJobs } from '@/hooks/useJobs'
import { useDrivers } from '@/hooks/useDrivers'
import { useCostSummary } from '@/hooks/useCosts'
import { useRealtimeUpdate } from '@/hooks/useRealtimeUpdate'
import { Badge } from "@/components/ui/badge"

export function DashboardStats() {
    // --- Data Fetching ---
    const { data: vehiclesData } = useVehicles()
    const { data: jobsData } = useJobs() // Fetches all active/recent jobs
    const { data: driversData } = useDrivers()
    const { data: dailyCosts } = useCostSummary('day')

    const vehicles = vehiclesData?.data || []
    const jobs = jobsData?.data || []
    const drivers = driversData?.data || []

    // --- Real-time Updates ---
    useRealtimeUpdate('vehicles', ['vehicles', 'list'])
    useRealtimeUpdate('jobs', ['jobs', 'list'])
    useRealtimeUpdate('drivers', ['drivers', 'list'])
    useRealtimeUpdate('cost_estimates', ['costSummary', 'day'])

    // --- Calculations ---

    // 1. Active Vehicles
    const activeVehicles = vehicles?.filter(v => v.status === 'in_use').length || 0
    const totalVehicles = vehicles?.length || 0

    // 2. Deliveries Today
    const today = new Date().toISOString().split('T')[0]
    const todaysJobs = jobs?.filter(job => {
        // Check if scheduled for today
        const isScheduledToday = job.scheduled_date === today
        // Or if completed today (if we want to capture unscheduled but done today)
        const isCompletedToday = job.status === 'completed' && job.updated_at?.startsWith(today)
        return isScheduledToday || isCompletedToday
    }) || []

    const completedDeliveries = todaysJobs.filter(j => j.status === 'completed').length
    const totalDeliveriesToday = todaysJobs.length
    const pendingDeliveries = totalDeliveriesToday - completedDeliveries

    // 3. Earnings (Using Daily Cost as proxy for now)
    const todayEarnings = dailyCosts?.totalCost || 0

    // 4. Driver Status
    const activeDrivers = drivers?.filter(d => d.status === 'available' || d.status === 'on_trip').length || 0
    const onTripDrivers = drivers?.filter(d => d.status === 'on_trip').length || 0
    const offDutyDrivers = drivers?.filter(d => d.status === 'off_duty').length || 0
    const totalDrivers = drivers?.length || 0


    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Active Vehicles */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Active Vehicles
                    </CardTitle>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold flex items-baseline gap-1">
                        {activeVehicles}
                        <span className="text-sm font-normal text-muted-foreground">/{totalVehicles}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Deliveries Today */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Deliveries Today
                    </CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline justify-between">
                        <div className="text-2xl font-bold flex items-baseline gap-1">
                            {completedDeliveries}
                            <span className="text-sm font-normal text-muted-foreground">/{totalDeliveriesToday}</span>
                        </div>
                        {pendingDeliveries > 0 && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                                {pendingDeliveries} pending
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Today's Earnings */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Today's Earnings
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        ${todayEarnings.toLocaleString()}
                    </div>
                    {/* Placeholder for "vs average" since we don't have historical averages calculated yet */}
                    {/* <p className="text-xs text-muted-foreground">
                        +12% vs average (mock)
                    </p> */}
                </CardContent>
            </Card>

            {/* Driver's Status */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Driver's Status
                    </CardTitle>
                    <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-start justify-between">
                        <div className="text-2xl font-bold flex items-baseline gap-1">
                            {activeDrivers}
                            <span className="text-sm font-normal text-muted-foreground">/{totalDrivers}</span>
                        </div>
                        <div className="flex flex-col gap-1 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="text-muted-foreground">{activeDrivers} active</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-amber-500" />
                                <span className="text-muted-foreground">{onTripDrivers} on trip</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-red-500" />
                                <span className="text-muted-foreground">{offDutyDrivers} off</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
