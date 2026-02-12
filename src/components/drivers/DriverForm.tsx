'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { PhoneInput } from '@/components/ui/phone-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'

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
            login_pin: initialData?.driver?.login_pin || '',
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
            login_pin: data.login_pin,
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

                <div className="space-y-2">
                    <Label htmlFor="login_pin">Login PIN (4 digits) *</Label>
                    <Input
                        id="login_pin"
                        type="text"
                        maxLength={4}
                        placeholder="1234"
                        {...register('login_pin', {
                            required: 'PIN is required',
                            minLength: { value: 4, message: 'PIN must be at least 4 digits' },
                            maxLength: { value: 6, message: 'PIN must be max 6 digits' }
                        })}
                    />
                    <p className="text-xs text-muted-foreground">Used for mobile app login</p>
                    {errors.login_pin && (
                        <p className="text-xs text-red-500">{errors.login_pin.message as string}</p>
                    )}
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
                        <Controller
                            control={control}
                            name="license_expiry"
                            render={({ field }) => (
                                <DatePicker
                                    date={field.value ? new Date(field.value + 'T00:00:00') : undefined}
                                    setDate={(date) => {
                                        if (date) {
                                            const yyyy = date.getFullYear()
                                            const mm = String(date.getMonth() + 1).padStart(2, '0')
                                            const dd = String(date.getDate()).padStart(2, '0')
                                            field.onChange(`${yyyy}-${mm}-${dd}`)
                                        } else {
                                            field.onChange('')
                                        }
                                    }}
                                    placeholder="Select expiry date"
                                />
                            )}
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
