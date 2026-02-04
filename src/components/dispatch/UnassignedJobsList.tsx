'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useJobs, getJobPickupAddress } from '@/hooks/useJobs'
import { Badge } from '@/components/ui/badge'

export function UnassignedJobsList() {
    const { data: jobsData } = useJobs(1, 100)

    const unassignedJobs = jobsData?.data.filter(job =>
        job.status === 'pending' || !job.driver_id
    ) || []

    const handleDragStart = (e: React.DragEvent, job: any) => {
        // Set data for the drop
        e.dataTransfer.setData('jobId', job.id)
        e.dataTransfer.setData('jobTitle', job.customer_name)
        // required for basic html5 dnd
        e.dataTransfer.effectAllowed = 'move'

            // Workaround for RBC onDropFromOutside
            ; (window as any).draggedJobId = job.id
    }

    return (
        <Card className="h-[600px] flex flex-col">
            <CardHeader className="py-4">
                <CardTitle className="text-base">Unassigned Jobs</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
                <ScrollArea className="h-full">
                    <div className="space-y-2 p-4 pt-0">
                        {unassignedJobs.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No unassigned jobs
                            </p>
                        ) : (
                            unassignedJobs.map(job => {
                                return (
                                    <div
                                        key={job.id}
                                        draggable="true"
                                        onDragStart={(e) => handleDragStart(e, job)}
                                        className="p-3 bg-muted/50 rounded-lg border border-border cursor-grab hover:bg-muted transition-colors active:cursor-grabbing"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-sm truncate">
                                                {job.customer_name}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] h-5">
                                                {job.job_number}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {getJobPickupAddress(job)}
                                        </p>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
