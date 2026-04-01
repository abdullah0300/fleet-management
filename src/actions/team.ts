'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Initialize admin client with service role key (bypasses RLS)
const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
)

export async function createTeamMember(data: {
    full_name: string
    email: string
    password: string
    role: 'fleet_manager' | 'dispatcher' | 'accountant'
    phone?: string
}): Promise<{ success: boolean; userId?: string; error?: string }> {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { success: false, error: 'Server configuration error: Missing Service Role Key' }
    }

    try {
        // Get the calling user's profile to retrieve company_id
        const supabase = await createClient()
        const { data: { user: callingUser } } = await supabase.auth.getUser()

        if (!callingUser) {
            return { success: false, error: 'Not authenticated' }
        }

        const { data: callingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', callingUser.id)
            .single()

        if (profileError || !callingProfile?.company_id) {
            return { success: false, error: 'Could not determine company' }
        }

        const company_id = callingProfile.company_id

        // Create auth user with admin client
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: data.email.toLowerCase(),
            password: data.password,
            email_confirm: true,
            user_metadata: {
                role: data.role,
                company_id,
                full_name: data.full_name,
            },
        })

        if (createError) {
            return { success: false, error: createError.message }
        }
        if (!newUser.user) {
            return { success: false, error: 'Failed to create user' }
        }

        const userId = newUser.user.id

        // Upsert into profiles table
        const { error: upsertError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                email: data.email.toLowerCase(),
                full_name: data.full_name,
                role: data.role,
                company_id,
                phone: data.phone || null,
            })

        if (upsertError) {
            // Attempt cleanup of created auth user
            await supabaseAdmin.auth.admin.deleteUser(userId)
            return { success: false, error: upsertError.message }
        }

        return { success: true, userId }
    } catch (error: any) {
        console.error('Error creating team member:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function updateTeamMember(
    userId: string,
    data: { full_name?: string; role?: string; phone?: string }
): Promise<{ success: boolean; error?: string }> {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { success: false, error: 'Server configuration error: Missing Service Role Key' }
    }

    try {
        const updates: Record<string, any> = {}
        if (data.full_name !== undefined) updates.full_name = data.full_name
        if (data.role !== undefined) updates.role = data.role
        if (data.phone !== undefined) updates.phone = data.phone || null

        if (Object.keys(updates).length === 0) {
            return { success: true }
        }

        const { error } = await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('id', userId)

        if (error) return { success: false, error: error.message }

        return { success: true }
    } catch (error: any) {
        console.error('Error updating team member:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function deleteTeamMember(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { success: false, error: 'Server configuration error: Missing Service Role Key' }
    }

    try {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (error) return { success: false, error: error.message }

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting team member:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

export async function resetTeamMemberPassword(
    userId: string,
    newPassword: string
): Promise<{ success: boolean; error?: string }> {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return { success: false, error: 'Server configuration error: Missing Service Role Key' }
    }

    try {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: newPassword,
        })

        if (error) return { success: false, error: error.message }

        return { success: true }
    } catch (error: any) {
        console.error('Error resetting team member password:', error)
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}
