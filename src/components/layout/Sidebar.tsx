'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { getAccessibleRoutes, UserRole } from '@/lib/rbac'

// line-md icons animate on mount (SVG stroke draw).
// mdi icons used where line-md has no equivalent — they're visible and consistent.
const iconMap: Record<string, string> = {
    'Dashboard':   'line-md:home-md',
    'Companies':   'line-md:account-multiple',
    'Vehicles':    'mdi:truck-outline',
    'Drivers':     'line-md:account',
    'Routes':      'line-md:map-marker',
    'Dispatch':    'line-md:calendar',
    'Jobs':        'line-md:list-3',
    'Manifests':   'line-md:document',
    'Finances':    'mdi:cash-multiple',
    'Costs':       'mdi:cash-multiple',
    'Customers':   'line-md:account-add',
    'Tracking':    'line-md:compass-loop',
    'Maintenance': 'mdi:wrench-outline',
    'Reports':     'mdi:chart-bar',
    'Documents':   'line-md:document-list',
    'Settings':    'line-md:cog-loop',
}

// Each nav item manages its own hover key so re-mounting the Icon
// replays its built-in SVG draw animation on button hover.
function NavItem({
    href,
    icon,
    label,
    isActive,
}: {
    href: string
    icon: string
    label: string
    isActive: boolean
}) {
    const [key, setKey] = useState(0)

    return (
        <Link
            href={href}
            onMouseEnter={() => setKey(k => k + 1)}
            className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all w-full",
                isActive
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
        >
            <Icon key={key} icon={icon} width={20} height={20} className="shrink-0" />
            <span className="truncate text-sm">{label}</span>
        </Link>
    )
}

function SignOutButton({ onSignOut }: { onSignOut: () => void }) {
    const [key, setKey] = useState(0)
    return (
        <button
            onClick={onSignOut}
            onMouseEnter={() => setKey(k => k + 1)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
            <Icon key={key} icon="line-md:logout" width={20} height={20} className="shrink-0" />
            Sign Out
        </button>
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
                <nav className="flex flex-col gap-0.5 px-3 font-medium">
                    {routes.map((item, index) => {
                        const iconName = iconMap[item.name] ?? 'line-md:home-md'
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
                                <NavItem
                                    href={item.path}
                                    icon={iconName}
                                    label={item.name}
                                    isActive={isActive}
                                />
                            </div>
                        )
                    })}
                </nav>
            </div>

            <div className="px-2 pb-2">
                <SignOutButton onSignOut={handleSignOut} />
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
