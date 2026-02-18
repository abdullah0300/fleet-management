'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Marks a single notification as read
 */
export async function markAsRead(id: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id)

        if (error) throw error
        
        // Revalidate paths where notifications might be shown
        // In a real-time app, the client subscription handles this mostly,
        // but for server component initial loads, this helps.
        revalidatePath('/dashboard')
        revalidatePath('/dashboard/notifications')
        
        return { success: true }
    } catch (error) {
        console.error('Error marking notification as read:', error)
        return { success: false, error }
    }
}

/**
 * Marks ALL notifications as read for the current user
 */
export async function markAllAsRead() {
    const supabase = await createClient()
    
    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const { error } = await supabase
            .from('notifications')
            .update({ read: true })
            .eq('user_id', user.id)
            .eq('read', false)

        if (error) throw error

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/notifications')
        
        return { success: true }
    } catch (error) {
        console.error('Error marking all notifications as read:', error)
        return { success: false, error }
    }
}

/**
 * Registers a push token for the current user (Mobile App)
 */
export async function registerPushToken(token: string, platform: string = 'web') {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const { error } = await supabase
            .from('user_push_tokens')
            .upsert({
                user_id: user.id,
                token,
                platform,
                last_used_at: new Date().toISOString()
            }, {
                onConflict: 'user_id, token'
            })

        if (error) throw error

        return { success: true }
    } catch (error) {
        console.error('Error registering push token:', error)
        return { success: false, error }
    }
}

/**
 * Sends a notification (Internal System Use Only)
 * Should be called by other internal actions (e.g., job creation)
 */
export async function sendNotification({
    userId,
    title,
    message,
    type,
    data
}: {
    userId: string
    title: string
    message: string
    type: string
    data?: any
}) {
    const supabase = await createClient() // Uses service role if configured correctly, but here uses cookie client. 
    // Ideally, for system triggers, you use a Service Role client to bypass RLS if sending to *other* users.
    // However, if the action is triggered by the user (admin) who has permission to write, this works.
    
    try {
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                title,
                message,
                type,
                data,
                read: false
            })

        if (error) throw error

        return { success: true }
    } catch (error) {
        console.error('Error sending notification:', error)
        return { success: false, error }
    }
}
