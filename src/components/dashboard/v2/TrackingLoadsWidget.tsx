'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Truck, CheckCircle2, Search } from 'lucide-react'
import { useJobs } from '@/hooks/useJobs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn, formatDate } from '@/lib/utils'

export function TrackingLoadsWidget({
    selectedJobId,
    onSelectJob
}: {
    selectedJobId: string | null;
    onSelectJob: (id: string) => void;
}) {
    const { data: jobsData, isLoading } = useJobs()
    const allJobs = jobsData?.data || []

    const [filter, setFilter] = useState<'all' | 'in_transit' | 'delivery'>('all')
    const [searchQuery, setSearchQuery] = useState('')

    // Derived lists
    const activeJobs = allJobs.filter(j => j.status === 'in_progress' || j.status === 'completed' || j.status === 'pending')

    const loadsData = activeJobs.map(job => {
        const stops = job.job_stops?.sort((a, b) => a.sequence_order - b.sequence_order) || []
        const startStop = stops[0]
        const endStop = stops[stops.length - 1]

        // Use full address string but clean it up for UI display
        const getCity = (addr: string) => addr ? addr.split(',').slice(0, 2).join(',').substring(0, 25) : 'Unknown Location'

        let displayStatus = 'Pending'
        let badgeColor = 'bg-slate-100 text-slate-600'
        if (job.status === 'completed') {
            displayStatus = 'Delivered'
            badgeColor = 'bg-[#A5D6A7] text-slate-800'
        } else if (job.status === 'in_progress') {
            displayStatus = 'In-transit'
            badgeColor = 'bg-[#E1BEE7] text-slate-800' // Using purple as per mockup for in-transit
        }

        return {
            id: job.id,
            jobNumber: job.job_number,
            vehicleMake: job.vehicles?.make || 'Truck',
            vehiclePlate: job.vehicles?.license_plate || 'Unassigned',
            status: job.status,
            displayStatus,
            badgeColor,
            startDate: job.scheduled_date ? formatDate(job.scheduled_date) : 'N/A',
            startCity: getCity(startStop?.address || ''),
            endDate: job.scheduled_date ? formatDate(job.scheduled_date) : 'N/A', // Using scheduled for both as simple mockup
            endCity: getCity(endStop?.address || ''),
            progress: job.status === 'completed' ? 100 : (job.status === 'in_progress' ? 60 : 10)
        }
    })

    const filteredLoads = loadsData.filter(load => {
        if (filter === 'in_transit' && load.status !== 'in_progress') return false
        if (filter === 'delivery' && load.status !== 'completed') return false

        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return load.jobNumber.toLowerCase().includes(q) ||
                load.vehicleMake.toLowerCase().includes(q) ||
                load.vehiclePlate.toLowerCase().includes(q) ||
                load.startCity.toLowerCase().includes(q) ||
                load.endCity.toLowerCase().includes(q)
        }
        return true
    })

    const countAll = loadsData.length
    const countInTransit = loadsData.filter(l => l.status === 'in_progress').length
    const countDelivery = loadsData.filter(l => l.status === 'completed').length

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-800">Tracking Loads</h2>
            </div>

            {/* Search Bar */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search by job #, vehicle, or city..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 bg-slate-50 border-slate-200 focus-visible:ring-1 focus-visible:ring-[#1565C0] rounded-xl text-sm"
                />
            </div>

            {/* Tab Filters */}
            <div className="flex items-center gap-2 mb-4 bg-slate-50/50 p-1 rounded-full border border-slate-100 self-start">
                <button
                    onClick={() => setFilter('all')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
                        filter === 'all' ? "bg-[#1565C0] text-white shadow-md" : "text-slate-500 hover:bg-slate-100"
                    )}
                >
                    All Loads
                    <span className={cn("px-1.5 rounded border text-xs", filter === 'all' ? "bg-white text-[#1565C0] border-transparent" : "bg-white border-slate-200")}>{countAll}</span>
                </button>
                <button
                    onClick={() => setFilter('in_transit')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
                        filter === 'in_transit' ? "bg-[#1565C0] text-white shadow-md" : "text-slate-500 hover:bg-slate-100"
                    )}
                >
                    In-transit
                    <span className={cn("px-1.5 rounded border text-xs", filter === 'in_transit' ? "bg-white text-[#1565C0] border-transparent" : "bg-[#E1BEE7] text-slate-800 border-transparent")}>
                        {countInTransit < 10 ? `0${countInTransit}` : countInTransit}
                    </span>
                </button>
                <button
                    onClick={() => setFilter('delivery')}
                    className={cn(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all",
                        filter === 'delivery' ? "bg-[#1565C0] text-white shadow-md" : "text-slate-500 hover:bg-slate-100"
                    )}
                >
                    Delivery
                    <span className={cn("px-1.5 rounded border text-xs", filter === 'delivery' ? "bg-white text-[#1565C0] border-transparent" : "bg-[#90CAF9] text-slate-800 border-transparent")}>
                        {countDelivery < 10 ? `0${countDelivery}` : countDelivery}
                    </span>
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-3 min-h-0 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent pb-4">
                {isLoading ? (
                    <div className="text-center text-slate-400 py-10">Loading active loads...</div>
                ) : filteredLoads.length === 0 ? (
                    <div className="text-center text-slate-400 py-10">No loads matching this filter.</div>
                ) : (
                    filteredLoads.map((load) => (
                        <div
                            key={load.id}
                            onClick={() => onSelectJob(load.id)}
                            className={cn(
                                "border rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md",
                                selectedJobId === load.id ? "ring-2 ring-[#1565C0] shadow-md relative" : "",
                                load.displayStatus === 'Delivered' ? 'border-[#A5D6A7]/50 bg-[#A5D6A7]/10' :
                                    load.displayStatus === 'In-transit' ? 'border-[#E1BEE7]/50 bg-[#E1BEE7]/10' :
                                        'border-slate-100 bg-white'
                            )}
                        >
                            {selectedJobId === load.id && (
                                <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-[#1565C0] rounded-l-2xl"></div>
                            )}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
                                        <Truck className="h-4 w-4 text-slate-600" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-sm">{load.vehicleMake}</div>
                                        <div className="text-xs font-medium text-slate-400">#{load.jobNumber}</div>
                                    </div>
                                </div>
                                <Badge className={cn("shadow-none border-0 text-xs px-2 py-0.5 whitespace-nowrap", load.badgeColor)}>
                                    {load.displayStatus}
                                </Badge>
                            </div>

                            <div className="relative pt-4">
                                {/* Track Line Container */}
                                <div className="absolute top-6 left-2 right-2 h-0.5 bg-slate-800"></div>

                                {/* Start Point */}
                                <div className="absolute top-5 left-0 w-2.5 h-2.5 rounded-full bg-slate-800 ring-4 ring-white"></div>

                                {/* End Point */}
                                <div className="absolute top-5 right-0 w-2.5 h-2.5 rounded-full bg-slate-800 ring-4 ring-white"></div>

                                {/* Truck Progress Indicator */}
                                <div
                                    className="absolute top-[0.6rem] transition-all duration-500 ease-in-out"
                                    style={{ left: `calc(${load.progress}% - 14px)` }}
                                >
                                    {load.progress === 100 ? (
                                        <div className="bg-slate-800 text-white rounded-full p-0.5 ring-2 ring-white">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                    ) : (
                                        <div className="bg-white rounded border-2 border-slate-800 p-0.5">
                                            <Truck className="h-3 w-3 text-slate-800" fill="currentColor" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-between mt-3 text-xs">
                                    <div className="text-left">
                                        <div className="font-semibold text-slate-600">{load.startDate}</div>
                                        <div className="font-medium text-slate-400 mt-0.5">{load.startCity}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold text-slate-600">{load.endDate}</div>
                                        <div className="font-medium text-slate-400 mt-0.5">{load.endCity}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
