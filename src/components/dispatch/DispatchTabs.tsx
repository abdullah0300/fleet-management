'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { LayoutGrid, Calendar, Inbox } from 'lucide-react'
import { usePendingTenderCount } from '@/hooks/usePendingTenders'

interface DispatchTabsProps {
    children: React.ReactNode
    visualBoard: React.ReactNode
    pendersPanel?: React.ReactNode
}

function TenderBadge() {
    const { data: count = 0 } = usePendingTenderCount()
    if (count === 0) return null
    return (
        <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[10px] leading-none ml-1">
            {count > 99 ? '99+' : count}
        </Badge>
    )
}

export function DispatchTabs({ children, visualBoard, pendersPanel }: DispatchTabsProps) {
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    if (!isMounted) {
        return null
    }

    return (
        <Tabs defaultValue="command-center" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2 border-b bg-background">
                <TabsList className="w-auto h-8">
                    <TabsTrigger value="command-center" className="gap-2 text-xs">
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Manifest Builder
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="gap-2 text-xs">
                        <Calendar className="h-3.5 w-3.5" />
                        Calendar View
                    </TabsTrigger>
                    <TabsTrigger value="tenders" className="gap-1 text-xs">
                        <Inbox className="h-3.5 w-3.5" />
                        Pending Tenders
                        <TenderBadge />
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="command-center" className="flex-1 overflow-hidden mt-0 pt-0 min-h-0">
                {children}
            </TabsContent>

            <TabsContent value="calendar" className="flex-1 overflow-auto p-4 mt-0">
                <div className="h-full">
                    {visualBoard}
                </div>
            </TabsContent>

            <TabsContent value="tenders" className="flex-1 overflow-hidden mt-0">
                {pendersPanel}
            </TabsContent>
        </Tabs>
    )
}
