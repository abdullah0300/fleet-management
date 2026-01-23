'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Truck,
    Users,
    Map,
    ClipboardList,
    Navigation,
    FileText,
    Settings,
    ChartBar,
    DollarSign,
    Wrench
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vehicles', href: '/dashboard/vehicles', icon: Truck },
    { name: 'Drivers', href: '/dashboard/drivers', icon: Users },
    { name: 'Routes', href: '/dashboard/routes', icon: Map },
    { name: 'Jobs', href: '/dashboard/jobs', icon: ClipboardList },
    { name: 'Costs', href: '/dashboard/costs', icon: DollarSign },
    { name: 'Tracking', href: '/dashboard/tracking', icon: Navigation },
    { name: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench },
    { name: 'Reports', href: '/dashboard/reports', icon: ChartBar },
    { name: 'Documents', href: '/dashboard/documents', icon: FileText },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname()

    return (
        <div className={cn("flex h-full flex-col gap-2", className)}>
            <div className="flex-1 overflow-auto py-2">
                <nav className="grid gap-1 px-2 text-sm font-medium">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/dashboard' && pathname.startsWith(item.href))

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                                    isActive
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}
