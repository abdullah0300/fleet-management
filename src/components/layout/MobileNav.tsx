'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, Package2 } from 'lucide-react'
import {
    LayoutDashboard,
    Truck,
    Users,
    Map,
    ClipboardList,
    ScrollText,
    Navigation,
    FileText,
    Settings,
    ChartBar,
    DollarSign,
    Wrench,
    CalendarDays
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vehicles', href: '/dashboard/vehicles', icon: Truck },
    { name: 'Drivers', href: '/dashboard/drivers', icon: Users },
    { name: 'Routes', href: '/dashboard/routes', icon: Map },
    { name: 'Dispatch', href: '/dashboard/dispatch', icon: CalendarDays },
    { name: 'Jobs', href: '/dashboard/jobs', icon: ClipboardList },
    { name: 'Manifests', href: '/dashboard/manifests', icon: ScrollText },
    { name: 'Costs', href: '/dashboard/costs', icon: DollarSign },
    { name: 'Tracking', href: '/dashboard/tracking', icon: Navigation },
    { name: 'Maintenance', href: '/dashboard/maintenance', icon: Wrench },
    { name: 'Reports', href: '/dashboard/reports', icon: ChartBar },
    { name: 'Documents', href: '/dashboard/documents', icon: FileText },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export function MobileNav() {
    const pathname = usePathname()

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
                <SheetHeader className="border-b px-4 py-4">
                    <SheetTitle className="flex items-center gap-2">
                        <Package2 className="h-6 w-6" />
                        Fleet SaaS
                    </SheetTitle>
                </SheetHeader>
                <nav className="grid gap-1 p-4">
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
            </SheetContent>
        </Sheet>
    )
}
