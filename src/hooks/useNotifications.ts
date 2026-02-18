import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Notification } from '@/types/database'
import { useEffect } from 'react'
import { markAsRead, markAllAsRead } from '@/app/actions/notifications'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const supabase = createClient()

// Query keys factory
export const notificationKeys = {
    all: ['notifications'] as const,
    lists: () => [...notificationKeys.all, 'list'] as const,
    unread: () => [...notificationKeys.all, 'unread'] as const,
}

/**
 * Fetch all notifications for current user
 */
async function fetchNotifications(): Promise<Notification[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) {
        console.error('Error fetching notifications:', error)
        return []
    }
    return (data || []) as Notification[]
}

/**
 * Fetch unread count
 */
async function fetchUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

    if (error) {
        console.error('Error fetching unread count:', error)
        return 0
    }
    return count || 0
}

// ==========================================
// QUERY HOOKS
// ==========================================

export function useNotifications() {
    const queryClient = useQueryClient()
    const router = useRouter()

    const query = useQuery({
        queryKey: notificationKeys.lists(),
        queryFn: fetchNotifications,
    })

    // Setup Realtime Subscription
    useEffect(() => {
        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'notifications',
                },
                (payload) => {
                    // Invalidate queries to refetch data
                    queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
                    queryClient.invalidateQueries({ queryKey: notificationKeys.unread() })

                    // If new notification, show toast
                    if (payload.eventType === 'INSERT') {
                        const newNote = payload.new as Notification
                        toast(newNote.title, {
                            description: newNote.message,
                            // action: {
                            //     label: 'View',
                            //     onClick: () => router.push('/dashboard/notifications')
                            // }
                        })
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [queryClient, router])

    return query
}

export function useUnreadCount() {
    return useQuery({
        queryKey: notificationKeys.unread(),
        queryFn: fetchUnreadCount,
    })
}

// ==========================================
// MUTATION HOOKS
// ==========================================

export function useMarkAsRead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            await markAsRead(id)
            return id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
            queryClient.invalidateQueries({ queryKey: notificationKeys.unread() })
        },
    })
}

export function useMarkAllAsRead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            await markAllAsRead()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
            queryClient.invalidateQueries({ queryKey: notificationKeys.unread() })
        },
    })
}

export function useDeleteNotification() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id)

            if (error) throw error
            return id
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: notificationKeys.lists() })
            const previousData = queryClient.getQueryData<Notification[]>(notificationKeys.lists())

            queryClient.setQueryData<Notification[]>(
                notificationKeys.lists(),
                (old) => old?.filter(n => n.id !== id) || []
            )

            return { previousData }
        },
        onError: (_, __, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(notificationKeys.lists(), context.previousData)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
            queryClient.invalidateQueries({ queryKey: notificationKeys.unread() })
        },
    })
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export function getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
        job_assigned: '📦',
        maintenance_due: '🔧',
        delivery_complete: '✅',
        document_expiring: '📄',
        late_delivery: '⏰',
        driver_available: '👤',
        vehicle_issue: '⚠️',
        system_alert: '🔔',
    }
    return icons[type] || '🔔'
}

export function formatNotificationTime(timestamp: string): string {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
}
