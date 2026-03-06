'use client'

import { useState, useEffect } from 'react'
import {
    Activity, Truck, Navigation2, WifiOff,
    Radio, MapIcon, List, Clock, Wifi, Gauge, User
} from 'lucide-react'
import { useVehicles } from '@/hooks/useVehicles'
import { useJobs } from '@/hooks/useJobs'
import { Skeleton } from '@/components/ui/skeleton'
import { FleetMap } from '@/components/tracking/FleetMap'
import { cn } from '@/lib/utils'
import { useVehicleLocation } from '@/hooks/useVehicleLocation'

const STATUS = {
    in_use: { label: 'Active', ring: 'ring-green-500/30 border-green-500', dot: 'bg-green-500', text: 'text-green-600', badge: 'bg-[#A5D6A7]/30 text-green-800' },
    available: { label: 'Available', ring: 'ring-blue-500/30 border-blue-500', dot: 'bg-blue-500', text: 'text-blue-600', badge: 'bg-[#90CAF9]/30 text-blue-800' },
    maintenance: { label: 'Maintenance', ring: 'ring-red-400/30 border-red-400', dot: 'bg-red-500', text: 'text-red-600', badge: 'bg-red-100 text-red-800' },
    inactive: { label: 'Offline', ring: 'ring-slate-300 border-slate-300', dot: 'bg-slate-400', text: 'text-slate-500', badge: 'bg-slate-100 text-slate-600' },
} as const

function getStatus(s: string | null) {
    return STATUS[s as keyof typeof STATUS] ?? STATUS.inactive
}

export default function TrackingPage() {
    const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles(1, 100)
    const { data: jobsData, isLoading: jobsLoading } = useJobs(1, 100)
    const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map')
    const { locations: liveLocations } = useVehicleLocation()

    // Client-only clock
    const [lastUpdated, setLastUpdated] = useState('')
    useEffect(() => {
        const tick = () => setLastUpdated(new Date().toLocaleTimeString())
        tick()
        const t = setInterval(tick, 30000)
        return () => clearInterval(t)
    }, [])

    const vehicles = vehiclesData?.data || []
    const jobs = jobsData?.data || []

    const activeVehicles = vehicles.filter(v => v.status === 'in_use' || v.status === 'available')
    const totalVehicles = vehicles.length
    const availableCnt = vehicles.filter(v => v.status === 'available').length
    const inactiveCnt = vehicles.filter(v => v.status === 'maintenance' || v.status === 'inactive').length
    const activeJobs = jobs.filter(j => j.status === 'in_progress' || j.status === 'assigned')

    // Live count calculates by merging WebSocket memory with initial DB payload
    const liveCount = vehicles.filter(v => {
        const live = liveLocations[v.id] || v.current_location as any
        if (!live?.timestamp) return false
        const diffSeconds = (new Date().getTime() - new Date(live.timestamp).getTime()) / 1000
        return diffSeconds < 60
    }).length

    const isLoading = vehiclesLoading || jobsLoading

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-5 bg-slate-50 min-h-[calc(100vh-4rem)]">

            {/* ── Header ── */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-800">Live Fleet Tracking</h1>
                    <div className={cn(
                        'ml-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
                        liveCount > 0
                            ? 'bg-[#A5D6A7]/30 text-green-800'
                            : 'bg-slate-200 text-slate-600'
                    )}>
                        <span className={cn('w-2 h-2 rounded-full', liveCount > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-400')} />
                        {liveCount > 0 ? `${liveCount} Live Signals` : 'No Signals'}
                    </div>
                </div>

                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 gap-1 shadow-sm">
                    <button
                        onClick={() => setViewMode('map')}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                            viewMode === 'map'
                                ? 'bg-slate-100 text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        <MapIcon className="h-3.5 w-3.5" /> Map
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                            viewMode === 'list'
                                ? 'bg-slate-100 text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        <List className="h-3.5 w-3.5" /> List
                    </button>
                </div>
            </div>

            {/* ── Stats Row (Matches Dashboard v2 TopStatsRow) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                {isLoading ? (
                    [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl bg-white" />)
                ) : (
                    <>
                        <div className="bg-[#A5D6A7] rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold">
                                <Activity className="h-4 w-4" />
                                <span className="text-sm">Active Fleet</span>
                            </div>
                            <div className="text-3xl font-black text-slate-900 flex items-baseline gap-1 pb-4">
                                {activeVehicles.length}
                                <span className="text-lg font-bold text-slate-700/70">/{totalVehicles}</span>
                            </div>
                        </div>

                        <div className="bg-[#90CAF9] rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold">
                                <Truck className="h-4 w-4" />
                                <span className="text-sm">Available</span>
                            </div>
                            <div className="text-3xl font-black text-slate-900 flex items-baseline gap-1 pb-4">
                                {availableCnt}
                            </div>
                        </div>

                        <div className="bg-[#E1BEE7] rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold">
                                <Navigation2 className="h-4 w-4" />
                                <span className="text-sm block">Active Jobs</span>
                            </div>
                            <div className="text-3xl font-black text-slate-900 flex items-baseline gap-1 pb-4">
                                {activeJobs.length}
                            </div>
                        </div>

                        <div className="bg-[#E3F2FD] rounded-2xl p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                            <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold">
                                <WifiOff className="h-4 w-4" />
                                <span className="text-sm">Offline / Maint.</span>
                            </div>
                            <div className="text-3xl font-black text-slate-900 flex items-baseline gap-1 pb-4">
                                {inactiveCnt}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── Main Tracking Area (Matches Dashboard v2 TrackingSection) ── */}
            <div className="grid gap-4 lg:grid-cols-[1fr_2.5fr] min-h-[450px] flex-1">

                {/* Sidebar List */}
                <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 p-4 flex flex-col overflow-hidden">
                    <div className="flex flex-col gap-1 mb-4 shrink-0 px-1">
                        <h2 className="text-base font-bold text-slate-800">Vehicle Roster</h2>
                        <p className="text-xs text-slate-500">Select a vehicle to view status</p>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 hide-scrollbar -mx-2 px-2 pb-4">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl bg-slate-50" />)
                        ) : vehicles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                                <Truck className="h-8 w-8 opacity-20" />
                                <span className="text-sm">No vehicles</span>
                            </div>
                        ) : (
                            vehicles.map(vehicle => {
                                const st = getStatus(vehicle.status)
                                const activeJob = activeJobs.find(j => j.vehicle_id === vehicle.id)
                                const isSelected = selectedVehicle === vehicle.id

                                // Merge WebSocket updates with initial DB fetch
                                const live = liveLocations[vehicle.id] || vehicle.current_location as any

                                let hasLive = false
                                if (live?.lat && live?.lng && live?.timestamp) {
                                    const diffSeconds = (new Date().getTime() - new Date(live.timestamp).getTime()) / 1000
                                    if (diffSeconds < 60) hasLive = true
                                }

                                return (
                                    <div
                                        key={vehicle.id}
                                        onClick={() => setSelectedVehicle(isSelected ? null : vehicle.id)}
                                        className={cn(
                                            "group cursor-pointer rounded-xl border p-3 transition-all duration-200",
                                            isSelected
                                                ? `bg-blue-50/50 border-blue-200 shadow-sm ring-1 ring-blue-500/20`
                                                : "bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm"
                                        )}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className={cn("w-2 h-2 rounded-full shrink-0", st.dot)} />
                                                <span className="font-bold text-sm text-slate-800 truncate">
                                                    {vehicle.make} {vehicle.model}
                                                </span>
                                            </div>
                                            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap', st.badge)}>
                                                {st.label}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-mono text-slate-500">{vehicle.license_plate}</span>
                                            {activeJob && (
                                                <span className="text-blue-600 font-semibold flex items-center gap-1">
                                                    <Navigation2 className="h-3 w-3" />
                                                    Job #{activeJob.job_number}
                                                </span>
                                            )}
                                        </div>

                                        {hasLive && (
                                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-3">
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-green-600">
                                                    <Wifi className="h-3 w-3" /> Live
                                                </div>
                                                {live.speed != null && (
                                                    <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                                                        <Gauge className="h-3 w-3 text-slate-400" />
                                                        {Math.round(live.speed)} mph
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Map Area */}
                <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 p-1.5 flex flex-col relative overflow-hidden">
                    <div className="relative h-full w-full rounded-[14px] overflow-hidden bg-slate-100">
                        <FleetMap
                            vehicles={vehicles}
                            activeJobs={activeJobs}
                            selectedVehicle={selectedVehicle}
                            onSelectVehicle={setSelectedVehicle}
                        />

                        {/* Map Overlay Badge */}
                        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3 py-2 rounded-xl shadow-md border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-700">
                            <Radio className="h-4 w-4 text-blue-500" />
                            {vehicles.filter(v => {
                                const loc = v.current_location as any
                                const live = liveLocations[v.id]
                                return (live?.lat && live?.lng) || (loc?.lat && loc?.lng)
                            }).length} of {vehicles.length} tracking on map
                        </div>

                        {/* Last Updated Footer */}
                        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-3 py-2 rounded-xl shadow-md border border-slate-200 flex items-center gap-2 text-[11px] font-bold text-slate-500" suppressHydrationWarning>
                            <Clock className="h-3.5 w-3.5" />
                            {lastUpdated ? `Updated ${lastUpdated}` : 'Updating…'}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
