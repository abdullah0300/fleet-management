'use client'

import { Notification } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Check, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getNotificationIcon, formatNotificationTime } from '@/hooks/useNotifications'

import { useRouter } from 'next/navigation'

interface NotificationItemProps {
    notification: Notification
    onMarkAsRead: (id: string) => void
    onDelete: (id: string) => void
    compact?: boolean
}

export function NotificationItem({
    notification,
    onMarkAsRead,
    onDelete,
    compact = false
}: NotificationItemProps) {
    const router = useRouter()

    const handleClick = () => {
        // If unread, mark as read
        if (!notification.read) {
            onMarkAsRead(notification.id)
        }

        // Check for job_id in data and navigate
        if (notification.data && typeof notification.data === 'object' && 'job_id' in notification.data) {
            const jobId = (notification.data as { job_id: string }).job_id
            router.push(`/dashboard/jobs/${jobId}`)
        }
    }

    return (
        <div
            onClick={handleClick}
            className={cn(
                "flex gap-3 hover:bg-muted/50 transition-colors relative group cursor-pointer",
                compact ? "p-3" : "p-4 flex-col sm:flex-row",
                !notification.read && "bg-accent-purple-muted/10"
            )}
        >
            {/* Status Indicator Bar */}
            {!notification.read && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/60" />
            )}

            {/* Icon */}
            <div className={cn("flex-shrink-0", compact ? "mt-0" : "mt-1")}>
                <span className={cn("flex items-center justify-center bg-muted rounded-full", compact ? "w-8 h-8 text-lg" : "w-10 h-10 text-xl")} role="img" aria-label="icon">
                    {getNotificationIcon(notification.type || 'default')}
                </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                        "text-sm",
                        !notification.read ? "font-semibold text-foreground" : "font-medium"
                    )}>
                        {notification.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                        {formatNotificationTime(notification.created_at)}
                    </span>
                </div>

                {notification.message && (
                    <p className={cn(
                        "text-muted-foreground",
                        compact ? "text-xs line-clamp-2" : "text-sm"
                    )}>
                        {notification.message}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className={cn(
                "flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                !notification.read && "opacity-100",
                compact ? "flex-col" : "items-center sm:self-start"
            )}>
                {!notification.read && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                            e.stopPropagation()
                            onMarkAsRead(notification.id)
                        }}
                        title="Mark as read"
                    >
                        <Check className="h-4 w-4" />
                    </Button>
                )}
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete(notification.id)
                    }}
                    title="Delete"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
