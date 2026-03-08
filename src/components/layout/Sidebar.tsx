'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
    CalendarDays,
    LogOut,
    Building2,
    ContactRound
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getAccessibleRoutes, UserRole } from '@/lib/rbac'

// Map route names to icons
const iconMap: Record<string, any> = {
    'Dashboard': LayoutDashboard,
    'Companies': Building2,
    'Vehicles': Truck,
    'Drivers': Users,
    'Routes': Map,
    'Dispatch': CalendarDays, // Note: Dispatch might not be in getAccessibleRoutes yet, need to check
    'Jobs': ClipboardList,
    'Manifests': ScrollText,
    'Costs': DollarSign,
    'Customers': ContactRound,
    'Tracking': Navigation,
    'Maintenance': Wrench,
    'Reports': ChartBar,
    'Documents': FileText,
    'Settings': Settings,
}

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname()
    const { data: user } = useCurrentUser()

    // Get accessible routes based on role and platform admin status
    const routes = getAccessibleRoutes(
        user?.role as UserRole | null,
        user?.is_platform_admin || false
    )

    // Add Dispatch manually if needed (it wasn't in rbac.ts list but was in sidebar)
    // or better, add it to rbac.ts. For now, let's append it if not present, assuming it's a common route?

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    return (
        <div className={cn("flex flex-1 flex-col gap-2 min-h-0 overflow-hidden", className)}>
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
                <nav className="flex flex-col gap-1 px-3 text-sm font-medium">
                    {routes.map((item, index) => {
                        const Icon = iconMap[item.name === 'Finances' ? 'Costs' : item.name] || LayoutDashboard
                        const isActive = pathname === item.path ||
                            (item.path !== '/dashboard' && pathname.startsWith(item.path))

                        // Check if we need to render a group header
                        const isNewGroup = index === 0 || item.group !== routes[index - 1].group

                        return (
                            <div key={item.path} className="flex flex-col w-full">
                                {isNewGroup && item.group !== 'Overview' && (
                                    <div className="mt-5 mb-1.5 px-2">
                                        <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">
                                            {item.group}
                                        </p>
                                    </div>
                                )}
                                <Link
                                    href={item.path}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all w-full",
                                        isActive
                                            ? "bg-primary text-primary-foreground font-medium shadow-sm"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{item.name}</span>
                                </Link>
                            </div>
                        )
                    })}
                </nav>
            </div>

            <div className="px-2 pb-2">
                <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                </button>
            </div>

            <div className="p-4 mt-auto border-t">
                <div className="text-xs text-center text-muted-foreground">
                    <p className="font-semibold text-primary/80">Trucker'sCall</p>
                    <p>Created by Webcraftio</p>
                </div>
            </div>
        </div >
    )
}
