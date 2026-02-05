'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DriverForm } from '@/components/drivers/DriverForm'
import { createDriver } from '../actions'
import { DriverInsert, Profile } from '@/types/database'
import { useQueryClient } from '@tanstack/react-query'
import { driverKeys } from '@/hooks/useDrivers'

export default function NewDriverPage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const queryClient = useQueryClient()

    const handleSubmit = async (data: { driver: DriverInsert; profile?: Partial<Profile> }) => {
        setIsSubmitting(true)
        try {
            // Use server action to create driver (bypasses RLS)
            const result = await createDriver({
                email: data.profile?.email || `driver-${Date.now()}@fleet.local`,
                full_name: data.profile?.full_name || 'New Driver',
                phone: data.profile?.phone || undefined,
                license_number: data.driver.license_number || undefined,
                license_expiry: data.driver.license_expiry || undefined,
                payment_type: data.driver.payment_type || undefined,
                rate_amount: data.driver.rate_amount || undefined,
                status: data.driver.status || undefined,
            })

            if (!result.success) {
                throw new Error(result.error || 'Unknown error')
            }

            // Invalidate drivers list cache
            queryClient.invalidateQueries({ queryKey: driverKeys.lists() })

            router.push('/dashboard/drivers')
        } catch (error) {
            console.error('Failed to create driver:', error)
            alert('Failed to create driver: ' + (error instanceof Error ? error.message : 'Unknown error'))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Add New Driver</h1>
                    <p className="text-muted-foreground text-sm">
                        Enter the driver details and payment configuration
                    </p>
                </div>
            </div>

            {/* Form Card */}
            <div className="bg-card border rounded-xl p-6">
                <DriverForm
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                />
            </div>
        </div>
    )
}
