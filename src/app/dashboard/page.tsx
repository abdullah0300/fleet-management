import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { RecentJobsWidget } from '@/components/dashboard/RecentJobsWidget'
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget'
import { FleetMapWidget } from '@/components/dashboard/FleetMapWidget'
import { RevenueCostWidget } from '@/components/dashboard/RevenueCostWidget'
import { MaintenanceAlertsWidget } from '@/components/dashboard/MaintenanceAlertsWidget'

export default function DashboardPage() {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            <div className="flex items-center">
                <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
            </div>

            <DashboardStats />

            {/* Visual Overview Section */}
            <div className="grid gap-4 md:gap-8 lg:grid-cols-4">
                <FleetMapWidget />
                <RevenueCostWidget />
                <MaintenanceAlertsWidget />
            </div>

            {/* List Data Section */}
            <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
                <RecentJobsWidget />
                <RecentActivityWidget />
            </div>
        </div>
    )
}
