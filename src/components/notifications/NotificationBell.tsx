'use client'

import { useState, useEffect } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import {
    useNotifications,
    useUnreadCount,
    useMarkAsRead,
    useMarkAllAsRead,
    useDeleteNotification,
} from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { NotificationItem } from './NotificationItem'

export function NotificationBell() {
    const [isMounted, setIsMounted] = useState(false)
    const [open, setOpen] = useState(false)
    const { data: notifications = [] } = useNotifications()
    const { data: unreadCount = 0 } = useUnreadCount()
    const markAsReadMutation = useMarkAsRead()
    const markAllMutation = useMarkAllAsRead()
    const deleteMutation = useDeleteNotification()

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) return null

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 sm:w-96 p-0" align="end">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b bg-muted/40">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAllMutation.mutate()}
                            className="h-auto text-xs py-1 px-2 h-7"
                        >
                            <CheckCheck className="mr-1 h-3 w-3" />
                            Mark all read
                        </Button>
                    )}
                </div>

                {/* List */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
                            <p className="text-sm text-muted-foreground">No notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.slice(0, 5).map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onMarkAsRead={(id) => markAsReadMutation.mutate(id)}
                                    onDelete={(id) => deleteMutation.mutate(id)}
                                    compact={true}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2 border-t bg-muted/40">
                    <Button
                        variant="ghost"
                        className="w-full text-xs h-8"
                        asChild
                        onClick={() => setOpen(false)}
                    >
                        <Link href="/dashboard/notifications">
                            View all notifications
                        </Link>
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
