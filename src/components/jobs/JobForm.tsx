'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { JobInsert, JobUpdate } from '@/types/database'
import { useVehicles } from '@/hooks/useVehicles'
import { useDrivers } from '@/hooks/useDrivers'
import { useRoutes } from '@/hooks/useRoutes'
import { MapPin, User, Truck, Calendar, Package, Phone, DollarSign } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LocationPicker } from '@/components/ui/LocationPicker'
import { PhoneInput } from '@/components/ui/phone-input'

const jobSchema = z.object({
    job_number: z.string().optional(),
    customer_name: z.string().min(1, 'Customer name is required'),
    customer_phone: z.string().optional(),
    customer_email: z.string().email().optional().or(z.literal('')),
    pickup_address: z.string().min(1, 'Pickup address is required'),
    pickup_lat: z.number().optional(),
    pickup_lng: z.number().optional(),
    delivery_address: z.string().min(1, 'Delivery address is required'),
    delivery_lat: z.number().optional(),
    delivery_lng: z.number().optional(),
    scheduled_date: z.string().optional(),
    scheduled_time: z.string().optional(),
    vehicle_id: z.string().optional(),
    driver_id: z.string().optional(),
    route_id: z.string().optional(),
    notes: z.string().optional(),
    estimated_cost: z.number().optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    weight: z.number().optional(),
})

type JobFormData = z.infer<typeof jobSchema>

interface JobFormProps {
    initialData?: Partial<JobFormData & { id: string }>
    onSubmit: (data: JobInsert | JobUpdate) => Promise<void>
    isSubmitting?: boolean
}

export function JobForm({ initialData, onSubmit, isSubmitting }: JobFormProps) {
    const { data: vehiclesData } = useVehicles()
    const { data: driversData } = useDrivers()
    const { data: routesData } = useRoutes()

    const vehicles = vehiclesData?.data || []
    const drivers = driversData?.data || []
    const routes = routesData?.data || []

    // ALLOW ALL DRIVERS/VEHICLES (Scheduling happens in future, not just now)
    const availableVehicles = vehicles
    const availableDrivers = drivers

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        control,
        formState: { errors },
    } = useForm<JobFormData>({
        resolver: zodResolver(jobSchema),
        defaultValues: {
            job_number: initialData?.job_number || `JOB-${Date.now().toString(36).toUpperCase()}`,
            customer_name: initialData?.customer_name || '',
            customer_phone: initialData?.customer_phone || '',
            customer_email: initialData?.customer_email || '',
            pickup_address: initialData?.pickup_address || '',
            pickup_lat: initialData?.pickup_lat,
            pickup_lng: initialData?.pickup_lng,
            delivery_address: initialData?.delivery_address || '',
            delivery_lat: initialData?.delivery_lat,
            delivery_lng: initialData?.delivery_lng,
            scheduled_date: initialData?.scheduled_date || '',
            scheduled_time: initialData?.scheduled_time || '',
            vehicle_id: initialData?.vehicle_id || 'none',
            driver_id: initialData?.driver_id || 'none',
            route_id: initialData?.route_id || 'none',
            notes: initialData?.notes || '',
            priority: initialData?.priority || 'normal',
            weight: initialData?.weight,
        },
    })

    const selectedVehicleId = watch('vehicle_id')
    const selectedDriverId = watch('driver_id')
    const selectedRouteId = watch('route_id')

    const handleFormSubmit = async (data: JobFormData) => {
        // Convert 'none' back to null for database
        const vehicleId = data.vehicle_id === 'none' ? null : data.vehicle_id || null
        const driverId = data.driver_id === 'none' ? null : data.driver_id || null
        const routeId = data.route_id === 'none' ? null : data.route_id || null

        // Cast to any to include location fields that might be handled by the parent onSubmit even if not in JobInsert schema
        const jobData: any = {
            job_number: data.job_number,
            customer_name: data.customer_name,
            customer_phone: data.customer_phone || null,
            pickup_location: {
                address: data.pickup_address,
                lat: data.pickup_lat,
                lng: data.pickup_lng
            },
            delivery_location: {
                address: data.delivery_address,
                lat: data.delivery_lat,
                lng: data.delivery_lng
            },
            scheduled_date: data.scheduled_date || null,
            scheduled_time: data.scheduled_time || null,
            vehicle_id: vehicleId,
            driver_id: driverId,
            route_id: routeId,
            notes: data.notes || null,
            weight: data.weight || null,
            status: vehicleId && driverId ? 'assigned' : 'pending',
        }

        await onSubmit(jobData)
    }

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Customer Information */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Customer Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer_name">Customer Name *</Label>
                            <Input
                                id="customer_name"
                                placeholder="John Doe"
                                {...register('customer_name')}
                            />
                            {errors.customer_name && (
                                <p className="text-xs text-status-error">{errors.customer_name.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer_phone">Phone</Label>
                            <Controller
                                control={control}
                                name="customer_phone"
                                render={({ field }) => (
                                    <PhoneInput
                                        id="customer_phone"
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="customer_email">Email</Label>
                        <Input
                            id="customer_email"
                            type="email"
                            placeholder="customer@email.com"
                            {...register('customer_email')}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Pickup & Delivery */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Pickup & Delivery
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="pickup_address">Pickup Address *</Label>
                        <LocationPicker
                            value={watch('pickup_address')}
                            onChange={(value, coords) => {
                                setValue('pickup_address', value)
                                if (coords) {
                                    setValue('pickup_lat', coords.lat)
                                    setValue('pickup_lng', coords.lng)
                                }
                            }}
                            placeholder="Search pickup location..."
                            error={errors.pickup_address?.message}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="delivery_address">Delivery Address *</Label>
                        <LocationPicker
                            value={watch('delivery_address')}
                            onChange={(value, coords) => {
                                setValue('delivery_address', value)
                                if (coords) {
                                    setValue('delivery_lat', coords.lat)
                                    setValue('delivery_lng', coords.lng)
                                }
                            }}
                            placeholder="Search delivery location..."
                            error={errors.delivery_address?.message}
                        />
                    </div>

                    {/* Saved Routes */}
                    {routes.length > 0 && (
                        <div className="space-y-2">
                            <Label>Or Select Saved Route</Label>
                            <Select
                                value={selectedRouteId}
                                onValueChange={(value) => {
                                    setValue('route_id', value)
                                    const route = routes.find(r => r.id === value)
                                    if (route) {
                                        const origin = route.origin as { address?: string } | null
                                        const dest = route.destination as { address?: string } | null
                                        if (origin?.address) setValue('pickup_address', origin.address)
                                        if (dest?.address) setValue('delivery_address', dest.address)
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a saved route..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {routes.map((route) => (
                                        <SelectItem key={route.id} value={route.id}>
                                            {route.name} ({route.distance_km} km)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Schedule
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="scheduled_date">Date</Label>
                            <Input
                                id="scheduled_date"
                                type="date"
                                {...register('scheduled_date')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="scheduled_time">Time</Label>
                            <Input
                                id="scheduled_time"
                                type="time"
                                {...register('scheduled_time')}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select
                            value={watch('priority')}
                            onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') => setValue('priority', value)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Assignment */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Assignment (Optional)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Vehicle</Label>
                            <Select
                                value={selectedVehicleId}
                                onValueChange={(value) => setValue('vehicle_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a vehicle..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Unassigned</SelectItem>
                                    {availableVehicles.map((vehicle) => (
                                        <SelectItem key={vehicle.id} value={vehicle.id}>
                                            {vehicle.make} {vehicle.model} - {vehicle.registration_number}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {availableVehicles.length === 0 && (
                                <p className="text-xs text-muted-foreground">No available vehicles</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Driver</Label>
                            <Select
                                value={selectedDriverId}
                                onValueChange={(value) => setValue('driver_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a driver..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Unassigned</SelectItem>
                                    {availableDrivers.map((driver) => (
                                        <SelectItem key={driver.id} value={driver.id}>
                                            {driver.profiles?.full_name || 'Unknown'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {availableDrivers.length === 0 && (
                                <p className="text-xs text-muted-foreground">No available drivers</p>
                            )}
                        </div>
                    </div>
                    {selectedVehicleId && selectedVehicleId !== 'none' && selectedDriverId && selectedDriverId !== 'none' && (
                        <div className="p-3 bg-status-success-muted rounded-lg text-sm text-status-success">
                            ✓ Job will be automatically assigned when created
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Notes */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Additional Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="weight">Weight (lbs)</Label>
                        <Input
                            id="weight"
                            type="number"
                            placeholder="0.0"
                            {...register('weight', { valueAsNumber: true })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes / Special Instructions</Label>
                        <textarea
                            id="notes"
                            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="Any special instructions for pickup or delivery..."
                            {...register('notes')}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                    {isSubmitting ? 'Creating...' : (
                        <>
                            <Package className="h-4 w-4" />
                            {initialData?.id ? 'Update Job' : 'Create Job'}
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}
