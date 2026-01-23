'use client'

import { useState } from 'react'
import { MapPin, Truck, Navigation, Clock, Activity, Wifi, WifiOff, Maximize2, List, Map as MapIcon } from 'lucide-react'
import { useVehicles } from '@/hooks/useVehicles'
import { useJobs } from '@/hooks/useJobs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export default function TrackingPage() {
    const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles()
    const { data: jobsData, isLoading: jobsLoading } = useJobs()
    const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map')

    const vehicles = vehiclesData?.data || []
    const jobs = jobsData?.data || []

    // Get active vehicles (in_use status)
    const activeVehicles = vehicles.filter(v => v.status === 'in_use')
    const availableVehicles = vehicles.filter(v => v.status === 'available')
    const inactiveVehicles = vehicles.filter(v => v.status === 'maintenance' || v.status === 'inactive')

    // Get active jobs
    const activeJobs = jobs.filter(j => j.status === 'in_progress' || j.status === 'assigned')

    const getVehicleStatus = (status: string | null) => {
        switch (status) {
            case 'in_use': return { color: 'bg-status-success', label: 'Active', online: true }
            case 'available': return { color: 'bg-status-info', label: 'Available', online: true }
            case 'maintenance': return { color: 'bg-status-error', label: 'Maintenance', online: false }
            default: return { color: 'bg-muted', label: 'Offline', online: false }
        }
    }

    const isLoading = vehiclesLoading || jobsLoading

    return (
        <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Live Tracking</h1>
                    <p className="text-muted-foreground text-sm">Real-time vehicle locations and status</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center bg-muted rounded-lg p-1">
                        <Button
                            variant={viewMode === 'map' ? 'default' : 'ghost'}
                            size="sm"
                            className="gap-2"
                            onClick={() => setViewMode('map')}
                        >
                            <MapIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Map</span>
                        </Button>
                        <Button
                            variant={viewMode === 'list' ? 'default' : 'ghost'}
                            size="sm"
                            className="gap-2"
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-4 w-4" />
                            <span className="hidden sm:inline">List</span>
                        </Button>
                    </div>
                    <Button variant="outline" size="icon">
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 shrink-0">
                {isLoading ? (
                    <>
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-16 rounded-xl" />
                        ))}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-3 p-3 bg-status-success-muted rounded-xl border border-status-success/20">
                            <div className="w-10 h-10 rounded-full bg-status-success flex items-center justify-center">
                                <Activity className="h-5 w-5 text-status-success-foreground" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{activeVehicles.length}</p>
                                <p className="text-xs text-status-success">Active</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-status-info-muted rounded-xl border border-status-info/20">
                            <div className="w-10 h-10 rounded-full bg-status-info flex items-center justify-center">
                                <Truck className="h-5 w-5 text-status-info-foreground" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{availableVehicles.length}</p>
                                <p className="text-xs text-status-info">Available</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-accent-purple-muted rounded-xl border border-accent-purple/20">
                            <div className="w-10 h-10 rounded-full bg-accent-purple flex items-center justify-center">
                                <Navigation className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{activeJobs.length}</p>
                                <p className="text-xs text-accent-purple">Active Jobs</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-xl border">
                            <div className="w-10 h-10 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                                <WifiOff className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{inactiveVehicles.length}</p>
                                <p className="text-xs text-muted-foreground">Offline</p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Main Content - Map & Sidebar */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4 min-h-0">
                {/* Map Area */}
                <Card className="relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                        {/* Map Placeholder */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center p-6">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                                    <MapPin className="h-10 w-10 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold text-muted-foreground">Map Integration</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                                    Connect Google Maps or Mapbox API to display live vehicle locations
                                </p>
                                <Button variant="outline" className="mt-4 gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Configure Maps API
                                </Button>
                            </div>
                        </div>

                        {/* Fake Map Grid */}
                        <div className="absolute inset-0 opacity-10">
                            <div className="grid grid-cols-8 h-full">
                                {[...Array(8)].map((_, i) => (
                                    <div key={i} className="border-r border-slate-400" />
                                ))}
                            </div>
                            <div className="absolute inset-0 grid grid-rows-6">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="border-b border-slate-400" />
                                ))}
                            </div>
                        </div>

                        {/* Simulated Vehicle Markers */}
                        {activeVehicles.slice(0, 3).map((vehicle, index) => {
                            const positions = [
                                { left: '30%', top: '40%' },
                                { left: '60%', top: '25%' },
                                { left: '45%', top: '60%' },
                            ]
                            const pos = positions[index] || positions[0]

                            return (
                                <div
                                    key={vehicle.id}
                                    className={cn(
                                        "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all hover:scale-110",
                                        selectedVehicle === vehicle.id && "scale-125"
                                    )}
                                    style={{ left: pos.left, top: pos.top }}
                                    onClick={() => setSelectedVehicle(vehicle.id)}
                                >
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-status-success flex items-center justify-center shadow-lg animate-pulse">
                                            <Truck className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border-2 border-status-success flex items-center justify-center">
                                            <Wifi className="h-2 w-2 text-status-success" />
                                        </div>
                                    </div>
                                    <div className="mt-1 px-2 py-0.5 bg-background/90 rounded text-xs font-medium text-center shadow">
                                        {vehicle.registration_number}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </Card>

                {/* Vehicle Sidebar */}
                <div className="flex flex-col gap-3 overflow-hidden">
                    <div className="flex items-center justify-between shrink-0">
                        <h2 className="font-semibold">Fleet Status</h2>
                        <Badge variant="outline" className="gap-1">
                            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
                            Live
                        </Badge>
                    </div>

                    {/* Vehicle List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                        {isLoading ? (
                            <>
                                {[...Array(5)].map((_, i) => (
                                    <Skeleton key={i} className="h-20 rounded-xl" />
                                ))}
                            </>
                        ) : vehicles.length === 0 ? (
                            <div className="text-center p-6 text-muted-foreground">
                                <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No vehicles in fleet</p>
                            </div>
                        ) : (
                            vehicles.map((vehicle) => {
                                const status = getVehicleStatus(vehicle.status)
                                const activeJob = activeJobs.find(j => j.vehicle_id === vehicle.id)
                                const location = vehicle.current_location as { address?: string } | null

                                return (
                                    <Card
                                        key={vehicle.id}
                                        className={cn(
                                            "cursor-pointer transition-all hover:shadow-md",
                                            selectedVehicle === vehicle.id && "ring-2 ring-primary"
                                        )}
                                        onClick={() => setSelectedVehicle(
                                            selectedVehicle === vehicle.id ? null : vehicle.id
                                        )}
                                    >
                                        <CardContent className="p-3">
                                            <div className="flex items-start gap-3">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                                    status.online ? "bg-status-success-muted" : "bg-muted"
                                                )}>
                                                    <Truck className={cn(
                                                        "h-5 w-5",
                                                        status.online ? "text-status-success" : "text-muted-foreground"
                                                    )} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-medium text-sm truncate">
                                                            {vehicle.make} {vehicle.model}
                                                        </span>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <span className={cn(
                                                                "w-2 h-2 rounded-full",
                                                                status.color
                                                            )} />
                                                            <span className="text-xs text-muted-foreground">
                                                                {status.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground font-mono">
                                                        {vehicle.registration_number}
                                                    </p>
                                                    {vehicle.profiles && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Driver: {vehicle.profiles.full_name}
                                                        </p>
                                                    )}
                                                    {activeJob && (
                                                        <div className="mt-2 flex items-center gap-1 text-xs">
                                                            <Navigation className="h-3 w-3 text-accent-purple" />
                                                            <span className="text-accent-purple font-medium">
                                                                {activeJob.job_number}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {location?.address && (
                                                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                            <MapPin className="h-3 w-3" />
                                                            <span className="truncate">{location.address}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })
                        )}
                    </div>

                    {/* Last Updated */}
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground shrink-0 pt-2 border-t">
                        <Clock className="h-3 w-3" />
                        Last updated: {new Date().toLocaleTimeString()}
                    </div>
                </div>
            </div>
        </div>
    )
}
