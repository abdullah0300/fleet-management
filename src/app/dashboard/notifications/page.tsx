'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    useNotifications,
    useMarkAsRead,
    useDeleteNotification,
    useMarkAllAsRead,
    getNotificationIcon,
    formatNotificationTime
} from '@/hooks/useNotifications'
import { Skeleton } from '@/components/ui/skeleton'
import { Bell, CheckCheck } from 'lucide-react'
import { NotificationItem } from '@/components/notifications/NotificationItem'

export default function NotificationsPage() {
    const { data: notifications = [], isLoading } = useNotifications()
    const markAsReadMutation = useMarkAsRead()
    const deleteMutation = useDeleteNotification()
    const markAllMutation = useMarkAllAsRead()

    if (isLoading) {
        return <NotificationsLoading />
    }

    return (
        <div className="container mx-auto py-6 max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your alerts and system messages
                    </p>
                </div>
                {notifications.some(n => !n.read) && (
                    <Button variant="outline" onClick={() => markAllMutation.mutate()} className="gap-2">
                        <CheckCheck className="h-4 w-4" />
                        Mark all as read
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                        You have {notifications.filter(n => !n.read).length} unread notifications
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {notifications.length === 0 ? (
                            <div className="p-12 text-center">
                                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                                <h3 className="text-lg font-medium text-foreground">No notifications</h3>
                                <p className="text-muted-foreground mt-1">
                                    You're all caught up! Check back later for updates.
                                </p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                                    onDelete={(id) => deleteMutation.mutate(id)}
                                    compact={false}
                                />
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function NotificationsLoading() {
    return (
        <div className="container mx-auto py-6 max-w-4xl space-y-6">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
            </div>
        </div>
    )
}
