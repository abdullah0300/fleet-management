'use client'

import { User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MobileNav } from './MobileNav'
import { NotificationBell } from '@/components/notifications/NotificationBell'

export function Header() {
    return (
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
            {/* Mobile hamburger menu */}
            <MobileNav />

            <div className="flex-1">
                {/* Empty or page title can go here */}
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                <NotificationBell />
                <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                    <span className="sr-only">Toggle user menu</span>
                </Button>
            </div>
        </header>
    )
}

