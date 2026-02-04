'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
import { VehicleInsert, Vehicle } from '@/types/database'

interface VehicleFormProps {
    initialData?: Partial<Vehicle>
    onSubmit: (data: VehicleInsert) => Promise<void>
    isSubmitting?: boolean
}

export function VehicleForm({ initialData, onSubmit, isSubmitting }: VehicleFormProps) {
    const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<VehicleInsert>({
        defaultValues: {
            registration_number: initialData?.registration_number || '',
            make: initialData?.make || '',
            model: initialData?.model || '',
            year: initialData?.year || new Date().getFullYear(),
            vehicle_type: initialData?.vehicle_type || '',
            fuel_type: initialData?.fuel_type || 'diesel',
            fuel_efficiency: initialData?.fuel_efficiency || undefined,
            status: initialData?.status || 'available',
            odometer_reading: initialData?.odometer_reading || 0,
        }
    })

    const currentFuelType = watch('fuel_type')
    const currentStatus = watch('status')

    const handleFormSubmit = async (data: VehicleInsert) => {
        await onSubmit(data)
    }

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="registration_number">Registration Number *</Label>
                    <Input
                        id="registration_number"
                        placeholder="ABC-1234"
                        {...register('registration_number', { required: 'Registration is required' })}
                    />
                    {errors.registration_number && (
                        <p className="text-xs text-red-500">{errors.registration_number.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                        id="year"
                        type="number"
                        placeholder="2024"
                        {...register('year', { valueAsNumber: true })}
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="make">Make *</Label>
                    <Input
                        id="make"
                        placeholder="Toyota"
                        {...register('make', { required: 'Make is required' })}
                    />
                    {errors.make && (
                        <p className="text-xs text-red-500">{errors.make.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="model">Model *</Label>
                    <Input
                        id="model"
                        placeholder="Camry"
                        {...register('model', { required: 'Model is required' })}
                    />
                    {errors.model && (
                        <p className="text-xs text-red-500">{errors.model.message}</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="vehicle_type">Vehicle Type</Label>
                    <Input
                        id="vehicle_type"
                        placeholder="Van, Truck, Sedan..."
                        {...register('vehicle_type')}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="fuel_type">Fuel Type</Label>
                    <Select
                        value={currentFuelType || 'diesel'}
                        onValueChange={(value) => setValue('fuel_type', value as any)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select fuel type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="diesel">Diesel</SelectItem>
                            <SelectItem value="petrol">Petrol</SelectItem>
                            <SelectItem value="electric">Electric</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="fuel_efficiency">Fuel Efficiency (MPG)</Label>
                    <Input
                        id="fuel_efficiency"
                        type="number"
                        step="0.1"
                        placeholder="12.5"
                        {...register('fuel_efficiency', { valueAsNumber: true })}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="odometer_reading">Odometer Reading (Miles)</Label>
                    <Input
                        id="odometer_reading"
                        type="number"
                        placeholder="50000"
                        {...register('odometer_reading', { valueAsNumber: true })}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                    value={currentStatus || 'available'}
                    onValueChange={(value) => setValue('status', value as any)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="in_use">In Use</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : initialData ? 'Update Vehicle' : 'Add Vehicle'}
                </Button>
            </div>
        </form>
    )
}
