'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useJobs } from "@/hooks/useJobs"
import { useMaintenance } from "@/hooks/useMaintenance"
import { MoreHorizontal } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { useMemo } from "react"

type ActivityItem = {
    id: string
    type: 'job_completed' | 'job_started' | 'maintenance_due' | 'maintenance_completed' | 'alert'
    title: string
    description: string
    timestamp: Date
    color: string
}

export function RecentActivityWidget() {
    const { data: jobsData } = useJobs(1, 20)
    const { data: maintenanceData } = useMaintenance({ limit: 6 })

    const activities = useMemo(() => {
        const items: ActivityItem[] = []

        // 1. Job Activities
        // Since we don't have a full history log, we'll use current status + updated_at
        // This is an approximation. Ideally we'd query an audit log.
        if (jobsData?.data) {
            jobsData.data.forEach(job => {
                const date = new Date(job.updated_at)
                // Filter for "recent" (e.g., last 24 hours) if desired, but for now just show all sorted

                if (job.status === 'completed') {
                    items.push({
                        id: `job-comp-${job.id}`,
                        type: 'job_completed',
                        title: 'Delivery Completed',
                        description: `Job #${job.job_number} • ${job.drivers?.profiles?.full_name || 'Unknown Driver'}`,
                        timestamp: date,
                        color: 'bg-green-500'
                    })
                } else if (job.status === 'in_progress') {
                    items.push({
                        id: `job-start-${job.id}`,
                        type: 'job_started',
                        title: `Job #${job.job_number}`,
                        description: `Started trip • ${job.drivers?.profiles?.full_name || 'Unknown Driver'}`,
                        timestamp: date,
                        color: 'bg-blue-500'
                    })
                }
            })
        }

        // 2. Maintenance Activities
        if (maintenanceData?.data) {
            maintenanceData.data.forEach(record => {
                const createdDate = new Date(record.created_at)
                const serviceDate = record.service_date ? new Date(record.service_date) : createdDate

                if (record.status === 'scheduled' || record.status === 'in_progress') {
                    // Check if due soon or overdue
                    const isOverdue = new Date() > serviceDate
                    items.push({
                        id: `maint-due-${record.id}`,
                        type: 'maintenance_due',
                        title: isOverdue ? 'Action Required' : 'Maintenance Scheduled',
                        description: `Vehicle #${record.vehicles?.registration_number} • ${record.type} ${isOverdue ? 'Overdue' : 'Due'}`,
                        timestamp: serviceDate, // Sort by due date effectively
                        color: 'bg-red-500'
                    })
                }
            })
        }

        // Sort descending by time
        return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 6) // Limit to 6 to fit height
    }, [jobsData, maintenanceData])


    return (
        <Card className="col-span-1 h-[450px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
                <MoreHorizontal className="h-5 w-5 text-muted-foreground cursor-pointer" />
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
                <div className="space-y-8 pr-4">
                    {activities.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No recent activity.</p>
                    ) : (
                        activities.map((activity) => (
                            <div
                                key={activity.id}
                                className="flex cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors -mx-2"
                                onClick={() => {
                                    if (activity.type.startsWith('job')) {
                                        window.location.href = `/dashboard/jobs/${activity.id.split('-').pop()}`
                                    } else {
                                        window.location.href = `/dashboard/maintenance`
                                    }
                                }}
                            >
                                {/* Timeline line/dot */}
                                <div className="flex flex-col items-center mr-4 mt-1">
                                    <div className={`h-3 w-3 rounded-full ${activity.color}`} />
                                    <div className="w-px h-full bg-border my-1 last:hidden" />
                                </div>
                                <div className="space-y-1 pb-2 last:pb-0 font-normal text-left">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold">{format(activity.timestamp, 'hh:mm a')}</span>
                                        <span className={`text-sm font-medium ${activity.type === 'job_completed' ? 'text-green-600' :
                                            activity.type === 'maintenance_due' ? 'text-red-600' :
                                                'text-blue-600'
                                            }`}>
                                            {activity.title}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {activity.description}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
