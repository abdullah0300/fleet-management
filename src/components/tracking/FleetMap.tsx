'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
    APIProvider,
    Map,
    AdvancedMarker,
    InfoWindow
} from '@vis.gl/react-google-maps'
import { Truck, Gauge, Navigation2, Wifi } from 'lucide-react'
import { VehicleWithDriver } from '@/hooks/useVehicles'
import { cn } from '@/lib/utils'
import { useVehicleLocation } from '@/hooks/useVehicleLocation'
import { truckingMapStyle } from '@/lib/map-styles'
import { getVehiclePosition, getVehicleLiveData, isVehicleLive } from '@/lib/vehiclePosition'

interface FleetMapProps {
    vehicles: VehicleWithDriver[]
    activeJobs?: any[]
    selectedVehicle: string | null
    onSelectVehicle: (id: string | null) => void
}

const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 }

const STATUS_CONFIG: Record<string, { ring: string; dot: string; bg: string; label: string }> = {
    in_use: { ring: '#22c55e', dot: '#16a34a', bg: 'white', label: 'Active' },
    available: { ring: '#3b82f6', dot: '#2563eb', bg: 'white', label: 'Available' },
    maintenance: { ring: '#ef4444', dot: '#dc2626', bg: 'white', label: 'Maintenance' },
    inactive: { ring: '#6b7280', dot: '#4b5563', bg: 'white', label: 'Offline' },
}

function getStatusConfig(status: string | null) {
    return STATUS_CONFIG[status ?? ''] ?? STATUS_CONFIG.inactive
}

// Auto-fitting Map Child Component
function InnerMap({ vehicles, activeJobs = [], selectedVehicle, onSelectVehicle, liveLocations }: FleetMapProps & { liveLocations: any }) {
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null)
    const [popupInfo, setPopupInfo] = useState<VehicleWithDriver | null>(null)

    // Sync sidebar selection to map popup
    useEffect(() => {
        if (selectedVehicle) {
            const v = vehicles.find(v => v.id === selectedVehicle)
            if (v) setPopupInfo(v)
        } else {
            setPopupInfo(null)
        }
    }, [selectedVehicle, vehicles])

    const getVehicleLocation = useCallback((vehicle: VehicleWithDriver) => {
        return getVehiclePosition(vehicle, liveLocations)
    }, [liveLocations])

    const getLiveData = useCallback((vehicle: VehicleWithDriver) => {
        return getVehicleLiveData(vehicle, liveLocations)
    }, [liveLocations])

    // Auto-fit bounds logic
    const fitBounds = useCallback(() => {
        if (!mapInstance || vehicles.length === 0) return

        const liveBounds = new google.maps.LatLngBounds()
        const allBounds = new google.maps.LatLngBounds()
        let hasLivePoints = false
        let hasAnyPoints = false

        vehicles.forEach((v) => {
            const loc = getVehicleLocation(v)
            if (loc) {
                allBounds.extend(loc)
                hasAnyPoints = true

                // Only consider truly LIVE vehicles for the primary bounding box
                if (isVehicleLive(v, liveLocations)) {
                    liveBounds.extend(loc)
                    hasLivePoints = true
                }
            }
        })

        if (hasLivePoints) {
            // Fit only currently live vehicles
            mapInstance.fitBounds(liveBounds, { top: 60, right: 60, bottom: 60, left: 60 })
        } else if (hasAnyPoints) {
            // Fallback: fit all known locations if nobody is live
            mapInstance.fitBounds(allBounds, { top: 60, right: 60, bottom: 60, left: 60 })
        }
    }, [mapInstance, vehicles, getVehicleLocation, liveLocations])

    const lastVehicleCount = useRef(0)
    const wasVehicleSelected = useRef(!!selectedVehicle)

    // Run fitBounds when map loads
    useEffect(() => {
        let shouldFit = false

        // Fit if the map just loaded and we finally have vehicles
        if (vehicles.length > 0 && lastVehicleCount.current === 0) {
            shouldFit = true
        }

        // We specifically removed the code that re-fits bounds when closing a popup.
        // The user wants the map to stay zoomed in where they were looking.

        if (mapInstance && shouldFit) {
            // Wait slightly for map DOM dimensions to compute
            const timer = setTimeout(fitBounds, 300)

            lastVehicleCount.current = vehicles.length
            wasVehicleSelected.current = !!selectedVehicle

            return () => clearTimeout(timer)
        }

        lastVehicleCount.current = vehicles.length
        wasVehicleSelected.current = !!selectedVehicle
    }, [mapInstance, fitBounds, vehicles.length, selectedVehicle]) // Re-fit strictly when needed

    // Pan to specific selected vehicle
    useEffect(() => {
        if (mapInstance && selectedVehicle) {
            const v = vehicles.find(v => v.id === selectedVehicle)
            if (v) {
                const loc = getVehicleLocation(v)
                if (loc) {
                    mapInstance.panTo(loc)
                    mapInstance.setZoom(17) // Zoom in tight to clearly see the road
                }
            }
        }
    }, [mapInstance, selectedVehicle, vehicles, getVehicleLocation])

    return (
        <Map
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={10}
            mapId="fleet_map"
            className="w-full h-full"
            gestureHandling="greedy"
            disableDefaultUI={false}
            styles={truckingMapStyle}
            onIdle={(e) => {
                if (!mapInstance && e.map) {
                    setMapInstance(e.map)
                }
            }}
        >
            {vehicles.map((vehicle) => {
                const location = getVehicleLocation(vehicle)
                const isSelected = selectedVehicle === vehicle.id
                const cfg = getStatusConfig(vehicle.status)
                const live = getLiveData(vehicle)

                if (!location) return null

                const isLiveDot = isVehicleLive(vehicle, liveLocations)

                return (
                    <AdvancedMarker
                        key={vehicle.id}
                        position={location}
                        onClick={() => {
                            onSelectVehicle(vehicle.id)
                            setPopupInfo(vehicle)
                        }}
                    >
                        <div className={cn('relative cursor-pointer transition-all duration-200', isSelected && 'scale-125 z-10')}>
                            {/* Pulse ring for active vehicles */}
                            {vehicle.status === 'in_use' && (
                                <div className="absolute inset-0 rounded-full animate-ping opacity-40"
                                    style={{ background: cfg.ring, transform: 'scale(1.6)' }} />
                            )}
                            {/* Main marker */}
                            <div
                                className="relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-2 z-10"
                                style={{
                                    background: 'white',
                                    borderColor: cfg.ring,
                                }}
                            >
                                <Truck className="h-5 w-5" style={{ color: cfg.ring }} />
                            </div>
                            {/* License plate label */}
                            <div
                                className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm border border-slate-200"
                                style={{
                                    background: 'white',
                                    color: 'rgb(30, 41, 59)', // slate-800
                                }}
                            >
                                {vehicle.license_plate}
                            </div>
                            {/* Live indicator dot */}
                            {isLiveDot && (
                                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 z-20 rounded-full border-2 border-white animate-pulse"
                                    style={{ background: '#22c55e' }} />
                            )}
                        </div>
                    </AdvancedMarker>
                )
            })}

            {/* Info Popup */}
            {popupInfo && getVehicleLocation(popupInfo) && (() => {
                const live = getLiveData(popupInfo)
                const cfg = getStatusConfig(popupInfo.status)
                const loc = getVehicleLocation(popupInfo)!
                const assignedJob = activeJobs.find(j => j.vehicle_id === popupInfo.id)

                return (
                    <InfoWindow
                        position={loc}
                        onCloseClick={() => {
                            setPopupInfo(null)
                            onSelectVehicle(null)
                        }}
                    >
                        <div className="p-1 min-w-[220px] font-sans bg-white text-slate-900 rounded-sm">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 border border-slate-100">
                                    <Truck className="h-4 w-4" style={{ color: cfg.ring }} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 text-sm leading-tight">
                                        {popupInfo.make} {popupInfo.model}
                                    </p>
                                    <p className="text-xs text-slate-500 font-mono leading-none mt-0.5">{popupInfo.license_plate}</p>
                                </div>
                            </div>

                            {popupInfo.profiles && (
                                <div className="flex justify-between items-center text-[11px] mb-2 text-black">
                                    <span className="text-slate-600">Driver</span>
                                    <span className="font-bold">{popupInfo.profiles.full_name}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-[11px] mb-2 text-black">
                                <span className="text-slate-600">Status</span>
                                <span className="font-bold">{cfg.label}</span>
                            </div>

                            {assignedJob && (
                                <div className="flex justify-between items-center text-[11px] mb-2 text-black">
                                    <span className="text-slate-600">Active Job</span>
                                    <span className="font-bold text-blue-600">#{assignedJob.job_number}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center text-[11px] mb-2 text-black">
                                <span className="text-slate-600">Coordinates</span>
                                <span className="font-bold font-mono text-[9px]">
                                    {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                                </span>
                            </div>

                            {live && (
                                <>
                                    <div className="h-px w-full bg-slate-100 my-2" />
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center text-[11px]">
                                            <span className="text-slate-500 flex items-center gap-1"><Wifi className="h-3 w-3 text-green-500" /> Signal</span>
                                            <span className="font-bold text-slate-800">{live.timestamp ? new Date(live.timestamp).toLocaleTimeString() : 'Live'}</span>
                                        </div>
                                        {live.speed != null && (
                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="text-slate-500 flex items-center gap-1"><Gauge className="h-3 w-3 text-blue-500" /> Speed</span>
                                                <span className="font-bold text-slate-800">{Math.round(live.speed)} mph</span>
                                            </div>
                                        )}
                                        {live.heading != null && (
                                            <div className="flex justify-between items-center text-[11px]">
                                                <span className="text-slate-500 flex items-center gap-1">
                                                    <Navigation2 className="h-3 w-3 text-blue-500" style={{ transform: `rotate(${live.heading}deg)` }} /> Heading
                                                </span>
                                                <span className="font-bold text-slate-800">{Math.round(live.heading)}°</span>
                                            </div>
                                        )}
                                        <div className="pt-2 mt-2 border-t border-slate-100">
                                            {/* GPS stats exist but coordinates are now shown above */}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </InfoWindow>
                )
            })()}
        </Map>
    )
}

export function FleetMap({ vehicles, activeJobs = [], selectedVehicle, onSelectVehicle }: FleetMapProps) {
    // NEXT_PUBLIC_* vars are inlined at build time — read directly, no useEffect needed
    const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    const { locations: liveLocations } = useVehicleLocation()

    if (!googleMapsKey) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl">
                <div className="text-center p-8">
                    <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <Truck className="h-9 w-9 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Maps API Key Required</h3>
                    <p className="text-sm text-slate-500 max-w-xs">
                        Add <code className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your <code className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded text-xs">.env.local</code>
                    </p>
                </div>
            </div>
        )
    }

    return (
        <APIProvider apiKey={googleMapsKey}>
            <InnerMap
                vehicles={vehicles}
                activeJobs={activeJobs}
                selectedVehicle={selectedVehicle}
                onSelectVehicle={onSelectVehicle}
                liveLocations={liveLocations}
            />
        </APIProvider>
    )
}
