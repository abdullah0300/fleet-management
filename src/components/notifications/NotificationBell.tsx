'use client'

import { useState } from 'react'
import { Bell, Check, CheckCheck, X, Trash2 } from 'lucide-react'
import {
    useNotifications,
    useUnreadCount,
    useMarkAsRead,
    useMarkAllAsRead,
    useDeleteNotification,
    getNotificationIcon,
    formatNotificationTime
} from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export function NotificationBell() {
    const [open, setOpen] = useState(false)
    const { data: notifications = [] } = useNotifications()
    const { data: unreadCount = 0 } = useUnreadCount()
    const markAsReadMutation = useMarkAsRead()
    const markAllMutation = useMarkAllAsRead()
    const deleteMutation = useDeleteNotification()

    const handleMarkAsRead = (id: string) => {
        markAsReadMutation.mutate(id)
    }

    const handleMarkAllAsRead = () => {
        markAllMutation.mutate()
    }

    const handleDelete = (id: string) => {
        deleteMutation.mutate(id)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-status-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 sm:w-96 p-0" align="end">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllAsRead}
                            className="h-7 text-xs gap-1"
                        >
                            <CheckCheck className="h-3 w-3" />
                            Mark all read
                        </Button>
                    )}
                </div>

                {/* Notification List */}
                <div className="max-h-[400px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                            <Bell className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">No notifications</p>
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.slice(0, 10).map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "p-3 hover:bg-muted/50 transition-colors flex gap-3",
                                        !notification.read && "bg-accent-purple-muted/20"
                                    )}
                                >
                                    {/* Icon */}
                                    <span className="text-lg shrink-0">
                                        {getNotificationIcon(notification.type || 'default')}
                                    </span>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className={cn(
                                            "text-sm",
                                            !notification.read && "font-medium"
                                        )}>
                                            {notification.title}
                                        </p>
                                        {notification.message && (
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                {notification.message}
                                            </p>
                                        )}
                                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                                            {formatNotificationTime(notification.created_at)}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-1 shrink-0">
                                        {!notification.read && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => handleMarkAsRead(notification.id)}
                                            >
                                                <Check className="h-3 w-3" />
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-status-error"
                                            onClick={() => handleDelete(notification.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {notifications.length > 10 && (
                    <div className="p-2 border-t text-center">
                        <Button variant="ghost" size="sm" className="text-xs">
                            View all notifications
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
