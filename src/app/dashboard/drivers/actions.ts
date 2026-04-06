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
    company_id?: string
}

export type ImportResult = {
    successful: number
    failed: { email: string; error: string }[]
}

const BULK_BATCH_SIZE = 10

/**
 * Imports a single driver — creates auth user + driver record atomically.
 * If the driver table insert fails after the auth user was created, the
 * orphaned auth user is deleted before the error propagates.
 */
async function importSingleDriver(driver: DriverImportRow): Promise<void> {
    let userId: string
    let createdNewAuthUser = false

    // 1. Check if a profile (auth user) already exists with this email
    const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', driver.email)
        .single()

    if (existingProfile) {
        userId = existingProfile.id
    } else {
        // Build auth password: PIN is the driver's login credential on mobile.
        // The mobile app authenticates with email + "<pin>fleet".
        // login_pin is intentionally stored in plain text in the drivers table
        // so admins can look it up and the mobile app can perform PIN-based lookup.
        const password = driver.login_pin
            ? driver.login_pin + 'fleet'
            : Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)

        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: driver.email,
            password,
            email_confirm: true,
            user_metadata: {
                full_name: driver.full_name,
                company_id: driver.company_id,
            },
        })

        if (createError) throw createError
        if (!newUser.user) throw new Error('Failed to create auth user')

        userId = newUser.user.id
        createdNewAuthUser = true
    }

    // 2. Check if driver record already exists
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
        login_pin: driver.login_pin || null,
        ...(driver.company_id ? { company_id: driver.company_id } : {}),
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

        if (insertError) {
            // Rollback: delete the auth user we just created to avoid orphaned accounts
            if (createdNewAuthUser) {
                await supabaseAdmin.auth.admin.deleteUser(userId)
            }
            throw insertError
        }
    }

    // 3. Update profile phone if provided
    if (driver.phone) {
        await supabaseAdmin.from('profiles').update({ phone: driver.phone }).eq('id', userId)
    }
}

export async function bulkImportDrivers(drivers: DriverImportRow[]): Promise<ImportResult> {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Server configuration error: Missing Service Role Key')
    }

    const failed: { email: string; error: string }[] = []
    let successCount = 0

    // Process in batches of BULK_BATCH_SIZE to avoid overwhelming the DB
    for (let i = 0; i < drivers.length; i += BULK_BATCH_SIZE) {
        const batch = drivers.slice(i, i + BULK_BATCH_SIZE)

        const results = await Promise.allSettled(batch.map((driver) => importSingleDriver(driver)))

        results.forEach((result, idx) => {
            const driver = batch[idx]
            if (result.status === 'fulfilled') {
                successCount++
            } else {
                console.error(`Error importing driver ${driver.email}:`, result.reason)
                let errorMessage = result.reason instanceof Error ? result.reason.message : 'Unknown error'
                // Friendly message for duplicate PIN constraint
                if (result.reason?.code === '23505' && result.reason?.message?.includes('login_pin')) {
                    errorMessage = `PIN '${driver.login_pin}' is already assigned to another driver.`
                }
                failed.push({ email: driver.email, error: errorMessage })
            }
        })
    }

    return { successful: successCount, failed }
}

/**
 * Create a single driver using admin client (bypasses RLS).
 * Rolls back the auth user if the driver record insert fails.
 */
export async function createDriver(driver: DriverImportRow): Promise<{ success: boolean; error?: string; driverId?: string }> {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { success: false, error: 'Server configuration error: Missing Service Role Key' }
    }

    try {
        let userId: string
        let createdNewAuthUser = false

        // 1. Check if user exists by email
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', driver.email.toLowerCase())
            .single()

        if (existingProfile) {
            const { data: existingDriver } = await supabaseAdmin
                .from('drivers')
                .select('id')
                .eq('id', existingProfile.id)
                .single()

            if (existingDriver) {
                return { success: false, error: 'A driver with this email already exists' }
            }

            // Sync auth password if PIN provided
            if (driver.login_pin) {
                await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, {
                    password: driver.login_pin + 'fleet',
                })
            }

            userId = existingProfile.id
        } else {
            // 2. Create new auth user
            const password = driver.login_pin
                ? driver.login_pin + 'fleet'
                : Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)

            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: driver.email.toLowerCase(),
                password,
                email_confirm: true,
                user_metadata: {
                    full_name: driver.full_name,
                    company_id: driver.company_id,
                },
            })

            if (createError) return { success: false, error: createError.message }
            if (!newUser.user) return { success: false, error: 'Failed to create user' }

            userId = newUser.user.id
            createdNewAuthUser = true
        }

        // 3. Insert driver record
        const driverData: DriverInsert = {
            id: userId,
            license_number: driver.license_number || null,
            license_expiry: driver.license_expiry || null,
            payment_type: driver.payment_type || 'per_mile',
            rate_amount: driver.rate_amount || 0,
            status: driver.status || 'available',
            login_pin: driver.login_pin || null,
            ...(driver.company_id ? { company_id: driver.company_id } : {}),
        }

        const { error: insertError } = await supabaseAdmin
            .from('drivers')
            .insert(driverData)

        if (insertError) {
            // Rollback: delete orphaned auth user
            if (createdNewAuthUser) {
                await supabaseAdmin.auth.admin.deleteUser(userId)
            }
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
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { success: false, error: 'Server configuration error: Missing Service Role Key' }
    }

    try {
        // 1. Update driver record
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

        // 2. Update profile if provided
        if (profileUpdates) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update(profileUpdates)
                .eq('id', driverId)

            if (profileError) throw profileError
        }

        // 3. Sync auth password when PIN is changed
        if (updates.login_pin) {
            const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(driverId, {
                password: updates.login_pin + 'fleet',
            })
            if (passwordError) throw passwordError
        }

        return { success: true }

    } catch (error: any) {
        console.error('Error updating driver:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}
