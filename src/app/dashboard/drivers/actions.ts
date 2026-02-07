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
    login_pin?: string
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
                    password: driver.login_pin ? driver.login_pin + 'fleet' : undefined, // Set PIN+suffix as password if provided
                    email_confirm: true,
                    user_metadata: {
                        full_name: driver.full_name,
                    }
                })

                if (createError) throw createError
                if (!newUser.user) throw new Error('Failed to create user')

                userId = newUser.user.id
            }

            // 3. Create/Update Driver Record
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
                login_pin: driver.login_pin || null
            }

            if (existingDriver) {
                const { error: updateError } = await supabaseAdmin
                    .from('drivers')
                    .update(driverData)
                    .eq('id', userId)

                if (updateError) throw updateError
            } else {
                const { error: insertError } = await supabaseAdmin
                    .from('drivers')
                    .insert(driverData)

                if (insertError) throw insertError
            }

            // Optional: Update profile phone
            if (driver.phone) {
                await supabaseAdmin.from('profiles').update({ phone: driver.phone }).eq('id', userId)
            }

            // Should also update password if user existed and we consistently want PIN=password?
            // For bulk import, maybe skip forcing password reset on existing users to avoid disruption.

            successCount++

        } catch (error: any) {
            console.error(`Error importing driver ${driver.email}:`, error)
            // Handle Unique PIN Error
            let errorMessage = error instanceof Error ? error.message : 'Unknown error'
            if (error?.code === '23505' && error?.message?.includes('login_pin')) {
                errorMessage = `PIN '${driver.login_pin}' is already assigned to another driver.`
            }

            failed.push({
                email: driver.email,
                error: errorMessage
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
            // User already exists
            const { data: existingDriver } = await supabaseAdmin
                .from('drivers')
                .select('id')
                .eq('id', existingProfile.id)
                .single()

            if (existingDriver) {
                return { success: false, error: 'A driver with this email already exists' }
            }

            // Sync password if PIN provided
            if (driver.login_pin) {
                await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, {
                    password: driver.login_pin + 'fleet'
                })
            }

            userId = existingProfile.id
        } else {
            // 2. Create new auth user
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: driver.email.toLowerCase(),
                password: driver.login_pin ? driver.login_pin + 'fleet' : undefined, // Set PIN+suffix as password
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
            login_pin: driver.login_pin || null
        }

        const { error: insertError } = await supabaseAdmin
            .from('drivers')
            .insert(driverData)

        if (insertError) {
            // Check for duplicate PIN
            if (insertError.code === '23505' && insertError.message.includes('login_pin')) {
                return { success: false, error: 'This PIN is already assigned to another driver.' }
            }
            return { success: false, error: insertError.message }
        }

        // 4. Update profile phone if provided
        if (driver.phone) {
            await supabaseAdmin.from('profiles').update({ phone: driver.phone }).eq('id', userId)
        }

        return { success: true, driverId: userId }

    } catch (error: any) {
        console.error('Error creating driver:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}


export async function updateDriver(
    driverId: string,
    updates: DriverInsert,
    profileUpdates?: { email?: string; full_name?: string; phone?: string }
): Promise<{ success: boolean; error?: string }> {
    // Validate service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { success: false, error: 'Server configuration error: Missing Service Role Key' }
    }

    try {
        // 1. Update Driver Record
        const { error: updateError } = await supabaseAdmin
            .from('drivers')
            .update(updates)
            .eq('id', driverId)

        if (updateError) {
            if (updateError.code === '23505' && updateError.message.includes('login_pin')) {
                return { success: false, error: 'This PIN is already assigned to another driver.' }
            }
            throw updateError
        }

        // 2. Update Profile if provided
        if (profileUpdates) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update(profileUpdates)
                .eq('id', driverId)

            if (profileError) throw profileError
        }

        // 3. SYNC PASSWORD if PIN is changed
        if (updates.login_pin) {
            const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(driverId, {
                password: updates.login_pin + 'fleet'
            })
            if (passwordError) throw passwordError
        }

        return { success: true }

    } catch (error: any) {
        console.error('Error updating driver:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}
