'use client'

import { Truck, Package, DollarSign, User } from 'lucide-react'
import { useVehicles } from '@/hooks/useVehicles'
import { useJobs } from '@/hooks/useJobs'
import { useDrivers } from '@/hooks/useDrivers'
import { useCostSummary } from '@/hooks/useCosts'
import { useRealtimeUpdate } from '@/hooks/useRealtimeUpdate'
import { useOverdueMaintenance } from '@/hooks/useMaintenance'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn, formatCurrency } from '@/lib/utils'

function MiniAlertsFeed({ alerts }: { alerts: any[] }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // Grab top 3 and reorder them so latest is in the middle slot (index 1) if we have 3
    const top3 = alerts.slice(0, 3)
    const displayAlerts: any[] = []
    if (top3.length === 3) {
        displayAlerts.push(top3[1]) // Top slot
        displayAlerts.push(top3[0]) // Center slot (Latest)
        displayAlerts.push(top3[2]) // Bottom slot
    } else {
        displayAlerts.push(...top3)
    }

    const [activeIndex, setActiveIndex] = useState(0)

    // Mount scroll to center
    useEffect(() => {
        if (containerRef.current && displayAlerts.length >= 3) {
            containerRef.current.scrollTop = 42
            setActiveIndex(1)
        }
    }, [displayAlerts.length])

    const handleScroll = () => {
        if (!containerRef.current) return
        const scrollY = containerRef.current.scrollTop
        const newIndex = Math.round(scrollY / 42)
        if (newIndex !== activeIndex && newIndex >= 0 && newIndex < displayAlerts.length) {
            setActiveIndex(newIndex)
        }
    }

    return (
        <div className="relative flex-1 flex flex-col justify-center w-full min-h-[126px]">
            {/* The gray background matching the image */}
            <div className="absolute inset-y-0 inset-x-4 bg-[#f1f5f9] rounded-[20px]" />

            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="relative z-10 flex flex-col overflow-y-auto h-[126px] snap-y snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] w-full hide-scrollbar"
                style={{ scrollBehavior: 'smooth' }}
            >
                <div className="h-[42px] shrink-0" />
                {displayAlerts.length === 0 ? (
                    <div className="snap-center shrink-0 h-[42px] flex items-center justify-center text-xs text-slate-400">
                        No recent alerts
                    </div>
                ) : displayAlerts.map((alert, idx) => {
                    const isActive = idx === activeIndex
                    return (
                        <div
                            key={alert.id + idx.toString()}
                            onClick={() => router.push(alert.url)}
                            className={cn(
                                "snap-center shrink-0 h-[42px] flex items-center gap-3 transition-all duration-300 px-4 cursor-pointer hover:brightness-95",
                                isActive
                                    ? "bg-white shadow-md rounded-full font-bold text-[#1e293b] mx-0 relative z-20 scale-100"
                                    : "bg-transparent font-medium text-[#94a3b8] mx-4 opacity-80 scale-95"
                            )}
                        >
                            <span className={cn(
                                "rounded-full shrink-0 h-2 w-2",
                                alert.type === 'error' ? 'bg-[#ef4444]' :
                                    alert.type === 'success' ? 'bg-[#10b981]' : 'bg-[#eab308]'
                            )}></span>
                            <span className={cn(
                                "truncate flex-1 tracking-tight",
                                isActive ? "text-[13px]" : "text-[11px]"
                            )}>
                                {alert.message}
                            </span>
                        </div>
                    )
                })}
                <div className="h-[42px] shrink-0" />
            </div>
        </div>
    )
}

export function TopStatsRow() {
    // --- Data Fetching ---
    const { data: vehiclesData } = useVehicles()
    const { data: jobsData } = useJobs()
    const { data: driversData } = useDrivers()
    const { data: dailyCosts } = useCostSummary('day')
    const { data: overdue } = useOverdueMaintenance()

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
    const activeVehicles = vehicles?.filter(v => v.status === 'in_use' || v.status === 'available').length || 0 // The mockup says "Active Vehicles" so available + in use
    const totalVehicles = vehicles?.length || 0

    // 2. Deliveries Today
    const today = new Date().toISOString().split('T')[0]
    const todaysJobs = jobs?.filter(job => {
        const isScheduledToday = job.scheduled_date === today
        const isCompletedToday = job.status === 'completed' && job.updated_at?.startsWith(today)
        return isScheduledToday || isCompletedToday
    }) || []

    const completedDeliveries = todaysJobs.filter(j => j.status === 'completed').length
    const totalDeliveriesToday = todaysJobs.length
    const pendingDeliveries = totalDeliveriesToday - completedDeliveries

    // 3. Earnings
    // Daily cost summary returns 'revenue' ? Let's check if useCostSummary has revenue.
    // In our implementation, we added revenue to jobs. Let's sum today's jobs revenue.
    const todayEarnings = todaysJobs.reduce((sum, job) => sum + (job.revenue || 0), 0)

    // 4. Driver Status
    const activeDrivers = drivers?.filter(d => d.status === 'available').length || 0
    const onTripDrivers = drivers?.filter(d => d.status === 'on_trip').length || 0
    const offDutyDrivers = drivers?.filter(d => d.status === 'off_duty').length || 0
    const totalDrivers = drivers?.length || 0

    // We will consider "active" for the big number as available + on_trip
    const totalActiveDrivers = activeDrivers + onTripDrivers

    // 5. Build Alerts
    const alerts: any[] = []

    // Recent completed jobs or status changes (mocked by picking first 5)
    const recentJobs = (jobs || []).slice(0, 5)
    recentJobs.forEach(job => {
        alerts.push({
            id: `job-${job.id}`,
            message: `Job #${job.job_number} ${job.status === 'in_progress' ? 'started' : job.status}`,
            type: job.status === 'completed' ? 'success' : 'info',
            time: new Date(job.updated_at),
            url: `/dashboard/jobs/${job.id}`
        })
    });

    // Overdue maintenance
    (overdue || []).slice(0, 5).forEach((maint: any) => {
        alerts.push({
            id: `maint-${maint.id}`,
            message: `Vehicle #${maint.vehicles?.license_plate || 'Unknown'} maintenance due`,
            type: 'error',
            time: new Date(maint.updated_at || maint.created_at),
            url: `/dashboard/maintenance/record/${maint.id}`
        })
    })

    alerts.sort((a, b) => b.time.getTime() - a.time.getTime())

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* 1. Active Vehicles */}
            <div className="bg-[#A5D6A7] rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold">
                    <Truck className="h-4 w-4" />
                    <span className="text-sm">Active Vehicles</span>
                </div>
                <div className="text-3xl font-black text-slate-900 flex items-baseline gap-1 pb-4">
                    {activeVehicles}
                    <span className="text-lg font-bold text-slate-700/70">/{totalVehicles}</span>
                </div>
                <div className="absolute bottom-3 right-3 bg-white/40 px-2 py-1 rounded-md text-xs font-semibold text-slate-800">
                    ↑ +2
                </div>
            </div>

            {/* 2. Deliveries Today */}
            <div className="bg-[#90CAF9] rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold">
                    <Package className="h-4 w-4" />
                    <span className="text-sm">Deliveries Today</span>
                </div>
                <div className="text-3xl font-black text-slate-900 flex items-baseline gap-1 pb-4">
                    {completedDeliveries}
                    <span className="text-lg font-bold text-slate-700/70">/{totalDeliveriesToday}</span>
                </div>
                <div className="absolute bottom-3 right-3 bg-white/40 px-2 py-1 rounded-md text-xs font-semibold text-slate-800">
                    {pendingDeliveries} pending
                </div>
            </div>

            {/* 3. Today's Earnings */}
            <div className="bg-[#E1BEE7] rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="mb-3 text-slate-800 font-semibold">
                    <span className="text-sm block ml-1">Today's Earnings</span>
                </div>
                <div className="text-3xl font-black text-slate-900 flex items-baseline gap-1 pb-4">
                    ${todayEarnings.toLocaleString()}
                </div>
                <div className="absolute bottom-3 right-3 bg-white/40 px-2 py-1 rounded-md text-[10px] font-semibold text-slate-800 whitespace-nowrap">
                    ↑ +12% vs average
                </div>
            </div>

            {/* 4. Driver's Status */}
            <div className="bg-[#E3F2FD] rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold">
                    <User className="h-4 w-4" />
                    <span className="text-sm">Driver's Status</span>
                </div>
                <div className="text-3xl font-black text-slate-900 flex items-baseline gap-1 pb-4">
                    {totalActiveDrivers}
                    <span className="text-lg font-bold text-slate-700/50">/{totalDrivers}</span>
                </div>
                <div className="absolute bottom-3 right-3 left-3 flex justify-between items-center text-[10px] font-semibold text-slate-600">
                    <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>{activeDrivers} active</div>
                    <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span>{onTripDrivers} on trip</div>
                    <div className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>{offDutyDrivers} off</div>
                </div>
            </div>

            {/* 5. Recent Alerts Mini-Feed */}
            <div className="flex-1 flex flex-col justify-center min-h-[126px]">
                <MiniAlertsFeed alerts={alerts} />
            </div>
        </div>
    )
}
