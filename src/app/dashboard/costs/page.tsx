'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
    LineChart,
    Line,
    XAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    YAxis,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts'
import { Activity, DollarSign, Fuel, MapPin, Users, Wrench, Briefcase, TrendingUp, TrendingDown, Receipt } from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useFinancials } from '@/hooks/useFinancials'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export default function FinancialsDashboardPage() {
    const [days, setDays] = useState<number>(30)
    const { data: financials, isLoading } = useFinancials(days)

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount)
    }

    if (isLoading || !financials) {
        return (
            <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
                <div className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-8 w-64 mb-2" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="lg:col-span-2 h-[400px] rounded-xl" />
                    <Skeleton className="h-[400px] rounded-xl" />
                </div>
            </div>
        )
    }

    const { summary, chartData, breakdown, transactions } = financials

    // Pie chart data for costs
    const costPieData = [
        { name: 'Fuel', value: breakdown.fuel, color: '#10B981' },        // emerald-500
        { name: 'Driver', value: breakdown.driver, color: '#8B5CF6' },      // violet-500
        { name: 'Tolls', value: breakdown.tolls, color: '#3B82F6' },        // blue-500
        { name: 'Maintenance', value: summary.totalMaintenanceCosts, color: '#F59E0B' }, // amber-500
        { name: 'Other', value: breakdown.other, color: '#6B7280' },        // gray-500
    ].filter(item => item.value > 0)

    return (
        <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-10">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Financial Dashboard</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">
                        Real-time revenue, costs, and profit tracking across your fleet operations.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Time Range:</span>
                    <Select value={days.toString()} onValueChange={(val) => setDays(Number(val))}>
                        <SelectTrigger className="w-[140px] bg-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 Days</SelectItem>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                            <SelectItem value="90">Last 90 Days</SelectItem>
                            <SelectItem value="365">Last Year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Gross Revenue */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-600">Gross Revenue</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-slate-800">
                            {formatCurrency(summary.totalRevenue)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">From completed jobs</p>
                    </CardContent>
                </Card>

                {/* Job Trip Costs */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-600">Job Trip Costs</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-slate-800">
                            {formatCurrency(summary.totalJobCosts)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Fuel, tolls, & driver pay</p>
                    </CardContent>
                </Card>

                {/* Maintenance Costs */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-slate-600">Fleet Maintenance</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                            <Wrench className="h-4 w-4 text-amber-600" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                        <div className="text-2xl sm:text-3xl font-bold text-slate-800">
                            {formatCurrency(summary.totalMaintenanceCosts)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Parts & Labor</p>
                    </CardContent>
                </Card>

                {/* Net Profit */}
                <Card className={cn(
                    "shadow-sm bg-gradient-to-br",
                    summary.netProfit >= 0
                        ? "from-emerald-500 to-emerald-600 border-emerald-600 text-white"
                        : "from-red-500 to-red-600 border-red-600 text-white"
                )}>
                    <CardHeader className="pb-2 p-4 sm:p-6 sm:pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-sm font-medium text-white/90">Net Profit</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                            <Activity className="h-4 w-4 text-white" />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                        <div className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                            {summary.netProfit >= 0 ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                            {formatCurrency(summary.netProfit)}
                        </div>
                        <p className="text-xs text-white/80 mt-1 font-medium tracking-wide">
                            {summary.margin.toFixed(1)}% MARGIN
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Revenue vs Cost Trend */}
                <Card className="shadow-sm lg:col-span-2">
                    <CardHeader className="p-4 sm:p-6 border-b border-slate-100">
                        <CardTitle className="text-base font-semibold text-slate-800">Revenue vs Overall Costs</CardTitle>
                        <CardDescription className="text-xs">Daily aggregated trends</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-6 -ml-4">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 12 }}
                                        dy={10}
                                        minTickGap={30}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748B', fontSize: 12 }}
                                        tickFormatter={(val) => '$' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val)}
                                        dx={-10}
                                    />
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: any) => [formatCurrency(Number(value))]}
                                        labelStyle={{ color: '#0F172A', fontWeight: 600, marginBottom: '8px' }}
                                    />
                                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#10B981" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                                    <Line type="monotone" dataKey="costs" name="Total Costs" stroke="#EF4444" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Cost Breakdown Pie */}
                <Card className="shadow-sm">
                    <CardHeader className="p-4 sm:p-6 border-b border-slate-100">
                        <CardTitle className="text-base font-semibold text-slate-800">Cost Breakdown</CardTitle>
                        <CardDescription className="text-xs">Where your money goes</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-6">
                        {costPieData.length > 0 ? (
                            <div className="h-[300px] w-full flex flex-col items-center">
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={costPieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {costPieData.map((entry, index) => (
                                                <Cell key={'cell-' + index} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value: any) => formatCurrency(Number(value))}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="w-full grid grid-cols-2 gap-x-2 gap-y-3 mt-4">
                                    {costPieData.map(item => (
                                        <div key={item.name} className="flex items-center gap-2 text-xs">
                                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                            <span className="text-slate-600 truncate">{item.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                                No cost data in this period
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Transactions Activity Feed */}
            <Card className="shadow-sm">
                <CardHeader className="p-4 sm:p-6 border-b border-slate-100">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base font-semibold text-slate-800">Recent Automated Activity</CardTitle>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-500 hover:bg-slate-100">
                            {transactions.length} Records
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {transactions.length > 0 ? (
                        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                            {transactions.map((tx, idx) => (
                                <div key={`${tx.id}-${idx}`} className="flex items-center justify-between p-4 sm:p-6 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "mt-0.5 p-2 rounded-lg flex items-center justify-center shrink-0",
                                            tx.type === 'job' ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                                        )}>
                                            {tx.type === 'job' ? <Briefcase className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-slate-800">{tx.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span>{tx.subtitle}</span>
                                                <span>•</span>
                                                <span>{format(new Date(tx.date), 'MMM d, yyyy - h:mm a')}</span>
                                            </div>
                                            {tx.details && (
                                                <p className="text-xs text-slate-400 mt-1">{tx.details}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center">
                                        <span className={cn(
                                            "text-sm font-bold",
                                            tx.isPositive ? "text-emerald-600" : "text-slate-800"
                                        )}>
                                            {tx.isPositive ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            <Receipt className="h-8 w-8 mx-auto mb-3 opacity-20 text-slate-500" />
                            No completed jobs or maintenance items in this timeline.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    )
}
