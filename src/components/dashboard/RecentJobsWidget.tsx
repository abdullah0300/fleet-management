'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useJobs, getJobPickupAddress, getJobDeliveryAddress } from "@/hooks/useJobs"
import { Search, Filter, MoreHorizontal } from "lucide-react"
import { format } from "date-fns"

export function RecentJobsWidget() {
    const { data: jobsData, isLoading } = useJobs(1, 6) // Fetch first 6 for "Recent" to fit height
    const jobs = (jobsData?.data || []).slice(0, 6) // Explicitly slice to ensure limit

    // Helper to get route string (City -> City)
    const getRouteString = (job: any) => {
        const pickup = getJobPickupAddress(job)
        const delivery = getJobDeliveryAddress(job)

        // Simple heuristic: extract city or first part of address
        // This assumes address format "123 Main St, City, State"
        const extractCity = (addr: string) => {
            if (!addr || addr.includes('No ')) return '?'
            const parts = addr.split(',')
            return parts.length > 1 ? parts[1].trim() : parts[0].substring(0, 15)
        }

        return `${extractCity(pickup)} → ${extractCity(delivery)}`
    }

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'completed': return 'text-green-600 bg-green-50 hover:bg-green-100 border-green-200'
            case 'in_progress': return 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200'
            case 'assigned': return 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-200'
            case 'pending': return 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100 border-yellow-200'
            case 'cancelled': return 'text-red-600 bg-red-50 hover:bg-red-100 border-red-200'
            default: return 'text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-200'
        }
    }

    return (
        <Card className="col-span-1 lg:col-span-2 h-[450px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-bold">Recent Jobs</CardTitle>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search"
                            className="w-[200px] pl-9"
                        />
                    </div>
                    <Button variant="outline" size="sm" className="gap-1">
                        <Filter className="h-4 w-4" />
                        Filters
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
                <div className="relative w-full">
                    <table className="w-full caption-bottom text-sm">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Job Id</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Driver</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Route</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Pickup</th>
                                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="h-24 text-center">Loading jobs...</td>
                                </tr>
                            ) : jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="h-24 text-center">No recent jobs found.</td>
                                </tr>
                            ) : (
                                jobs.map((job) => (
                                    <tr
                                        key={job.id}
                                        className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted cursor-pointer"
                                        onClick={() => window.location.href = `/dashboard/jobs/${job.id}`}
                                    >
                                        <td className="p-4 align-middle font-medium text-blue-600 hover:underline">{job.job_number || 'N/A'}</td>
                                        <td className="p-4 align-middle">
                                            <Badge variant="outline" className={getStatusColor(job.status)}>
                                                {job.status}
                                            </Badge>
                                        </td>
                                        <td className="p-4 align-middle">{job.drivers?.profiles?.full_name || 'Unassigned'}</td>
                                        <td className="p-4 align-middle">{getRouteString(job)}</td>
                                        <td className="p-4 align-middle">
                                            {job.scheduled_time
                                                ? format(new Date(`2000-01-01T${job.scheduled_time}`), 'hh:mm a')
                                                : 'TBD'}
                                        </td>
                                        <td className="p-4 align-middle text-muted-foreground max-w-[150px] truncate">
                                            {job.notes || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
