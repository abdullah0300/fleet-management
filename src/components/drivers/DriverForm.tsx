'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { PhoneInput } from '@/components/ui/phone-input'
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
import { DriverInsert, Driver, Profile } from '@/types/database'

interface DriverFormProps {
    initialData?: {
        driver?: Partial<Driver>
        profile?: Partial<Profile>
    }
    onSubmit: (data: { driver: DriverInsert; profile?: Partial<Profile> }) => Promise<void>
    isSubmitting?: boolean
}

export function DriverForm({ initialData, onSubmit, isSubmitting }: DriverFormProps) {
    const { register, handleSubmit, formState: { errors }, setValue, watch, control } = useForm({
        defaultValues: {
            // Profile fields
            full_name: initialData?.profile?.full_name || '',
            email: initialData?.profile?.email || '',
            phone: initialData?.profile?.phone || '',
            // Driver fields
            license_number: initialData?.driver?.license_number || '',
            license_expiry: initialData?.driver?.license_expiry || '',
            payment_type: initialData?.driver?.payment_type || 'per_mile',
            rate_amount: initialData?.driver?.rate_amount || 0,
            status: initialData?.driver?.status || 'available',
        }
    })

    const currentPaymentType = watch('payment_type')
    const currentStatus = watch('status')

    const handleFormSubmit = async (data: any) => {
        const driverData: DriverInsert = {
            id: initialData?.driver?.id || '', // Required for new drivers
            license_number: data.license_number || null,
            license_expiry: data.license_expiry || null,
            payment_type: data.payment_type,
            rate_amount: data.rate_amount,
            status: data.status,
        }

        const profileData = {
            full_name: data.full_name,
            email: data.email,
            phone: data.phone,
        }

        await onSubmit({ driver: driverData, profile: profileData })
    }

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Profile Info */}
            <div className="space-y-4">
                <h3 className="font-medium text-lg">Personal Information</h3>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input
                            id="full_name"
                            placeholder="John Doe"
                            {...register('full_name', { required: 'Name is required' })}
                        />
                        {errors.full_name && (
                            <p className="text-xs text-red-500">{errors.full_name.message as string}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Controller
                            control={control}
                            name="phone"
                            render={({ field }) => (
                                <PhoneInput
                                    id="phone"
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            )}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="driver@company.com"
                        {...register('email')}
                    />
                </div>
            </div>

            {/* License Info */}
            <div className="space-y-4">
                <h3 className="font-medium text-lg">License Information</h3>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="license_number">License Number</Label>
                        <Input
                            id="license_number"
                            placeholder="DL-12345678"
                            {...register('license_number')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="license_expiry">License Expiry</Label>
                        <Input
                            id="license_expiry"
                            type="date"
                            {...register('license_expiry')}
                        />
                    </div>
                </div>
            </div>

            {/* Payment Configuration */}
            <div className="space-y-4">
                <h3 className="font-medium text-lg">Payment Configuration</h3>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Payment Type</Label>
                        <Select
                            value={currentPaymentType || 'per_mile'}
                            onValueChange={(value) => setValue('payment_type', value as any)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select payment type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="per_mile">Per Mile</SelectItem>
                                <SelectItem value="per_trip">Per Trip</SelectItem>
                                <SelectItem value="hourly">Hourly</SelectItem>
                                <SelectItem value="salary">Salary</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="rate_amount">
                            Rate Amount ($)
                            <span className="text-muted-foreground ml-1 text-xs">
                                {currentPaymentType === 'per_mile' && '/ mile'}
                                {currentPaymentType === 'per_trip' && '/ trip'}
                                {currentPaymentType === 'hourly' && '/ hour'}
                                {currentPaymentType === 'salary' && '/ month'}
                            </span>
                        </Label>
                        <Input
                            id="rate_amount"
                            type="number"
                            step="0.01"
                            {...register('rate_amount', { valueAsNumber: true })}
                        />
                    </div>
                </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
                <Label>Status</Label>
                <Select
                    value={currentStatus || 'available'}
                    onValueChange={(value) => setValue('status', value as any)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="on_trip">On Trip</SelectItem>
                        <SelectItem value="off_duty">Off Duty</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : initialData?.driver ? 'Update Driver' : 'Add Driver'}
                </Button>
            </div>
        </form>
    )
}
