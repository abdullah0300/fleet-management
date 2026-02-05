'use server'

import { createClient } from '@supabase/supabase-js'
import { DriverInsert } from '@/types/database'

// Initialize admin client with service role key
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
)

export type DriverImportRow = {
    email: string
    full_name: string
    phone?: string
    license_number?: string
    license_expiry?: string
    payment_type?: 'per_mile' | 'per_trip' | 'hourly' | 'salary'
    rate_amount?: number
    status?: 'available' | 'on_trip' | 'off_duty'
}

export type ImportResult = {
    successful: number
    failed: { email: string; error: string }[]
}

export async function bulkImportDrivers(drivers: DriverImportRow[]): Promise<ImportResult> {
    const failed: { email: string; error: string }[] = []
    let successCount = 0

    // Validate service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Server configuration error: Missing Service Role Key')
    }

    for (const driver of drivers) {
        try {
            let userId: string


            // 1. Check if user exists
            // Standard approach: Try to fetch profile by email using admin client (bypass RLS)
            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('id')
                .eq('email', driver.email)
                .single()

            if (profiles) {
                userId = profiles.id
            } else {
                // 2. Create new user
                const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email: driver.email,
                    email_confirm: true, // Auto-confirm for bulk import flexibility? Or false? Standard is usually true for employee imports + password reset/invite logic.
                    // For now, let's confirm them so they can just "Forgot Password" or we can send invite link.
                    // Actually, best is inviteUserByEmail if we want them to set password.
                    user_metadata: {
                        full_name: driver.full_name,
                    }
                })

                if (createError) throw createError
                if (!newUser.user) throw new Error('Failed to create user')

                userId = newUser.user.id
            }

            // 3. Create/Update Driver Record
            // Check if driver record already exists
            const { data: existingDriver } = await supabaseAdmin
                .from('drivers')
                .select('id')
                .eq('id', userId)
                .single()

            const driverData: DriverInsert = {
                id: userId,
                license_number: driver.license_number || null,
                license_expiry: driver.license_expiry || null,
                payment_type: driver.payment_type || 'per_mile',
                rate_amount: driver.rate_amount || 0,
                status: driver.status || 'available',
                // assigned_vehicle_id: null // Explicitly handle if needed
            }

            if (existingDriver) {
                // Update existing
                const { error: updateError } = await supabaseAdmin
                    .from('drivers')
                    .update(driverData)
                    .eq('id', userId)

                if (updateError) throw updateError
            } else {
                // Insert new
                const { error: insertError } = await supabaseAdmin
                    .from('drivers')
                    .insert(driverData)

                if (insertError) throw insertError
            }

            // Optional: Update profile phone number if provided and different?
            if (driver.phone) {
                await supabaseAdmin.from('profiles').update({ phone: driver.phone }).eq('id', userId)
            }

            successCount++

        } catch (error) {
            console.error(`Error importing driver ${driver.email}:`, error)
            failed.push({
                email: driver.email,
                error: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    }

    return { successful: successCount, failed }
}

/**
 * Create a single driver using admin client (bypasses RLS)
 */
export async function createDriver(driver: DriverImportRow): Promise<{ success: boolean; error?: string; driverId?: string }> {
    // Validate service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { success: false, error: 'Server configuration error: Missing Service Role Key' }
    }

    try {
        let userId: string

        // 1. Check if user exists by email
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', driver.email.toLowerCase())
            .single()

        if (existingProfile) {
            // User already exists, check if they're already a driver
            const { data: existingDriver } = await supabaseAdmin
                .from('drivers')
                .select('id')
                .eq('id', existingProfile.id)
                .single()

            if (existingDriver) {
                return { success: false, error: 'A driver with this email already exists' }
            }

            userId = existingProfile.id
        } else {
            // 2. Create new auth user
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: driver.email.toLowerCase(),
                email_confirm: true,
                user_metadata: {
                    full_name: driver.full_name,
                }
            })

            if (createError) {
                return { success: false, error: createError.message }
            }
            if (!newUser.user) {
                return { success: false, error: 'Failed to create user' }
            }

            userId = newUser.user.id
        }

        // 3. Create driver record
        const driverData: DriverInsert = {
            id: userId,
            license_number: driver.license_number || null,
            license_expiry: driver.license_expiry || null,
            payment_type: driver.payment_type || 'per_mile',
            rate_amount: driver.rate_amount || 0,
            status: driver.status || 'available',
        }

        const { error: insertError } = await supabaseAdmin
            .from('drivers')
            .insert(driverData)

        if (insertError) {
            return { success: false, error: insertError.message }
        }

        // 4. Update profile phone if provided
        if (driver.phone) {
            await supabaseAdmin.from('profiles').update({ phone: driver.phone }).eq('id', userId)
        }

        return { success: true, driverId: userId }

    } catch (error) {
        console.error('Error creating driver:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}
