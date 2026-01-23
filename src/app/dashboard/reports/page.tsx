'use client'

import { Truck, Users, Package, Wrench, FileText, TrendingUp, TrendingDown, AlertTriangle, Clock, CheckCircle2, BarChart3, PieChart } from 'lucide-react'
import { useDashboardStats, useFleetMetrics, useJobMetrics, useDriverMetrics } from '@/hooks/useReports'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export default function ReportsPage() {
    const { data: dashboardStats, isLoading: dashboardLoading } = useDashboardStats()
    const { data: fleetMetrics, isLoading: fleetLoading } = useFleetMetrics()
    const { data: jobMetrics, isLoading: jobsLoading } = useJobMetrics()
    const { data: driverMetrics, isLoading: driversLoading } = useDriverMetrics()

    const isLoading = dashboardLoading || fleetLoading || jobsLoading || driversLoading

    // Calculate job trend
    const jobTrend = jobMetrics
        ? ((jobMetrics.jobsThisMonth - jobMetrics.jobsLastMonth) / (jobMetrics.jobsLastMonth || 1)) * 100
        : 0

    return (
        <div className="flex flex-col gap-4 sm:gap-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports & Analytics</h1>
                <p className="text-muted-foreground text-sm">Fleet performance and operational insights</p>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                {isLoading ? (
                    <>
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-xl" />
                        ))}
                    </>
                ) : (
                    <>
                        <Card className="bg-gradient-to-br from-accent-purple to-accent-purple/80 text-white">
                            <CardContent className="p-3 sm:p-4">
                                <div className="flex items-center justify-between">
                                    <Truck className="h-6 w-6 sm:h-8 sm:w-8 opacity-80" />
                                    <span className="text-3xl sm:text-4xl font-bold">
                                        {dashboardStats?.vehicles.total || 0}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm opacity-90 mt-1">Total Vehicles</p>
                                <p className="text-[10px] sm:text-xs opacity-70">
                                    {dashboardStats?.vehicles.available || 0} available
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-status-info to-status-info/80 text-white">
                            <CardContent className="p-3 sm:p-4">
                                <div className="flex items-center justify-between">
                                    <Users className="h-6 w-6 sm:h-8 sm:w-8 opacity-80" />
                                    <span className="text-3xl sm:text-4xl font-bold">
                                        {dashboardStats?.drivers.total || 0}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm opacity-90 mt-1">Total Drivers</p>
                                <p className="text-[10px] sm:text-xs opacity-70">
                                    {dashboardStats?.drivers.available || 0} available
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-status-success to-status-success/80 text-white">
                            <CardContent className="p-3 sm:p-4">
                                <div className="flex items-center justify-between">
                                    <Package className="h-6 w-6 sm:h-8 sm:w-8 opacity-80" />
                                    <span className="text-3xl sm:text-4xl font-bold">
                                        {dashboardStats?.jobs.completedThisMonth || 0}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm opacity-90 mt-1">Jobs This Month</p>
                                <div className="flex items-center gap-1 text-[10px] sm:text-xs opacity-70">
                                    {jobTrend >= 0 ? (
                                        <><TrendingUp className="h-3 w-3" /> +{Math.round(jobTrend)}%</>
                                    ) : (
                                        <><TrendingDown className="h-3 w-3" /> {Math.round(jobTrend)}%</>
                                    )}
                                    <span>vs last month</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-status-warning to-status-warning/80 text-white">
                            <CardContent className="p-3 sm:p-4">
                                <div className="flex items-center justify-between">
                                    <Wrench className="h-6 w-6 sm:h-8 sm:w-8 opacity-80" />
                                    <span className="text-3xl sm:text-4xl font-bold">
                                        {dashboardStats?.maintenance.scheduled || 0}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm opacity-90 mt-1">Maintenance Due</p>
                                <p className="text-[10px] sm:text-xs opacity-70">
                                    {dashboardStats?.maintenance.overdue || 0} overdue
                                </p>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>

            {/* Alerts Section */}
            {!isLoading && (dashboardStats?.maintenance.overdue || dashboardStats?.documents.expired) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {dashboardStats?.maintenance.overdue ? (
                        <Card className="border-status-error/50 bg-status-error-muted/30">
                            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                                <AlertTriangle className="h-6 w-6 text-status-error shrink-0" />
                                <div>
                                    <p className="font-semibold text-status-error">
                                        {dashboardStats.maintenance.overdue} Overdue Maintenance
                                    </p>
                                    <p className="text-xs text-muted-foreground">Requires immediate attention</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}

                    {dashboardStats?.documents.expired ? (
                        <Card className="border-status-warning/50 bg-status-warning-muted/30">
                            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                                <FileText className="h-6 w-6 text-status-warning shrink-0" />
                                <div>
                                    <p className="font-semibold text-status-warning">
                                        {dashboardStats.documents.expired} Expired Documents
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Plus {dashboardStats.documents.expiringSoon} expiring soon
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>
            ) : null}

            {/* Fleet Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Fleet Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <Skeleton key={i} className="h-12" />
                                ))}
                            </div>
                        ) : (
                            <>
                                {/* Utilization */}
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Fleet Utilization</span>
                                        <span className="font-semibold">{fleetMetrics?.averageUtilization || 0}%</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-accent-purple transition-all"
                                            style={{ width: `${fleetMetrics?.averageUtilization || 0}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Fuel Efficiency */}
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <span className="text-sm">Avg Fuel Efficiency</span>
                                    <span className="font-semibold">{fleetMetrics?.fuelEfficiency || 0} km/L</span>
                                </div>

                                {/* Maintenance Cost */}
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <span className="text-sm">YTD Maintenance Cost</span>
                                    <span className="font-semibold">${(fleetMetrics?.maintenanceCost || 0).toLocaleString()}</span>
                                </div>

                                {/* Vehicles by Status */}
                                <div>
                                    <p className="text-sm font-medium mb-2">Vehicles by Status</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {Object.entries(fleetMetrics?.vehiclesByStatus || {}).map(([status, count]) => (
                                            <div
                                                key={status}
                                                className={cn(
                                                    "px-3 py-1 rounded-full text-xs font-medium",
                                                    status === 'available' && "bg-status-success-muted text-status-success",
                                                    status === 'in_use' && "bg-accent-purple-muted text-accent-purple",
                                                    status === 'maintenance' && "bg-status-warning-muted text-status-warning",
                                                    !['available', 'in_use', 'maintenance'].includes(status) && "bg-muted"
                                                )}
                                            >
                                                {status}: {count}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <PieChart className="h-4 w-4" />
                            Job Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(4)].map((_, i) => (
                                    <Skeleton key={i} className="h-12" />
                                ))}
                            </div>
                        ) : (
                            <>
                                {/* Completion Rate */}
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Completion Rate</span>
                                        <span className="font-semibold">{jobMetrics?.completionRate || 0}%</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-status-success transition-all"
                                            style={{ width: `${jobMetrics?.completionRate || 0}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Total Jobs */}
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <span className="text-sm">Total Jobs</span>
                                    <span className="font-semibold">{jobMetrics?.totalJobs || 0}</span>
                                </div>

                                {/* Active Jobs */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 bg-status-warning-muted/30 rounded-lg text-center">
                                        <Clock className="h-5 w-5 mx-auto text-status-warning mb-1" />
                                        <p className="text-lg font-bold">{dashboardStats?.jobs.pending || 0}</p>
                                        <p className="text-xs text-muted-foreground">Pending</p>
                                    </div>
                                    <div className="p-3 bg-accent-purple-muted/30 rounded-lg text-center">
                                        <Package className="h-5 w-5 mx-auto text-accent-purple mb-1" />
                                        <p className="text-lg font-bold">{dashboardStats?.jobs.inProgress || 0}</p>
                                        <p className="text-xs text-muted-foreground">In Progress</p>
                                    </div>
                                </div>

                                {/* Jobs by Status */}
                                <div>
                                    <p className="text-sm font-medium mb-2">Jobs by Status</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {Object.entries(jobMetrics?.jobsByStatus || {}).map(([status, count]) => (
                                            <div
                                                key={status}
                                                className={cn(
                                                    "px-3 py-1 rounded-full text-xs font-medium",
                                                    status === 'completed' && "bg-status-success-muted text-status-success",
                                                    status === 'in_progress' && "bg-accent-purple-muted text-accent-purple",
                                                    status === 'pending' && "bg-status-warning-muted text-status-warning",
                                                    status === 'assigned' && "bg-status-info-muted text-status-info",
                                                    !['completed', 'in_progress', 'pending', 'assigned'].includes(status) && "bg-muted"
                                                )}
                                            >
                                                {status}: {count}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Driver Metrics */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Driver Performance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[...Array(4)].map((_, i) => (
                                <Skeleton key={i} className="h-20" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            <div className="p-3 sm:p-4 bg-muted/50 rounded-lg text-center">
                                <p className="text-2xl sm:text-3xl font-bold">{driverMetrics?.totalDrivers || 0}</p>
                                <p className="text-xs sm:text-sm text-muted-foreground">Total Drivers</p>
                            </div>
                            <div className="p-3 sm:p-4 bg-status-success-muted/30 rounded-lg text-center">
                                <p className="text-2xl sm:text-3xl font-bold text-status-success">
                                    {dashboardStats?.drivers.available || 0}
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground">Available</p>
                            </div>
                            <div className="p-3 sm:p-4 bg-accent-purple-muted/30 rounded-lg text-center">
                                <p className="text-2xl sm:text-3xl font-bold text-accent-purple">
                                    {driverMetrics?.activeDrivers || 0}
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground">On Trip</p>
                            </div>
                            <div className="p-3 sm:p-4 bg-status-info-muted/30 rounded-lg text-center">
                                <p className="text-2xl sm:text-3xl font-bold text-status-info">
                                    {driverMetrics?.averageTripsPerDriver || 0}
                                </p>
                                <p className="text-xs sm:text-sm text-muted-foreground">Avg Trips/Driver</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Footer Note */}
            <p className="text-xs text-center text-muted-foreground">
                Data refreshes every 5 minutes • Last updated: {new Date().toLocaleTimeString()}
            </p>
        </div>
    )
}
