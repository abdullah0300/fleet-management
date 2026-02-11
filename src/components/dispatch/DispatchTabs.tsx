'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LayoutGrid, Calendar } from 'lucide-react'

interface DispatchTabsProps {
    children: React.ReactNode
    visualBoard: React.ReactNode
}

export function DispatchTabs({ children, visualBoard }: DispatchTabsProps) {
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
        </Tabs>
    )
}
