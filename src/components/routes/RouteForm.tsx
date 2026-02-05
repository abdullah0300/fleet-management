'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MapPin, Navigation, Clock, DollarSign, Calculator, RefreshCw, Fuel, Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RouteInsert } from '@/types/database'
import { LocationPicker } from '@/components/ui/LocationPicker'
import { calculateTolls } from '@/lib/services/tollguru'
import { RouteMap } from './RouteMap'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const routeFormSchema = z.object({
    name: z.string().min(1, 'Route name is required'),
    distance_km: z.number().min(0),
    estimated_duration: z.number().min(0),
    estimated_toll_cost: z.number(),
    estimated_fuel_cost: z.number(),
    fuel_price_per_liter: z.number(),
})

interface RouteFormData {
    name: string
    distance_km: number
    estimated_duration: number
    estimated_toll_cost: number
    estimated_fuel_cost: number
    fuel_price_per_liter: number
}

interface RouteStop {
    id: string
    address: string
    lat?: number
    lng?: number
    type: 'origin' | 'waypoint' | 'destination'
}

interface RouteFormProps {
    initialData?: Partial<RouteFormData & {
        id: string
        origin?: { address?: string; lat?: number; lng?: number }
        destination?: { address?: string; lat?: number; lng?: number }
        waypoints?: { address?: string; lat?: number; lng?: number }[]
    }>
    onSubmit: (data: RouteInsert) => Promise<void>
    isSubmitting?: boolean
}

// Helper to get Mapbox Route with multiple waypoints
async function getMapboxRoute(stops: RouteStop[]) {
    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN || stops.length < 2) return null

    // Build coordinates string: lng,lat;lng,lat;...
    const validStops = stops.filter(s => s.lat && s.lng)
    if (validStops.length < 2) return null

    const coords = validStops.map(s => `${s.lng},${s.lat}`).join(';')

    const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?steps=true&geometries=geojson&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
    )
    if (!response.ok) return null
    const json = await response.json()
    return json.routes?.[0]
}

export function RouteForm({ initialData, onSubmit, isSubmitting }: RouteFormProps) {
    // Build initial stops from initialData
    const buildInitialStops = (): RouteStop[] => {
        const stops: RouteStop[] = []

        // Origin
        if (initialData?.origin?.address) {
            stops.push({
                id: '1',
                address: initialData.origin.address,
                lat: initialData.origin.lat,
                lng: initialData.origin.lng,
                type: 'origin'
            })
        } else {
            stops.push({ id: '1', address: '', type: 'origin' })
        }

        // Waypoints
        if (initialData?.waypoints && Array.isArray(initialData.waypoints)) {
            initialData.waypoints.forEach((wp, idx) => {
                stops.push({
                    id: `wp-${idx}`,
                    address: wp.address || '',
                    lat: wp.lat,
                    lng: wp.lng,
                    type: 'waypoint'
                })
            })
        }

        // Destination
        if (initialData?.destination?.address) {
            stops.push({
                id: '2',
                address: initialData.destination.address,
                lat: initialData.destination.lat,
                lng: initialData.destination.lng,
                type: 'destination'
            })
        } else {
            stops.push({ id: '2', address: '', type: 'destination' })
        }

        return stops
    }

    const [stops, setStops] = useState<RouteStop[]>(buildInitialStops)
    const [isCalculating, setIsCalculating] = useState(false)

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<RouteFormData>({
        resolver: zodResolver(routeFormSchema),
        defaultValues: {
            name: initialData?.name || '',
            distance_km: initialData?.distance_km || 0,
            estimated_duration: initialData?.estimated_duration || 0,
            estimated_toll_cost: initialData?.estimated_toll_cost || 0,
            estimated_fuel_cost: initialData?.estimated_fuel_cost || 0,
            fuel_price_per_liter: 4.00,
        },
    })

    const distanceKm = watch('distance_km')
    const fuelPrice = watch('fuel_price_per_liter')

    // Recalculate fuel cost if price changes
    useEffect(() => {
        if (distanceKm > 0 && fuelPrice > 0) {
            // Assume 8 MPG efficiency for trucks
            const fuelCost = (distanceKm / 8) * fuelPrice
            setValue('estimated_fuel_cost', Number(fuelCost.toFixed(2)))
        }
    }, [distanceKm, fuelPrice, setValue])

    // Update stop address/coords
    const updateStop = (id: string, address: string, coords?: { lat: number; lng: number }) => {
        setStops(stops.map(s => s.id === id ? {
            ...s,
            address,
            lat: coords?.lat,
            lng: coords?.lng
        } : s))
    }

    // Add waypoint before destination
    const addWaypoint = () => {
        const newWaypoint: RouteStop = {
            id: `wp-${Date.now()}`,
            address: '',
            type: 'waypoint'
        }
        // Insert before last stop (destination)
        const newStops = [...stops]
        newStops.splice(stops.length - 1, 0, newWaypoint)
        setStops(newStops)
    }

    // Remove a waypoint
    const removeStop = (id: string) => {
        const stop = stops.find(s => s.id === id)
        if (!stop || stop.type !== 'waypoint') return // Can't remove origin/destination
        setStops(stops.filter(s => s.id !== id))
    }

    // Calculate route
    const performCalculations = async () => {
        const validStops = stops.filter(s => s.address && s.lat && s.lng)
        if (validStops.length < 2) {
            alert('Please enter at least origin and destination addresses.')
            return
        }

        setIsCalculating(true)
        try {
            // Get route from Mapbox
            const mapboxRoute = await getMapboxRoute(stops)

            if (mapboxRoute) {
                const distMiles = (mapboxRoute.distance || 0) / 1609.34
                const durMin = (mapboxRoute.duration || 0) / 60

                setValue('distance_km', Number(distMiles.toFixed(1)))
                setValue('estimated_duration', Math.round(durMin))
            }

            // Get tolls (origin to destination only for now)
            const origin = stops[0]
            const destination = stops[stops.length - 1]
            if (origin.address && destination.address) {
                const tollResult = await calculateTolls(origin.address, destination.address)
                if (tollResult) {
                    setValue('estimated_toll_cost', Number(tollResult.tollCost.toFixed(2)))
                }
            }

        } catch (error) {
            console.error('Failed to calculate route costs:', error)
            alert('Could not calculate route. Please check your inputs.')
        } finally {
            setIsCalculating(false)
        }
    }

    const handleFormSubmit = async (data: RouteFormData) => {
        const origin = stops.find(s => s.type === 'origin')
        const destination = stops.find(s => s.type === 'destination')
        const waypoints = stops.filter(s => s.type === 'waypoint')

        if (!origin?.address || !destination?.address) {
            alert('Origin and Destination are required.')
            return
        }

        const routeData: RouteInsert = {
            name: data.name,
            origin: {
                address: origin.address,
                lat: origin.lat || 0,
                lng: origin.lng || 0
            },
            destination: {
                address: destination.address,
                lat: destination.lat || 0,
                lng: destination.lng || 0
            },
            waypoints: waypoints.map(wp => ({
                address: wp.address,
                lat: wp.lat || 0,
                lng: wp.lng || 0
            })),
            distance_km: data.distance_km,
            estimated_duration: data.estimated_duration,
            estimated_toll_cost: data.estimated_toll_cost || null,
            estimated_fuel_cost: data.estimated_fuel_cost || null,
        }

        await onSubmit(routeData)
    }

    // Get stop type label and color
    const getStopStyle = (type: RouteStop['type']) => {
        if (type === 'origin') return { label: 'Origin', color: 'bg-green-500', textColor: 'text-green-700' }
        if (type === 'destination') return { label: 'Destination', color: 'bg-red-500', textColor: 'text-red-700' }
        return { label: 'Waypoint', color: 'bg-blue-500', textColor: 'text-blue-700' }
    }

    // Check if we have enough valid stops to calculate
    const canCalculate = stops.filter(s => s.address && s.lat && s.lng).length >= 2

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
            {/* LEFT COLUMN: Input Form */}
            <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-6 h-full overflow-y-auto pr-2">

                {/* Route Name */}
                <Card>
                    <CardHeader className="pb-3 px-6 pt-6">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Navigation className="h-4 w-4" />
                            Route Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-0">
                        <div className="space-y-2">
                            <Label>Route Name *</Label>
                            <Input
                                placeholder="e.g., Downtown to Airport"
                                {...register('name')}
                            />
                            {errors.name && (
                                <p className="text-xs text-status-error">{errors.name.message}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Stops */}
                <Card>
                    <CardHeader className="pb-3 px-6 pt-6">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Route Stops
                            </CardTitle>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addWaypoint}
                                className="gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Waypoint
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-0 space-y-3">
                        {stops.map((stop, idx) => {
                            const style = getStopStyle(stop.type)
                            return (
                                <div
                                    key={stop.id}
                                    className={cn(
                                        "flex items-start gap-3 p-3 rounded-lg border bg-white",
                                        stop.type === 'waypoint' && 'bg-blue-50/50 border-blue-100'
                                    )}
                                >
                                    {/* Stop Indicator */}
                                    <div className="pt-2.5 flex flex-col items-center gap-1">
                                        <div className={cn("w-3 h-3 rounded-full", style.color)} />
                                        {idx < stops.length - 1 && (
                                            <div className="w-0.5 h-6 bg-gray-300" />
                                        )}
                                    </div>

                                    {/* Stop Content */}
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-xs font-medium", style.textColor)}>
                                                {style.label}
                                            </span>
                                            {stop.type === 'waypoint' && (
                                                <span className="text-xs text-muted-foreground">
                                                    (Stop {idx})
                                                </span>
                                            )}
                                        </div>
                                        <LocationPicker
                                            value={stop.address}
                                            onChange={(val, coords) => updateStop(stop.id, val, coords)}
                                            placeholder={`Search ${style.label.toLowerCase()} address...`}
                                        />
                                    </div>

                                    {/* Remove Button (waypoints only) */}
                                    {stop.type === 'waypoint' && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 mt-6"
                                            onClick={() => removeStop(stop.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            )
                        })}

                        <Button
                            type="button"
                            variant={canCalculate ? "default" : "secondary"}
                            size="sm"
                            className="w-full gap-2 mt-4"
                            onClick={performCalculations}
                            disabled={isCalculating || !canCalculate}
                        >
                            {isCalculating ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                                <Calculator className="h-3 w-3" />
                            )}
                            {isCalculating ? 'Calculating...' : 'Calculate Distance & Costs'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Costs & Stats */}
                <Card>
                    <CardHeader className="pb-3 px-6 pt-6">
                        <CardTitle className="text-base flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Estimates
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-0 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Distance (Miles) *</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    {...register('distance_km', { valueAsNumber: true })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Duration (min) *</Label>
                                <Input
                                    type="number"
                                    {...register('estimated_duration', { valueAsNumber: true })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Toll Cost ($)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...register('estimated_toll_cost', { valueAsNumber: true })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5">
                                    Fuel Price ($/Gal)
                                    <span className="text-xs text-muted-foreground font-normal">(Avg)</span>
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    {...register('fuel_price_per_liter', { valueAsNumber: true })}
                                />
                            </div>
                        </div>

                        <div className="p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                            <span className="text-sm font-medium flex items-center gap-2">
                                <Fuel className="h-4 w-4 text-muted-foreground" />
                                Est. Fuel Cost
                            </span>
                            <span className="text-lg font-bold">
                                ${(watch('estimated_fuel_cost') || 0).toFixed(2)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-3 pt-4 mt-auto">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => window.history.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="flex-1 gap-2">
                        {isSubmitting ? 'Saving...' : (
                            <>
                                <Navigation className="h-4 w-4" />
                                {initialData?.id ? 'Update Route' : 'Create Route'}
                            </>
                        )}
                    </Button>
                </div>
            </form>

            {/* RIGHT COLUMN: Map Visualization */}
            <div className="hidden lg:block h-full bg-muted rounded-xl overflow-hidden border relative shadow-inner">
                <RouteMap
                    stops={stops.filter(s => s.lat && s.lng).map(s => ({
                        lat: s.lat!,
                        lng: s.lng!,
                        type: s.type
                    }))}
                    className="w-full h-full"
                />

                {stops.filter(s => s.lat && s.lng).length < 2 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10 pointer-events-none">
                        <div className="text-center p-6 max-w-sm">
                            <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-50" />
                            <h3 className="font-semibold text-lg text-foreground">Route Visualizer</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Enter origin and destination addresses to see the route path.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
