'use client'

import { useState, useEffect } from 'react'
import { User, Settings, LogOut } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from '@/lib/supabase/client'
import { MobileNav } from './MobileNav'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useQuery } from '@tanstack/react-query'

export function Header() {
    const [mounted, setMounted] = useState(false)
    const { data: user } = useCurrentUser()

    const { data: logoUrl } = useQuery({
        queryKey: ['header-company-logo', user?.company_id],
        queryFn: async () => {
            if (!user?.company_id) return null
            const supabase = createClient()
            const { data } = await supabase
                .from('companies')
                .select('logo_url')
                .eq('id', user.company_id)
                .single()
            return data?.logo_url || null
        },
        enabled: !!user?.company_id,
    })

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
            {/* Mobile hamburger menu */}
            <MobileNav />

            <div className="flex-1">
                {/* Empty or page title can go here */}
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
                <NotificationBell />
                {mounted ? (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 border hover:bg-muted overflow-hidden">
                                {logoUrl ? (
                                    <img src={logoUrl} alt="Company Logo" className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-5 w-5" />
                                )}
                                <span className="sr-only">Toggle user menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/dashboard/settings" className="w-full cursor-pointer flex items-center">
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>Settings & Profile</span>
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-600">
                                <LogOut className="mr-2 h-4 w-4" />
                                <span>Sign out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 border hover:bg-muted overflow-hidden">
                        <User className="h-5 w-5" />
                        <span className="sr-only">Toggle user menu</span>
                    </Button>
                )}
            </div>
        </header>
    )
}

