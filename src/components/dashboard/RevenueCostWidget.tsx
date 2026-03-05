'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Skeleton } from "@/components/ui/skeleton"
import { format, subDays, isAfter } from 'date-fns'
import { JobWithRelations } from '@/hooks/useJobs'
import { CostEstimate, JobPayAdjustment } from '@/types/database'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

const supabase = createClient()

export function RevenueCostWidget() {
    // 1. Fetch completed jobs (for revenue)
    const { data: jobs, isLoading: loadingJobs } = useQuery({
        queryKey: ['jobs', 'completed'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('jobs')
                .select('*')
                .eq('status', 'completed')
                .order('updated_at', { ascending: false })
            if (error) throw error
            return data as any[]
        }
    })

    // 2. Fetch all cost estimates
    const { data: estimates, isLoading: loadingEst } = useQuery({
        queryKey: ['cost_estimates', 'all'],
        queryFn: async () => {
            const { data, error } = await supabase.from('cost_estimates').select('*')
            if (error) throw error
            return data as CostEstimate[]
        }
    })

    // 3. Fetch all adjustments
    const { data: adjustments, isLoading: loadingAdj } = useQuery({
        queryKey: ['job_pay_adjustments', 'all'],
        queryFn: async () => {
            const { data, error } = await supabase.from('job_pay_adjustments').select('*')
            if (error) throw error
            return data as JobPayAdjustment[]
        }
    })

    if (loadingJobs || loadingEst || loadingAdj) {
        return <Skeleton className="col-span-1 h-[450px] rounded-xl" />
    }

    // Process Data
    let totalRevenue = 0
    let totalCosts = 0
    let fuelTotal = 0
    let driverTotal = 0
    let tollTotal = 0
    let otherTotal = 0
    let totalMiles = 0

    // Combine costs and adjustments
    const adjByJob = (adjustments || []).reduce((acc, adj) => {
        if (!acc[adj.job_id]) acc[adj.job_id] = 0
        acc[adj.job_id] += adj.amount
        return acc
    }, {} as Record<string, number>)

    const estByJob = (estimates || []).reduce((acc, est) => {
        acc[est.job_id!] = est
        return acc
    }, {} as Record<string, CostEstimate>)

    const thirtyDaysAgo = subDays(new Date(), 30)

    // Calculate totals for jobs completed in last 30 days
    const recentJobs = (jobs || []).filter(j => isAfter(new Date(j.updated_at), thirtyDaysAgo))

    recentJobs.forEach(job => {
        totalRevenue += Number(job.revenue || 0)

        const est = estByJob[job.id]
        if (est) {
            const jobAdj = adjByJob[job.id] || 0
            const jobDriverTotal = Number(est.driver_cost) + jobAdj

            fuelTotal += Number(est.fuel_cost)
            driverTotal += jobDriverTotal
            tollTotal += Number(est.toll_cost)
            otherTotal += Number(est.other_costs || 0)

            totalMiles += Number(est.distance_km || 0) // distance_km stores miles in our implementation
            totalCosts += Number(est.total_cost) + jobAdj
        }
    })

    const netProfit = totalRevenue - totalCosts
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
    const costPerMile = totalMiles > 0 ? totalCosts / totalMiles : 0

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)

    // Chart Data (Mocking daily trend as we don't have enough history in a fresh DB)
    // We could build real chart data by chunking recentJobs by day, but for a 1-day demo it looks empty.
    // So we generate a 7-day trend ending today based on our totals to make the chart look alive.
    const chartData = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(new Date(), 6 - i)
        // Add some random variation around the daily average
        const dailyAvgRev = totalRevenue / 30
        const dailyAvgCost = totalCosts / 30

        // Only return real data if we have it, else 0
        const dayJobs = recentJobs.filter(j => new Date(j.updated_at).toDateString() === d.toDateString())
        const dayRev = dayJobs.reduce((sum, j) => sum + Number(j.revenue || 0), 0)
        const dayCost = dayJobs.reduce((sum, j) => sum + (estByJob[j.id]?.total_cost || 0) + (adjByJob[j.id] || 0), 0)

        // For demo aesthetics, if there's absolutely no data on this day, we provide a faint baseline or just use 0
        return {
            name: format(d, 'EEE'),
            revenue: dayRev,
            costs: dayCost
        }
    })

    // Use hardcoded demo breakdown if there are no costs yet, so the widget isn't completely empty
    const hasData = recentJobs.length > 0 && totalCosts > 0

    const breakdown = hasData ? [
        { label: 'Fuel', amount: fuelTotal, percentage: Math.round((fuelTotal / totalCosts) * 100) || 0, color: 'bg-emerald-500' },
        { label: 'Driver Pay', amount: driverTotal, percentage: Math.round((driverTotal / totalCosts) * 100) || 0, color: 'bg-blue-500' },
        { label: 'Tolls', amount: tollTotal, percentage: Math.round((tollTotal / totalCosts) * 100) || 0, color: 'bg-amber-500' },
        { label: 'Other', amount: otherTotal, percentage: Math.round((otherTotal / totalCosts) * 100) || 0, color: 'bg-purple-500' },
    ].filter(b => b.amount > 0) : [
        { label: 'Fuel', amount: 0, percentage: 0, color: 'bg-emerald-500' },
        { label: 'Driver Pay', amount: 0, percentage: 0, color: 'bg-blue-500' },
    ]

    return (
        <Card className="col-span-1 h-[450px] flex flex-col border-slate-200 shadow-sm relative overflow-hidden bg-white">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${margin >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            <CardHeader className="flex flex-col space-y-4 pb-2 pl-6">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            Profitability (Last 30 Days)
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Gross Revenue vs Total Costs</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Net Profit</div>
                        <div className="flex justify-between items-end">
                            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(netProfit)}
                            </div>
                            <div className={`text-xs font-semibold flex items-center ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {netProfit >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                                {margin.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Cost / Mile</div>
                        <div className="flex justify-between items-end">
                            <div className="text-2xl font-bold text-slate-700">
                                ${(costPerMile).toFixed(2)}
                            </div>
                            <div className="text-xs font-semibold text-slate-500">
                                {totalMiles.toLocaleString()} mi total
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-4 pl-6 pt-2">
                {/* Minimalist Area Chart */}
                <div className="flex-1 min-h-0 -ml-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} dy={10} />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: any) => formatCurrency(Number(value))}
                                labelStyle={{ color: '#64748B', fontWeight: 600, marginBottom: '4px' }}
                            />
                            <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" strokeWidth={3} dot={{ strokeWidth: 2, r: 4, fill: "white" }} activeDot={{ r: 6, strokeWidth: 0 }} />
                            <Line type="monotone" dataKey="costs" name="Costs" stroke="#EF4444" strokeWidth={3} dot={{ strokeWidth: 2, r: 4, fill: "white" }} activeDot={{ r: 6, strokeWidth: 0 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Cost Breakdown Progress Bars */}
                <div className="space-y-3 pb-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-xs text-slate-500 uppercase tracking-wider">Cost Allocation</h4>
                        <span className="text-xs font-bold text-slate-700">{formatCurrency(totalCosts)} Total</span>
                    </div>
                    <div className="space-y-2">
                        {breakdown.map((item) => (
                            <div key={item.label} className="flex flex-col gap-1">
                                <div className="flex justify-between text-[11px] font-medium">
                                    <span className="text-slate-600 flex items-center">
                                        <div className={`w-2 h-2 rounded-full ${item.color} mr-1.5`} />
                                        {item.label}
                                    </span>
                                    <span className="text-slate-900">{formatCurrency(item.amount)} <span className="text-slate-400 font-normal ml-1">({item.percentage}%)</span></span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percentage}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
