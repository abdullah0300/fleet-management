'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { JobRouteMap } from '@/components/jobs/JobRouteMap'
import { useJobs } from '@/hooks/useJobs'
import { formatDate } from '@/lib/utils'

export function RouteMapOverlay({
    selectedJobId,
    onCloseDetails,
    onSelectJob
}: {
    selectedJobId: string | null;
    onCloseDetails: () => void;
    onSelectJob?: (id: string) => void;
}) {
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearchFocused, setIsSearchFocused] = useState(false)
    const { data: jobsData, isLoading } = useJobs()
    const allJobs = jobsData?.data || []

    // Pick the selected job
    const activeJob = selectedJobId ? allJobs.find(j => j.id === selectedJobId) : null

    // Formulate fleet locations if no job is selected. Only show trucks that are ACTIVE on a job (in_progress).
    // In a real app, this would use the real-time vehicle GPS coordinates via a telematics API instead of the stop location,
    // but for now, we use the job's current assigned vehicle data if available, or fall back to the first stop to simulate a live truck map.
    const fleetLocations = !activeJob ? allJobs
        .filter(j => {
            if (j.status !== 'in_progress') return false
            if (searchQuery) {
                const q = searchQuery.toLowerCase()
                const plate = j.vehicles?.license_plate?.toLowerCase() || ''
                const make = j.vehicles?.make?.toLowerCase() || ''
                const jobNo = j.job_number?.toLowerCase() || ''
                return plate.includes(q) || make.includes(q) || jobNo.includes(q)
            }
            return true
        })
        .map(j => {
            // Ideally, j.vehicles.current_lat/lng would exist. Here we simulate the map marker
            // using the first stop IF the job is active to represent where the truck currently is.
            const stops = j.job_stops?.sort((a, b) => a.sequence_order - b.sequence_order) || []
            const firstStop = stops[0]
            if (!firstStop || !firstStop.latitude || !firstStop.longitude) return null
            return {
                id: j.id,
                lat: firstStop.latitude, // In real world -> j.vehicles.latitude
                lng: firstStop.longitude, // In real world -> j.vehicles.longitude
                label: j.vehicles?.make ? `${j.vehicles.make} #${j.vehicles.license_plate}` : 'Unassigned Truck',
                jobNum: j.job_number
            }
        })
        .filter(Boolean) as { id: string, lat: number, lng: number, label: string, jobNum: string }[] : []

    // Formulate waypoints
    const sortedStops = activeJob?.job_stops?.sort((a, b) => a.sequence_order - b.sequence_order) || []
    const pickup = sortedStops[0]
    const delivery = sortedStops[sortedStops.length - 1]

    const waypoints = sortedStops.map((stop, i) => {
        let type: 'pickup' | 'dropoff' | 'waypoint' = 'waypoint'
        if (i === 0) type = 'pickup'
        if (i === sortedStops.length - 1 && sortedStops.length > 1) type = 'dropoff'
        return {
            lat: stop.latitude || 0,
            lng: stop.longitude || 0,
            type,
            sequence: stop.sequence_order,
            address: stop.address || 'Unknown'
        }
    })

    // Formatting Helpers
    const getCity = (addr: string) => addr ? addr.split(',')[0].substring(0, 20) : 'Unknown Location'
    const pickupDate = activeJob?.scheduled_date ? formatDate(activeJob.scheduled_date) : 'N/A'
    const deliveryDate = activeJob?.scheduled_date ? formatDate(activeJob.scheduled_date) : 'N/A'
    const driverName = activeJob?.drivers?.profiles?.full_name || 'Unassigned'
    const truckName = activeJob?.vehicles?.make ? `${activeJob.vehicles.make} ${activeJob.vehicles.license_plate}` : 'Unassigned'

    // Fake distance/speed if not available
    const traveled = activeJob?.routes?.distance_km ? `${Math.round(activeJob.routes.distance_km)}km` : '240km'
    const speed = '80km/h' // Mocked telematics

    if (isLoading) {
        return <div className="h-full rounded-2xl bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">Loading Map...</div>
    }

    return (
        <div className="relative h-full w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
            {/* The Map */}
            <JobRouteMap
                waypoints={waypoints.filter(w => w.lat !== 0 && w.lng !== 0)}
                vehicleId={activeJob?.vehicle_id}
                fleetLocations={fleetLocations}
            />

            <div className="absolute top-4 left-4 right-4 md:right-auto md:w-[350px]">
                <div className="relative">
                    <Input
                        placeholder="Search vehicles, customers & others.."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        className="w-full bg-white/95 backdrop-blur shadow-md border-0 rounded-xl pr-10 text-sm focus-visible:ring-1 focus-visible:ring-[#1565C0]"
                    />
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />

                    {/* Search Autocomplete Dropdown */}
                    {isSearchFocused && searchQuery.length > 0 && (
                        <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden z-50">
                            {fleetLocations.length > 0 ? (
                                <ul className="max-h-[250px] overflow-y-auto py-2">
                                    {fleetLocations.map((loc) => (
                                        <li
                                            key={loc.id}
                                            onClick={() => {
                                                if (onSelectJob) onSelectJob(loc.id)
                                                setSearchQuery('')
                                                setIsSearchFocused(false)
                                            }}
                                            className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors border-b border-slate-50 last:border-0"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-800">{loc.label}</span>
                                                <span className="text-xs text-slate-500">Job #{loc.jobNum} • Live Location</span>
                                            </div>
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="p-4 text-center text-sm text-slate-500">
                                    No active vehicles match "{searchQuery}"
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Details Card Overlay (Only shown if a job is selected) */}
            {activeJob && (
                <div className="absolute top-16 left-4 w-[280px] bg-white rounded-[12px] shadow-lg border border-slate-100 overflow-hidden hide-scrollbar max-h-[calc(100%-80px)] overflow-y-auto">

                    {/* Header */}
                    <div className="p-3 flex justify-between items-center">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-[12px] font-medium text-slate-500">Load id:</span>
                            <span className="text-[15px] font-bold text-slate-900">#{activeJob.job_number}</span>
                        </div>
                        <button onClick={onCloseDetails} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>

                    <div className="px-3"><div className="h-px bg-slate-100 w-full"></div></div>

                    {/* Dates */}
                    <div className="p-3 space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500 font-medium">Pick up date:</span>
                            <span className="text-slate-800 font-semibold">{pickupDate}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500 font-medium">Delivery date:</span>
                            <span className="text-slate-800 font-semibold">{deliveryDate}</span>
                        </div>
                    </div>

                    <div className="px-3"><div className="h-px bg-slate-100 w-full"></div></div>

                    {/* Locations */}
                    <div className="p-3 relative">
                        {/* The dotted line */}
                        <div className="absolute left-[17px] top-[20px] bottom-[20px] w-[2px] border-l-[2px] border-dotted border-blue-200"></div>

                        <div className="flex items-start gap-3 mb-4 relative z-10">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 mt-0.5 shadow-[0_0_0_2px_#DBEAFE]"></div>
                            <div className="flex justify-between w-full">
                                <span className="text-[11px] text-slate-500">Pick up</span>
                                <span className="text-[11px] font-semibold text-slate-800 text-right max-w-[120px] leading-tight truncate">{getCity(pickup?.address || '')}</span>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 relative z-10">
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-100 shrink-0 mt-0.5 flex items-center justify-center">
                                <div className="w-1 h-1 rounded-full bg-blue-600"></div>
                            </div>
                            <div className="flex justify-between w-full">
                                <span className="text-[11px] text-slate-500">Delivery</span>
                                <span className="text-[11px] font-semibold text-slate-800 text-right max-w-[120px] leading-tight truncate">{getCity(delivery?.address || '')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="px-3"><div className="h-px bg-slate-100 w-full"></div></div>

                    {/* Metrics Table */}
                    <div className="p-3 space-y-1.5 bg-white">
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Driver</span>
                            <span className="text-slate-800 font-bold truncate max-w-[120px] md:max-w-none text-right">{driverName}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Truck</span>
                            <span className="text-slate-800 font-bold truncate max-w-[120px] md:max-w-none text-right">{truckName}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Traveled</span>
                            <span className="text-slate-800 font-bold">{traveled}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-slate-500">Speed</span>
                            <span className="text-slate-800 font-bold">{speed}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
