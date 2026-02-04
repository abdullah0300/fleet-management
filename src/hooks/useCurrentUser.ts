'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import { UserRole, hasPermission, Permission, canAccessRoute } from '@/lib/rbac'

const supabase = createClient()

async function fetchCurrentUser(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    if (error) return null
    return data as Profile
}

/**
 * Hook to get current user profile with role
 */
export function useCurrentUser() {
    return useQuery({
        queryKey: ['currentUser'],
        queryFn: fetchCurrentUser,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}

/**
 * Hook to check if current user has a specific permission
 */
export function useHasPermission(permission: Permission): boolean {
    const { data: user } = useCurrentUser()
    return hasPermission(user?.role as UserRole | null, permission)
}

/**
 * Hook to check if current user can access a route
 */
export function useCanAccessRoute(pathname: string): boolean {
    const { data: user } = useCurrentUser()
    return canAccessRoute(user?.role as UserRole | null, pathname)
}

/**
 * Hook to get user role
 */
export function useUserRole(): UserRole | null {
    const { data: user } = useCurrentUser()
    return (user?.role as UserRole) || null
}
