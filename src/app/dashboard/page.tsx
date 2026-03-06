import { TopStatsRow } from '@/components/dashboard/v2/TopStatsRow'
import { TrackingSection } from '@/components/dashboard/v2/TrackingSection'
import { RemindersWidget, RecentAlertsWidget, RevenueCostsWidget } from '@/components/dashboard/v2/BottomWidgets'

export default function DashboardPage() {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-5 bg-slate-50 min-h-screen">
            <div className="flex items-center">
                <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
            </div>

            {/* Top Row: Statistics */}
            <TopStatsRow />

            {/* Middle Row: Tracking Loads & Live Map Overview */}
            <TrackingSection />

            {/* Bottom Row: Reminders, Alerts, Costs */}
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.5fr] min-h-[350px]">
                <RemindersWidget />
                <RecentAlertsWidget />
                <RevenueCostsWidget />
            </div>
        </div>
    )
}
