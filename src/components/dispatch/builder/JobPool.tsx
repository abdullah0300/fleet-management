'use client'

import { useDraggable } from '@dnd-kit/core'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, MapPin, Plus, Calendar, Clock } from 'lucide-react'
import { useState, useMemo } from 'react'
import { CSS } from '@dnd-kit/utilities'
import { JobCreationModal } from './JobCreationModal'
import { Button } from '@/components/ui/button'
import { getJobDeliveryAddress, getJobStopCount } from '@/hooks/useJobs'
import { Job } from '@/types/database'

// Accept any job type (with or without job_stops)
type PoolJob = Job & { job_stops?: any[] }

interface JobPoolProps {
    jobs: PoolJob[]
    onJobCreated?: (job: any) => void
}

export function JobPool({ jobs, onJobCreated }: JobPoolProps) {
    const [search, setSearch] = useState('')

    const filteredJobs = useMemo(() => {
        const result = jobs.filter(j =>
            j.job_number?.toLowerCase().includes(search.toLowerCase()) ||
            j.customer_name?.toLowerCase().includes(search.toLowerCase())
        )

        // Sort by Date then Time
        return result.sort((a, b) => {
            const dateA = a.scheduled_date || '9999-12-31'
            const dateB = b.scheduled_date || '9999-12-31'
            if (dateA !== dateB) return dateA.localeCompare(dateB)

            const timeA = a.scheduled_time || '23:59'
            const timeB = b.scheduled_time || '23:59'
            return timeA.localeCompare(timeB)
        })
    }, [jobs, search])

    return (
        <Card className="flex flex-col h-full bg-slate-50/50">
            <CardHeader className="pb-3 border-b bg-background space-y-2">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <span>Unassigned Jobs</span>
                        <Badge variant="secondary">{filteredJobs.length}</Badge>
                    </CardTitle>
                    <JobCreationModal
                        trigger={
                            <Button size="sm" className="h-7 text-xs">
                                <Plus className="h-3 w-3 mr-1" /> New Job
                            </Button>
                        }
                        onSave={(newJob) => {
                            if (onJobCreated) onJobCreated(newJob)
                        }}
                    />
                </div>
                <div className="relative mt-2">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search..."
                        className="pl-8 h-9 text-xs"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-3 space-y-3 min-h-0" id="pool-container">

                {filteredJobs.length === 0 ? (
                    <div className="text-center text-xs text-muted-foreground py-8">
                        No jobs found
                    </div>
                ) : (
                    filteredJobs.map(job => (
                        <PoolJobCard key={job.id} job={job} />
                    ))
                )}
            </CardContent>
        </Card>
    )
}

function PoolJobCard({ job }: { job: PoolJob }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: job.id,
        data: { type: 'job', job }
    })

    const style = {
        transform: CSS.Translate.toString(transform),
    }

    // Use helper functions
    const deliveryAddress = getJobDeliveryAddress(job)
    const stopCount = getJobStopCount(job)

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="bg-white border rounded-md p-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing text-left"
        >
            <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-xs text-blue-600">{job.job_number}</span>
                <div className="flex items-center gap-1">
                    {stopCount > 2 && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {stopCount}
                        </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] h-4 px-1">{job.status}</Badge>
                </div>
            </div>
            <div className="text-xs font-medium truncate mb-1">{job.customer_name}</div>

            {/* Schedule Info */}
            <div className="flex flex-wrap gap-1 mb-1.5">
                {job.scheduled_date && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 gap-1 font-normal bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(job.scheduled_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Badge>
                )}
                {job.scheduled_time && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1 gap-1 font-normal">
                        <Clock className="h-2.5 w-2.5" />
                        {job.scheduled_time.slice(0, 5)}
                    </Badge>
                )}
            </div>

            <div className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 inline" />
                {deliveryAddress}
            </div>
        </div>
    )
}
