'use client'

import { useState } from 'react'
import { DateRange } from 'react-day-picker'
import { subDays, startOfMonth } from 'date-fns'
import {
    DollarSign,
    TrendingUp,
    Truck,
    Wrench,
    Users,
    PackageCheck,
    Briefcase,
    Activity
} from 'lucide-react'

// Hooks
import {
    useFinancialMetrics,
    useJobMetrics,
    useFleetMetrics,
    useDriverMetrics
} from '@/hooks/useReports'

// Components
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { MetricCard } from '@/components/reports/MetricCard'
import {
    RevenueChart,
    JobCompletionChart,
    CostBreakdownChart,
    VehicleUtilizationChart,
    StatusChart
} from '@/components/reports/Charts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ReportsPage() {
    // Global Date Filter State (Default to last 30 days)
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 30),
        to: new Date()
    })

    // Fetch all metrics
    const { data: financials, isLoading: loadingFin } = useFinancialMetrics(dateRange as any)
    const { data: jobs, isLoading: loadingJobs } = useJobMetrics(dateRange as any)
    const { data: fleet, isLoading: loadingFleet } = useFleetMetrics(dateRange as any)
    const { data: drivers, isLoading: loadingDrivers } = useDriverMetrics(dateRange as any)

    const isLoading = loadingFin || loadingJobs || loadingFleet || loadingDrivers

    return (
        <div className="flex flex-col gap-8 pb-10">
            {/* Header & Global Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
                    <p className="text-muted-foreground text-sm">Comprehensive performance analytics</p>
                </div>
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                    <Skeleton className="h-32 rounded-xl" />
                </div>
            ) : (
                <>
                    {/* SECTION 1: FINANCIAL OVERVIEW */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                            <h2 className="text-xl font-semibold">Financial Overview</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <MetricCard
                                title="Total Revenue"
                                value={`$${financials?.totalRevenue.toLocaleString()}`}
                                icon={<TrendingUp />}
                                className="bg-emerald-50/50 dark:bg-emerald-950/20"
                            />
                            <MetricCard
                                title="Net Profit"
                                value={`$${financials?.netProfit.toLocaleString()}`}
                                icon={<DollarSign />}
                                trend={financials?.profitMargin}
                                trendLabel="Margin"
                            />
                            <MetricCard
                                title="Operating Costs"
                                value={`$${financials?.totalCost.toLocaleString()}`}
                                icon={<Activity />}
                            />
                            <MetricCard
                                title="Jobs Billed"
                                value={jobs?.totalJobs || 0}
                                icon={<Briefcase />}
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <Card className="lg:col-span-2">
                                <CardHeader>
                                    <CardTitle>Revenue vs. Cost Trend</CardTitle>
                                    <CardDescription>Daily financial performance based on job completion and trip actuals.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {financials?.dailyData && financials.dailyData.length > 0 ? (
                                        <RevenueChart data={financials.dailyData} />
                                    ) : (
                                        <div className="h-[350px] flex items-center justify-center text-muted-foreground">No data for this period</div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Cost Breakdown</CardTitle>
                                    <CardDescription>Where your money is going.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <CostBreakdownChart data={financials?.costBreakdown || []} />
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    {/* SECTION 2: OPERATIONS & JOBS */}
                    <section className="space-y-4 mt-8">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Briefcase className="h-5 w-5 text-blue-600" />
                            <h2 className="text-xl font-semibold">Operations & Dispatch</h2>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <Card className="lg:col-span-2">
                                <CardHeader>
                                    <CardTitle>Job Volume Pipeline</CardTitle>
                                    <CardDescription>Daily jobs completed versus those still pending.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {jobs?.dailyCompletion && jobs.dailyCompletion.length > 0 ? (
                                        <JobCompletionChart data={jobs.dailyCompletion} />
                                    ) : (
                                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">No jobs recorded for this period</div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Current Job Statuses</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <StatusChart data={jobs?.jobsByStatus || {}} height={250} />
                                    <div className="mt-4 flex flex-col items-center">
                                        <span className="text-3xl font-bold">{jobs?.completionRate.toFixed(1)}%</span>
                                        <span className="text-sm text-muted-foreground">Completion Rate</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    {/* SECTION 3: FLEET & DRIVERS */}
                    <section className="space-y-4 mt-8">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <Truck className="h-5 w-5 text-purple-600" />
                            <h2 className="text-xl font-semibold">Fleet & Workforce</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="lg:col-span-1">
                                <CardHeader className="pb-0">
                                    <CardTitle className="text-md">Vehicle Utilization</CardTitle>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <VehicleUtilizationChart utilizationRate={fleet?.utilizationRate || 0} />
                                </CardContent>
                            </Card>

                            <MetricCard
                                title="Fleet Size"
                                value={fleet?.totalVehicles || 0}
                                icon={<Truck />}
                            />

                            <MetricCard
                                title="Active Drivers"
                                value={`${drivers?.driversByStatus['on_trip'] || 0} / ${drivers?.totalDrivers || 0}`}
                                icon={<Users />}
                                description={`${drivers?.activeRate.toFixed(1)}% of workforce deployed`}
                            />

                            <MetricCard
                                title="Upcoming Maintenance"
                                value={`$${fleet?.maintenanceCostUpcoming.toLocaleString()}`}
                                icon={<Wrench />}
                                description="Scheduled repair liabilities"
                                className="bg-orange-50/50 dark:bg-orange-950/20"
                            />
                        </div>
                    </section>
                </>
            )}
        </div>
    )
}
