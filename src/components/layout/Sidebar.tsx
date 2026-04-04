'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getAccessibleRoutes, UserRole } from '@/lib/rbac'

// Animated line-md icon names per nav item
const iconMap: Record<string, string> = {
    'Dashboard':   'line-md:home-alt',
    'Companies':   'line-md:building-twotone',
    'Vehicles':    'line-md:car-twotone',
    'Drivers':     'line-md:account-multiple',
    'Routes':      'line-md:map-marker-alt',
    'Dispatch':    'line-md:calendar',
    'Jobs':        'line-md:clipboard-list-twotone',
    'Manifests':   'line-md:document-list',
    'Finances':    'line-md:payment',
    'Costs':       'line-md:payment',
    'Customers':   'line-md:account-small',
    'Tracking':    'line-md:compass-loop',
    'Maintenance': 'line-md:wrench',
    'Reports':     'line-md:chart-bar',
    'Documents':   'line-md:file-document',
    'Settings':    'line-md:cog',
}

const signOutIcon = 'line-md:logout'

// Wrapper that re-mounts the icon on hover to replay its entry animation
function AnimatedIcon({ icon, className }: { icon: string; className?: string }) {
    const [key, setKey] = useState(0)
    return (
        <span
            className={cn('shrink-0', className)}
            onMouseEnter={() => setKey(k => k + 1)}
        >
            <Icon key={key} icon={icon} width={16} height={16} />
        </span>
    )
}

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname()
    const { data: user } = useCurrentUser()

    const routes = getAccessibleRoutes(
        user?.role as UserRole | null,
        user?.is_platform_admin || false
    )

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
                        const iconName = iconMap[item.name] ?? 'line-md:home-alt'
                        const isActive = pathname === item.path ||
                            (item.path !== '/dashboard' && pathname.startsWith(item.path))
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
                                    <AnimatedIcon icon={iconName} />
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
                    <AnimatedIcon icon={signOutIcon} />
                    Sign Out
                </button>
            </div>

            <div className="p-4 mt-auto border-t">
                <div className="text-xs text-center text-muted-foreground">
                    <p className="font-semibold text-primary/80">Trucker'sCall</p>
                    <p>Created by Webcraftio</p>
                </div>
            </div>
        </div>
    )
}
