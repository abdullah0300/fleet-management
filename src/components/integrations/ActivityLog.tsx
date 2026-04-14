'use client'

import { Badge } from '@/components/ui/badge'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { useIntegrationEvents } from '@/hooks/useIntegrationEvents'
import { IntegrationEvent } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'

interface ActivityLogProps {
    slug: string
}

export function ActivityLog({ slug }: ActivityLogProps) {
    const { data: events = [], isLoading } = useIntegrationEvents(slug, 50)

    if (isLoading) {
        return <p className="text-sm text-muted-foreground py-4 text-center">Loading activity...</p>
    }

    if (events.length === 0) {
        return <p className="text-sm text-muted-foreground py-4 text-center">No activity yet.</p>
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-36">Time</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead className="w-24">Direction</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>Reference</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {events.map((event: IntegrationEvent) => (
                    <TableRow key={event.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                            {event.event_type.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>
                            <Badge variant={(event.direction === 'inbound' ? 'secondary' : 'outline') as 'secondary' | 'outline'}>
                                {event.direction}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            <Badge variant={(event.status === 'success' ? 'default' : 'destructive') as 'default' | 'destructive'}>
                                {event.status}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                            {event.reference ?? '—'}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}
