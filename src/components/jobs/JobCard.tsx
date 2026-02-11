'use client'

import { useRouter } from 'next/navigation'
import { MapPin, Truck, User, Calendar, Flame, Layers } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getJobStopCount } from '@/hooks/useJobs'
import { JobStop } from '@/types/database'
import { cn, formatDate } from '@/lib/utils'

interface JobCardProps {
    job: {
        id: string
        job_number: string
        status: string
        customer_name: string
        customer_phone?: string | null
        priority?: 'low' | 'normal' | 'high' | 'urgent' | null
        weight?: number | null
        notes?: string | null
        job_stops?: JobStop[]
        scheduled_date?: string | null
        scheduled_time?: string | null
        vehicles?: { registration_number: string; make: string } | null
        drivers?: { profiles: { full_name: string } | null } | null
        manifests?: { id: string; manifest_number: string | null; status: string | null } | null
    }
    showActions?: boolean
    onViewDetails?: () => void
}

export function JobCard({ job, onViewDetails }: JobCardProps) {
    const router = useRouter()
    const stopCount = getJobStopCount(job)

    // Priority stripe color
    const stripeColor = {
        urgent: 'bg-red-500',
        high: 'bg-orange-500',
        normal: 'bg-transparent',
        low: 'bg-slate-300',
    }[job.priority || 'normal']

    // Status badge styles
    const statusStyles: Record<string, string> = {
        pending: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
        assigned: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
        in_progress: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
        completed: 'bg-green-100 text-green-700 hover:bg-green-100',
        cancelled: 'bg-red-100 text-red-700 hover:bg-red-100',
    }

    // Get time display
    const getTimeDisplay = () => {
        const firstStop = job.job_stops?.length
            ? [...job.job_stops].sort((a, b) => a.sequence_order - b.sequence_order)[0]
            : null
        const startTime = (firstStop as any)?.scheduled_arrival || (firstStop as any)?.window_start

        if (startTime) {
            return new Date(startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
        if (job.scheduled_date) {
            // Use local formatter to avoid UTC shift
            return formatDate(job.scheduled_date)
        }
        return null
    }

    // Helper to extract city from address
    const getCity = (address: string) => {
        if (!address) return 'Unknown'
        const parts = address.split(',').map(p => p.trim())
        if (parts.length >= 3) return parts[parts.length - 3]
        if (parts.length === 2) return parts[0]
        return address.substring(0, 20) + (address.length > 20 ? '...' : '')
    }

    // Get location summary
    const getLocationSummary = () => {
        const stops = job.job_stops?.sort((a, b) => a.sequence_order - b.sequence_order) || []
        if (stops.length === 0) return null

        const start = getCity(stops[0].address)
        const end = getCity(stops[stops.length - 1].address)
        const middleCount = stops.length - 2

        if (stops.length === 1) return <span className="font-medium text-gray-500">{start}</span>

        return (
            <div className="flex items-center gap-1.5 text-sm text-gray-500 truncate mt-1">
                <span className="truncate font-medium text-gray-500">{start}</span>
                <span className="text-gray-400">→</span>
                <span className="truncate font-medium text-gray-500">{end}</span>
                {middleCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 h-5 min-w-0 bg-gray-100 text-gray-500">
                        +{middleCount}
                    </Badge>
                )}
            </div>
        )
    }

    return (
        <Card
            className="group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden border-gray-200/60 bg-white"
            onClick={onViewDetails}
        >
            <div className="flex flex-col h-full">
                <div className="flex flex-1">
                    {/* Priority Stripe */}
                    <div className={cn("w-1.5 shrink-0", stripeColor)} />

                    <div className="flex-1 p-4 flex flex-col min-h-0">
                        {/* Header: ID, Priority, Status */}
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                                <span className="font-mono font-medium text-xs text-gray-500 tracking-tight">
                                    {job.job_number}
                                </span>
                                {job.priority === 'urgent' && (
                                    <Flame className="h-3.5 w-3.5 text-red-500 fill-red-500/10" />
                                )}
                            </div>
                            <Badge className={cn("text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-md border-0 shadow-none", statusStyles[job.status])}>
                                {job.status.replace('_', ' ')}
                            </Badge>
                        </div>

                        {/* Main Content */}
                        <div className="space-y-1 mb-3">
                            <h3 className="font-bold text-gray-900 truncate leading-tight">
                                {job.customer_name}
                            </h3>
                            {getLocationSummary()}
                        </div>

                        {/* Manifest Badge */}
                        {job.manifests && (
                            <div className="mb-3">
                                <Badge
                                    variant="outline"
                                    className="text-[10px] font-medium gap-1.5 py-1 px-2 bg-indigo-50/50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 hover:text-indigo-700 transition-colors group/manifest w-fit cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        router.push(`/dashboard/manifests/${job.manifests!.id}`)
                                    }}
                                >
                                    <Layers className="h-3 w-3" />
                                    {job.manifests.manifest_number || 'Manifest'}
                                </Badge>
                            </div>
                        )}

                        {/* Spacer to push footer down */}
                        <div className="flex-1" />
                    </div>
                </div>

                {/* Footer: Meta Info */}
                <div className="bg-gray-50/50 border-t border-gray-100 px-4 py-2.5 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                        {stopCount > 0 && (
                            <div className="flex items-center gap-1.5" title={`${stopCount} stops`}>
                                <div className="p-1 rounded bg-white shadow-sm border border-gray-100">
                                    <MapPin className="h-3 w-3 text-gray-400" />
                                </div>
                                <span className="font-medium text-gray-700">{stopCount}</span>
                            </div>
                        )}
                        {(job.drivers?.profiles || job.vehicles) && (
                            <div className="flex items-center gap-1.5">
                                <div className="p-1 rounded bg-white shadow-sm border border-gray-100">
                                    <Truck className="h-3 w-3 text-gray-400" />
                                </div>
                                <div className="flex flex-col leading-none gap-0.5">
                                    {job.drivers?.profiles && (
                                        <span className="font-medium text-gray-700 truncate max-w-[80px]">
                                            {job.drivers.profiles.full_name.split(' ')[0]}
                                        </span>
                                    )}
                                    {job.vehicles && (
                                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                                            {job.vehicles.registration_number}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {getTimeDisplay() && (
                        <div className="flex items-center gap-1.5 font-medium text-gray-600">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            {getTimeDisplay()}
                        </div>
                    )}
                </div>
            </div>
        </Card>
    )
}
