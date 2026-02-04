'use client'

import { ReactNode } from 'react'
import { useHasPermission, useUserRole, useCurrentUser } from '@/hooks/useCurrentUser'
import { Permission, hasPermission, UserRole } from '@/lib/rbac'

interface PermissionGateProps {
    permission: Permission
    children: ReactNode
    fallback?: ReactNode
}

/**
 * Component that conditionally renders children based on user permission
 */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
    const hasAccess = useHasPermission(permission)

    if (!hasAccess) {
        return <>{fallback}</>
    }

    return <>{children}</>
}

interface RoleGateProps {
    roles: UserRole[]
    children: ReactNode
    fallback?: ReactNode
}

/**
 * Component that conditionally renders children based on user role
 */
export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
    const userRole = useUserRole()

    if (!userRole || !roles.includes(userRole)) {
        return <>{fallback}</>
    }

    return <>{children}</>
}

interface AccessDeniedProps {
    message?: string
}

/**
 * Access denied message component
 */
export function AccessDenied({ message = "You don't have permission to view this content." }: AccessDeniedProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
            <div className="w-16 h-16 rounded-full bg-status-error-muted flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-status-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground text-sm max-w-md">{message}</p>
        </div>
    )
}
