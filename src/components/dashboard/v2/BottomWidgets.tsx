'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useUpcomingMaintenance, useOverdueMaintenance } from '@/hooks/useMaintenance'
import { useFinancials } from '@/hooks/useFinancials'
import { useJobs } from '@/hooks/useJobs'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDistanceToNow, isPast, differenceInDays } from 'date-fns'
import { AlertCircle, Clock, Info, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// --- 1. Reminders Due ---
export function RemindersWidget() {
    const router = useRouter()
    const { data: upcoming } = useUpcomingMaintenance()
    const { data: overdue } = useOverdueMaintenance()

    const overdueList = overdue || []
    const upcomingList = (upcoming || []).slice(0, 3)

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-800">Reminders Due</h2>
                <button
                    onClick={() => router.push('/dashboard/maintenance')}
                    className="text-sm font-semibold text-slate-500 border-b border-dashed border-slate-400 pb-0.5 hover:text-slate-800 transition-colors"
                >
                    View All
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                <div className="bg-emerald-50 text-emerald-700 text-sm font-semibold px-4 py-2 rounded-lg mb-4">
                    Reminders
                </div>

                {overdueList.map(record => {
                    const vehicleStr = record.vehicles?.make ? `${record.vehicles.make} #${record.vehicles.license_plate}` : `Vehicle #${record.vehicles?.license_plate}`
                    const daysOverdue = record.next_service_date ? differenceInDays(new Date(), new Date(record.next_service_date)) : 0

                    return (
                        <div key={record.id} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded-xl px-2 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/maintenance/record/${record.id}`)}>
                            <div>
                                <div className="font-bold text-slate-700">{vehicleStr}</div>
                                <div className="text-sm font-medium text-red-500">{record.type || 'Maintenance'}</div>
                            </div>
                            <div className="text-sm font-bold text-slate-600">
                                {daysOverdue > 0 ? `${daysOverdue} days overdue` : 'Overdue'}
                            </div>
                        </div>
                    )
                })}

                {upcomingList.map(record => {
                    const vehicleStr = record.vehicles?.make ? `${record.vehicles.make} #${record.vehicles.license_plate}` : `Vehicle #${record.vehicles?.license_plate}`
                    const daysUntil = record.next_service_date ? differenceInDays(new Date(record.next_service_date), new Date()) : 0

                    return (
                        <div key={record.id} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded-xl px-2 transition-colors cursor-pointer" onClick={() => router.push(`/dashboard/maintenance/record/${record.id}`)}>
                            <div>
                                <div className="font-bold text-slate-700">{vehicleStr}</div>
                                <div className="text-sm font-medium text-amber-500">{record.type || 'Maintenance'}</div>
                            </div>
                            <div className="text-sm font-bold text-slate-600">
                                Due in {daysUntil} days
                            </div>
                        </div>
                    )
                })}

                {overdueList.length === 0 && upcomingList.length === 0 && (
                    <div className="text-center text-slate-400 py-10">No pending reminders.</div>
                )}
            </div>
        </div>
    )
}


// --- 2. Recent Alerts ---
export function RecentAlertsWidget() {
    const { data: jobsData } = useJobs()
    const { data: overdue } = useOverdueMaintenance()

    const allJobs = jobsData?.data || []
    const recentJobs = allJobs.slice(0, 5)

    const alerts: any[] = []

    recentJobs.forEach(job => {
        let type = 'info'
        let message = `Job status changed to ${job.status?.replace('_', ' ') || 'unknown'}`

        if (job.status === 'completed') {
            type = 'success'
            message = 'Job status changed to completed'
        } else if (job.status === 'cancelled') {
            type = 'error'
            message = 'Job status changed to cancelled'
        } else if (job.status === 'in_progress') {
            type = 'info'
            message = 'Job status changed to in progress'
        }

        alerts.push({
            id: `job-${job.id}`,
            entity: job.vehicles?.make ? `${job.vehicles.make} #${job.vehicles.license_plate || job.job_number}` : `International #${job.job_number}`,
            time: new Date(job.updated_at),
            message,
            type
        })
    });

    (overdue || []).slice(0, 3).forEach((maint: any) => {
        alerts.push({
            id: `maint-${maint.id}`,
            entity: maint.vehicles?.make ? `${maint.vehicles.make} #${maint.vehicles.license_plate}` : `Vehicle #${maint.vehicles?.license_plate}`,
            time: new Date(maint.updated_at || maint.created_at),
            message: `Maintenance overdue: ${maint.type}`,
            type: 'error'
        })
    })

    // Sort by time descending and take top 3
    alerts.sort((a, b) => b.time.getTime() - a.time.getTime())
    const topAlerts = alerts.slice(0, 3)

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-bold text-slate-900">Recent Alerts</h2>
                <button className="text-xs font-semibold text-slate-500 border border-slate-300 rounded md px-2 py-0.5 hover:bg-slate-50 transition-colors">
                    View All
                </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 hide-scrollbar">
                {topAlerts.map((alert, idx) => {
                    const isToday = new Date().toDateString() === alert.time.toDateString()
                    const timeStr = `${isToday ? 'Today' : 'Yesterday'} at ${alert.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`

                    let icon = <Info className="h-[15px] w-[15px] shrink-0 stroke-[2.5]" />
                    let textColor = 'text-[#2563EB]' // Blue for info/in progress

                    if (alert.type === 'error') {
                        icon = alert.message.includes('cancelled') ? <XCircle className="h-[15px] w-[15px] shrink-0 stroke-[2.5]" /> : <AlertCircle className="h-[15px] w-[15px] shrink-0 stroke-[2.5]" />
                        textColor = alert.message.includes('cancelled') ? 'text-[#3B82F6]' : 'text-red-500' // Keeping it blue for cancelled as per mockup if desired, or red. Using lighter blue for cancelled per mock.
                        if (alert.message.includes('overdue')) textColor = 'text-red-500' // Real errors
                    } else if (alert.type === 'success') {
                        icon = <Clock className="h-[15px] w-[15px] shrink-0 stroke-[2.5]" />
                        textColor = 'text-[#059669]' // Green for completed
                    }

                    return (
                        <div key={alert.id} className="flex flex-col p-4 mb-3 transition-colors bg-[#F8FAFC] rounded-[16px] hover:bg-slate-100/80 cursor-default border border-slate-50/50">
                            <div className="font-bold text-[15px] text-slate-900 leading-tight mb-0.5">{alert.entity}</div>
                            <div className="text-[13px] font-medium text-[#94A3B8] mb-2.5">{timeStr}</div>
                            <div className={`flex items-center gap-1.5 text-[14px] font-[500] ${textColor}`}>
                                {icon}
                                <span>{alert.message}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// --- 3. Revenue & Costs Overview ---
export function RevenueCostsWidget() {
    // 7 days for the chart
    const { data: weeklyFinData, isLoading: loadingWeekly } = useFinancials(7)
    // 1 day for the daily breakdown
    const { data: dailyFinData, isLoading: loadingDaily } = useFinancials(1)

    const rev7 = weeklyFinData?.summary.totalRevenue || 0
    const cost7 = (weeklyFinData?.summary.totalJobCosts || 0) + (weeklyFinData?.summary.totalMaintenanceCosts || 0)
    const profit7 = rev7 - cost7
    const profitMargin7 = rev7 > 0 ? (profit7 / rev7) * 100 : 0

    // Today's breakdown
    const breakdown = dailyFinData?.breakdown
    const totalDailyCost = dailyFinData ? (dailyFinData.summary.totalJobCosts + dailyFinData.summary.totalMaintenanceCosts) : 0

    const fuelPct = totalDailyCost > 0 ? ((breakdown?.fuel || 0) / totalDailyCost) * 100 : 0
    const driverPct = totalDailyCost > 0 ? ((breakdown?.driver || 0) / totalDailyCost) * 100 : 0
    const tollsPct = totalDailyCost > 0 ? ((breakdown?.tolls || 0) / totalDailyCost) * 100 : 0
    // We add parts/labor/other into the final bar or leave it out if we want to mimic strictly the image. The image has 3 bars.

    // Formatting
    const formatMoney = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)

    if (loadingWeekly || loadingDaily) {
        return <div className="h-full rounded-2xl bg-slate-100 animate-pulse" />
    }

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-800">Revenue & Costs Overview</h2>
                <div className="flex gap-2">
                    <span className="text-[10px] font-bold bg-[#E8EAF6] text-[#3F51B5] px-2 py-0.5 rounded">Revenue</span>
                    <span className="text-[10px] font-bold bg-[#FFEBEE] text-[#F44336] px-2 py-0.5 rounded">Costs</span>
                </div>
            </div>

            <div className="text-xs font-semibold text-slate-500 mb-1">Last 7 Days, Numbers</div>
            <div className="flex gap-1 text-sm font-semibold mb-1">
                <span className="text-slate-700">Revenue: {formatMoney(rev7)}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-700">Costs: {formatMoney(cost7)}</span>
            </div>
            <div className="text-sm font-bold text-slate-800 mb-4">
                Net Profit: {formatMoney(profit7)} <span className="text-slate-400 font-medium ml-1">({profitMargin7 >= 0 ? '+' : ''}{profitMargin7.toFixed(0)}%)</span>
            </div>

            {/* Area Chart */}
            <div className="h-[160px] w-full mb-6">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyFinData?.chartData || []} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#94a3b8' }}
                            tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                        />
                        <Tooltip />
                        <Area type="monotone" dataKey="revenue" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                        <Area type="monotone" dataKey="costs" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Cost Breakdown Today */}
            <div>
                <div className="text-sm font-bold text-slate-800 mb-4">Cost Breakdown ( Today )</div>

                <div className="space-y-3">
                    {/* Fuel */}
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-[#ef4444]"></div>
                        <div className="flex-1 h-5 bg-slate-100 rounded-sm overflow-hidden flex">
                            <div className="h-full bg-[#ef4444]" style={{ width: `${fuelPct}%` }}></div>
                        </div>
                        <div className="text-xs font-semibold text-slate-600 w-32 shrink-0 md:w-auto">
                            Fuel {formatMoney(breakdown?.fuel || 0)} <span className="text-slate-400 font-medium">({fuelPct.toFixed(0)}%)</span>
                        </div>
                    </div>

                    {/* Driver */}
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-[#ef4444]/80"></div>
                        <div className="flex-1 h-5 bg-slate-100 rounded-sm overflow-hidden flex">
                            <div className="h-full bg-[#ef4444]/80" style={{ width: `${driverPct}%` }}></div>
                        </div>
                        <div className="text-xs font-semibold text-slate-600 w-32 shrink-0 md:w-auto">
                            Driver Pay {formatMoney(breakdown?.driver || 0)} <span className="text-slate-400 font-medium">({driverPct.toFixed(0)}%)</span>
                        </div>
                    </div>

                    {/* Tolls */}
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-[#ef4444]/60"></div>
                        <div className="flex-1 h-5 bg-slate-100 rounded-sm overflow-hidden flex">
                            <div className="h-full bg-[#ef4444]/60" style={{ width: `${tollsPct}%` }}></div>
                        </div>
                        <div className="text-xs font-semibold text-slate-600 w-32 shrink-0 md:w-auto">
                            Tolls {formatMoney(breakdown?.tolls || 0)} <span className="text-slate-400 font-medium">({tollsPct.toFixed(0)}%)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
