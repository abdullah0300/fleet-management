'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DriverForm } from '@/components/drivers/DriverForm'
import { createClient } from '@/lib/supabase/client'
import { DriverInsert, Profile } from '@/types/database'

export default function NewDriverPage() {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const supabase = createClient()

    const handleSubmit = async (data: { driver: DriverInsert; profile?: Partial<Profile> }) => {
        setIsSubmitting(true)
        try {
            // First, we need to create a user/profile for the driver
            // In production, this would involve inviting the user via email
            // For now, we'll create a placeholder profile

            // Generate a unique email for testing if not provided
            const email = data.profile?.email || `driver-${Date.now()}@fleet.local`

            // Create auth user via admin API would be needed in production
            // For now, insert directly into profiles table (requires service role in production)
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: crypto.randomUUID(),
                    full_name: data.profile?.full_name || 'New Driver',
                    email: email,
                    phone: data.profile?.phone || null,
                    role: 'driver',
                })
                .select()
                .single()

            if (profileError) throw profileError

            // Now create the driver record linked to the profile
            const { error: driverError } = await supabase
                .from('drivers')
                .insert({
                    id: profile.id,
                    license_number: data.driver.license_number,
                    license_expiry: data.driver.license_expiry,
                    payment_type: data.driver.payment_type,
                    rate_amount: data.driver.rate_amount,
                    status: data.driver.status,
                })

            if (driverError) throw driverError

            router.push('/dashboard/drivers')
        } catch (error) {
            console.error('Failed to create driver:', error)
            alert('Failed to create driver. Please try again.')
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
