import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Notification, NotificationInsert } from '@/types/database'

const supabase = createClient()

// Query keys factory
export const notificationKeys = {
    all: ['notifications'] as const,
    lists: () => [...notificationKeys.all, 'list'] as const,
    unread: () => [...notificationKeys.all, 'unread'] as const,
    detail: (id: string) => [...notificationKeys.all, 'detail', id] as const,
}

/**
 * Fetch all notifications for current user
 */
async function fetchNotifications(): Promise<Notification[]> {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) throw error
    return (data || []) as Notification[]
}

/**
 * Fetch unread count
 */
async function fetchUnreadCount(): Promise<number> {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)

    if (error) throw error
    return count || 0
}

// ==========================================
// QUERY HOOKS
// ==========================================

/**
 * Hook to fetch all notifications
 */
export function useNotifications() {
    return useQuery({
        queryKey: notificationKeys.lists(),
        queryFn: fetchNotifications,
        staleTime: 1 * 60 * 1000, // 1 minute (notifications should refresh often)
        refetchInterval: 30 * 1000, // Refetch every 30 seconds
    })
}

/**
 * Hook to fetch unread notification count
 */
export function useUnreadCount() {
    return useQuery({
        queryKey: notificationKeys.unread(),
        queryFn: fetchUnreadCount,
        staleTime: 1 * 60 * 1000,
        refetchInterval: 30 * 1000,
    })
}

// ==========================================
// MUTATION HOOKS
// ==========================================

/**
 * Hook to create notification
 */
export function useCreateNotification() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (notification: NotificationInsert) => {
            const { data, error } = await supabase
                .from('notifications')
                .insert(notification)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
            queryClient.invalidateQueries({ queryKey: notificationKeys.unread() })
        },
    })
}

/**
 * Hook to mark notification as read
 */
export function useMarkAsRead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id)

            if (error) throw error
            return id
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
            queryClient.invalidateQueries({ queryKey: notificationKeys.unread() })
        },
    })
}

/**
 * Hook to mark all as read
 */
export function useMarkAllAsRead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('notifications')
                .update({ read: true })
                .eq('read', false)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
            queryClient.invalidateQueries({ queryKey: notificationKeys.unread() })
        },
    })
}

/**
 * Hook to delete notification
 */
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

            // Optimistic update
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

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
        job_assigned: '📦',
        maintenance_due: '🔧',
        delivery_complete: '✅',
        document_expiring: '📄',
        late_delivery: '⏰',
        driver_available: '👤',
        vehicle_available: '🚗',
    }
    return icons[type] || '🔔'
}

/**
 * Format notification time
 */
export function formatNotificationTime(timestamp: string): string {
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
