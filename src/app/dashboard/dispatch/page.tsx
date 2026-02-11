import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { DispatchCommandCenter } from '@/components/dispatch/builder/DispatchCommandCenter'
import { VisualDispatchBoard } from '@/components/dispatch/VisualDispatchBoard'
import { UnassignedJobsList } from '@/components/dispatch/UnassignedJobsList'
import { Skeleton } from '@/components/ui/skeleton'
import { DispatchTabs } from '@/components/dispatch/DispatchTabs'

export const dynamic = 'force-dynamic'

export default async function DispatchPage() {
    const supabase = await createClient()

    // Parallel Fetching for Speed
    const [driversRes, vehiclesRes, pendingJobsRes] = await Promise.all([
        supabase.from('drivers').select('*, profiles(full_name)'),
        supabase.from('vehicles').select('*'),
        supabase.from('jobs').select('*, job_stops(*)').eq('status', 'pending').is('manifest_id', null)
    ])

    const drivers = driversRes.data || []
    const vehicles = vehiclesRes.data || []
    const pendingJobs = pendingJobsRes.data || []

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col overflow-hidden">

            <div className="flex-none px-4 py-3 border-b bg-background">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight">Active Dispatch</h1>
                        <p className="text-xs text-muted-foreground">
                            Build manifests and assign jobs
                        </p>
                    </div>
                </div>
            </div>

            <DispatchTabs
                visualBoard={<VisualDispatchBoard />}
            >
                <Suspense fallback={<DispatchLoading />}>
                    <DispatchCommandCenter
                        initialDrivers={drivers}
                        initialVehicles={vehicles}
                        initialJobs={pendingJobs}
                    />
                </Suspense>
            </DispatchTabs>
        </div>
    )
}

function DispatchLoading() {
    return (
        <div className="grid grid-cols-3 gap-6 p-6 h-full">
            <Skeleton className="h-full w-full rounded-xl" />
            <Skeleton className="h-full w-full rounded-xl" />
            <Skeleton className="h-full w-full rounded-xl" />
        </div>
    )
}
