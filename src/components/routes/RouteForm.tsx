'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MapPin, Navigation, Clock, DollarSign, Calculator, RefreshCw, Fuel } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RouteInsert } from '@/types/database'
import { LocationPicker } from '@/components/ui/LocationPicker'
import { calculateTolls } from '@/lib/services/tollguru'
import { RouteMap } from './RouteMap'
import { useState, useEffect } from 'react'
import { toast } from 'sonner' // Assuming sonner or similar usage, otherwise alert

const routeFormSchema = z.object({
    name: z.string().min(1, 'Route name is required'),
    origin_address: z.string().min(1, 'Origin is required'),
    destination_address: z.string().min(1, 'Destination is required'),
    distance_km: z.number().min(0.1, 'Distance must be positive'),
    estimated_duration: z.number().min(1, 'Duration must be at least 1 minute'),
    estimated_toll_cost: z.number().optional().default(0),
    estimated_fuel_cost: z.number().optional().default(0),
    fuel_price_per_liter: z.number().optional().default(4.00), // Now Price per Gallon
})

type RouteFormData = z.infer<typeof routeFormSchema>

interface RouteFormProps {
    initialData?: Partial<RouteFormData & { id: string; origin?: any; destination?: any }>
    onSubmit: (data: RouteInsert) => Promise<void>
    isSubmitting?: boolean
}

// Helper to get Mapbox Route
async function getMapboxRoute(start: { lat: number; lng: number }, end: { lat: number; lng: number }) {
    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return null
    const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?steps=true&geometries=geojson&access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
    )
    if (!response.ok) return null
    const json = await response.json()
    return json.routes?.[0]
}

export function RouteForm({ initialData, onSubmit, isSubmitting }: RouteFormProps) {
    const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | undefined>(
        initialData?.origin?.lat ? { lat: initialData.origin.lat, lng: initialData.origin.lng } : undefined
    )
    const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | undefined>(
        initialData?.destination?.lat ? { lat: initialData.destination.lat, lng: initialData.destination.lng } : undefined
    )

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
            origin_address: initialData?.origin_address || '',
            destination_address: initialData?.destination_address || '',
            distance_km: initialData?.distance_km || 0,
            estimated_duration: initialData?.estimated_duration || 0,
            estimated_toll_cost: initialData?.estimated_toll_cost || 0,
            estimated_fuel_cost: initialData?.estimated_fuel_cost || 0,
            fuel_price_per_liter: 4.00,
        },
    })

    const originAddress = watch('origin_address')
    const destinationAddress = watch('destination_address')
    const distanceKm = watch('distance_km')
    const fuelPrice = watch('fuel_price_per_liter')

    // Recalculate fuel cost if price changes
    useEffect(() => {
        if (distanceKm > 0 && fuelPrice > 0) {
            // Assume 8 MPG efficiency for trucks (conservative average)
            const fuelCost = (distanceKm / 8) * fuelPrice
            setValue('estimated_fuel_cost', Number(fuelCost.toFixed(2)))
        }
    }, [distanceKm, fuelPrice, setValue])

    // Auto-calculate triggered by button or effect logic
    const performCalculations = async () => {
        if (!originCoords || !destCoords || !originAddress || !destinationAddress) {
            alert('Please select both Origin and Destination first.')
            return
        }

        setIsCalculating(true)
        try {
            // 1. Get Distance/Duration from Mapbox (More reliable than TollGuru for this)
            const mapboxRoute = await getMapboxRoute(originCoords, destCoords)

            if (mapboxRoute) {
                // Convert meters to Miles (1609.34 meters per mile)
                const distMiles = (mapboxRoute.distance || 0) / 1609.34
                const durMin = (mapboxRoute.duration || 0) / 60

                setValue('distance_km', Number(distMiles.toFixed(1)))
                setValue('estimated_duration', Math.round(durMin))
            }

            // 2. Get Tolls from TollGuru
            const tollResult = await calculateTolls(originAddress, destinationAddress)

            if (tollResult) {
                setValue('estimated_toll_cost', Number(tollResult.tollCost.toFixed(2)))
                // If Mapbox failed, use TollGuru distance stats
                if (!mapboxRoute) {
                    setValue('distance_km', Number(tollResult.distance.toFixed(1)))
                    setValue('estimated_duration', Math.round(tollResult.duration))
                }
            } else {
                console.warn('TollGuru failed or returned no route. defaulting tolls to 0.')
                setValue('estimated_toll_cost', 0)
            }

        } catch (error) {
            console.error('Failed to calculate route costs:', error)
            alert('Could not calculate tolls. Please check your API key.')
        } finally {
            setIsCalculating(false)
        }
    }

    const handleFormSubmit = async (data: RouteFormData) => {
        const routeData: RouteInsert = {
            name: data.name,
            origin: {
                address: data.origin_address,
                lat: originCoords?.lat || 0,
                lng: originCoords?.lng || 0
            },
            destination: {
                address: data.destination_address,
                lat: destCoords?.lat || 0,
                lng: destCoords?.lng || 0
            },
            distance_km: data.distance_km,
            estimated_duration: data.estimated_duration,
            estimated_toll_cost: data.estimated_toll_cost || null,
            estimated_fuel_cost: data.estimated_fuel_cost || null,
        }

        await onSubmit(routeData)
    }

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

                {/* Locations */}
                <Card>
                    <CardHeader className="pb-3 px-6 pt-6">
                        <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Locations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-6 pb-6 pt-0 space-y-4">
                        <div className="space-y-2">
                            <Label>Origin Address *</Label>
                            <LocationPicker
                                value={originAddress}
                                onChange={(value, coords) => {
                                    setValue('origin_address', value)
                                    if (coords) setOriginCoords(coords)
                                }}
                                placeholder="Search origin..."
                                error={errors.origin_address?.message}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Destination Address *</Label>
                            <LocationPicker
                                value={destinationAddress}
                                onChange={(value, coords) => {
                                    setValue('destination_address', value)
                                    if (coords) setDestCoords(coords)
                                }}
                                placeholder="Search destination..."
                                error={errors.destination_address?.message}
                            />
                        </div>

                        <Button
                            type="button"
                            variant={originCoords && destCoords ? "default" : "secondary"}
                            size="sm"
                            className="w-full gap-2 mt-2"
                            onClick={performCalculations}
                            disabled={isCalculating || !originCoords || !destCoords}
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
                    origin={originCoords}
                    destination={destCoords}
                    className="w-full h-full"
                />

                {(!originCoords || !destCoords) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10 pointer-events-none">
                        <div className="text-center p-6 max-w-sm">
                            <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-50" />
                            <h3 className="font-semibold text-lg text-foreground">Route Visualizer</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                Enter origin and destination addresses to see the route path and live traffic data.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
