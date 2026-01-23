'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MapPin, Navigation, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RouteInsert } from '@/types/database'

const routeFormSchema = z.object({
    name: z.string().min(1, 'Route name is required'),
    origin_address: z.string().min(1, 'Origin is required'),
    destination_address: z.string().min(1, 'Destination is required'),
    distance_km: z.number().min(0.1, 'Distance must be positive'),
    estimated_duration: z.number().min(1, 'Duration must be at least 1 minute'),
    estimated_toll_cost: z.number().optional(),
    estimated_fuel_cost: z.number().optional(),
})

type RouteFormData = z.infer<typeof routeFormSchema>

interface RouteFormProps {
    initialData?: Partial<RouteFormData & { id: string }>
    onSubmit: (data: RouteInsert) => Promise<void>
    isSubmitting?: boolean
}

export function RouteForm({ initialData, onSubmit, isSubmitting }: RouteFormProps) {
    const {
        register,
        handleSubmit,
        watch,
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
        },
    })

    const distance = watch('distance_km')
    const duration = watch('estimated_duration')

    const handleFormSubmit = async (data: RouteFormData) => {
        const routeData: RouteInsert = {
            name: data.name,
            origin: { address: data.origin_address, lat: 0, lng: 0 },
            destination: { address: data.destination_address, lat: 0, lng: 0 },
            distance_km: data.distance_km,
            estimated_duration: data.estimated_duration,
            estimated_toll_cost: data.estimated_toll_cost || null,
            estimated_fuel_cost: data.estimated_fuel_cost || null,
        }

        await onSubmit(routeData)
    }

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 sm:space-y-6">
            {/* Route Name */}
            <Card>
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <Navigation className="h-4 w-4" />
                        Route Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs sm:text-sm">Route Name *</Label>
                        <Input
                            placeholder="e.g., Downtown to Airport"
                            className="text-sm"
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
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Locations
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs sm:text-sm">Origin Address *</Label>
                        <Input
                            placeholder="Starting point address"
                            className="text-sm"
                            {...register('origin_address')}
                        />
                        {errors.origin_address && (
                            <p className="text-xs text-status-error">{errors.origin_address.message}</p>
                        )}
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs sm:text-sm">Destination Address *</Label>
                        <Input
                            placeholder="End point address"
                            className="text-sm"
                            {...register('destination_address')}
                        />
                        {errors.destination_address && (
                            <p className="text-xs text-status-error">{errors.destination_address.message}</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Distance & Duration */}
            <Card>
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Distance & Duration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-xs sm:text-sm">Distance (km) *</Label>
                            <Input
                                type="number"
                                step="0.1"
                                placeholder="0.0"
                                className="text-sm"
                                {...register('distance_km', { valueAsNumber: true })}
                            />
                            {errors.distance_km && (
                                <p className="text-xs text-status-error">{errors.distance_km.message}</p>
                            )}
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-xs sm:text-sm">Duration (min) *</Label>
                            <Input
                                type="number"
                                placeholder="0"
                                className="text-sm"
                                {...register('estimated_duration', { valueAsNumber: true })}
                            />
                            {errors.estimated_duration && (
                                <p className="text-xs text-status-error">{errors.estimated_duration.message}</p>
                            )}
                        </div>
                    </div>
                    {distance > 0 && duration > 0 && (
                        <div className="p-3 bg-muted/50 rounded-lg text-sm">
                            <p className="text-muted-foreground">
                                Average speed: <span className="font-medium text-foreground">
                                    {((distance / duration) * 60).toFixed(1)} km/h
                                </span>
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Cost Estimates */}
            <Card>
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Cost Estimates
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-xs sm:text-sm">Toll Cost ($)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="text-sm"
                                {...register('estimated_toll_cost', { valueAsNumber: true })}
                            />
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-xs sm:text-sm">Fuel Cost ($)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="text-sm"
                                {...register('estimated_fuel_cost', { valueAsNumber: true })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                    {isSubmitting ? 'Saving...' : (
                        <>
                            <Navigation className="h-4 w-4" />
                            {initialData?.id ? 'Update Route' : 'Create Route'}
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}
