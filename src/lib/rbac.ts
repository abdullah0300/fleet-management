// Role-Based Access Control Utilities

export type UserRole = 'admin' | 'fleet_manager' | 'dispatcher' | 'driver' | 'accountant'

// Define permissions for each route/feature
export type Permission =
    | 'view:dashboard'
    | 'view:vehicles'
    | 'manage:vehicles'
    | 'view:drivers'
    | 'manage:drivers'
    | 'view:jobs'
    | 'manage:jobs'
    | 'view:routes'
    | 'manage:routes'
    | 'view:tracking'
    | 'view:maintenance'
    | 'manage:maintenance'
    | 'view:documents'
    | 'manage:documents'
    | 'view:reports'
    | 'view:settings'
    | 'manage:settings'

// Role-Permission Matrix
const rolePermissions: Record<UserRole, Permission[]> = {
    admin: [
        'view:dashboard', 'view:vehicles', 'manage:vehicles',
        'view:drivers', 'manage:drivers', 'view:jobs', 'manage:jobs',
        'view:routes', 'manage:routes', 'view:tracking',
        'view:maintenance', 'manage:maintenance', 'view:documents',
        'manage:documents', 'view:reports', 'view:settings', 'manage:settings'
    ],
    fleet_manager: [
        'view:dashboard', 'view:vehicles', 'manage:vehicles',
        'view:drivers', 'manage:drivers', 'view:jobs', 'manage:jobs',
        'view:routes', 'manage:routes', 'view:tracking',
        'view:maintenance', 'manage:maintenance', 'view:documents',
        'manage:documents', 'view:reports', 'view:settings'
    ],
    dispatcher: [
        'view:dashboard', 'view:vehicles', 'view:drivers',
        'view:jobs', 'manage:jobs', 'view:routes', 'manage:routes',
        'view:tracking', 'view:maintenance', 'view:documents'
    ],
    driver: [
        'view:dashboard', 'view:jobs', 'view:tracking'
    ],
    accountant: [
        'view:dashboard', 'view:reports', 'view:drivers',
        'view:jobs', 'view:maintenance'
    ]
}

// Check if a role has a specific permission
export function hasPermission(role: UserRole | null, permission: Permission): boolean {
    if (!role) return false
    return rolePermissions[role]?.includes(permission) ?? false
}

// Check if a role has any of the specified permissions
export function hasAnyPermission(role: UserRole | null, permissions: Permission[]): boolean {
    if (!role) return false
    return permissions.some(p => hasPermission(role, p))
}

// Check if a role has all of the specified permissions
export function hasAllPermissions(role: UserRole | null, permissions: Permission[]): boolean {
    if (!role) return false
    return permissions.every(p => hasPermission(role, p))
}

// Get route access requirements
const routePermissions: Record<string, Permission> = {
    '/dashboard': 'view:dashboard',
    '/dashboard/vehicles': 'view:vehicles',
    '/dashboard/vehicles/new': 'manage:vehicles',
    '/dashboard/drivers': 'view:drivers',
    '/dashboard/drivers/new': 'manage:drivers',
    '/dashboard/jobs': 'view:jobs',
    '/dashboard/jobs/new': 'manage:jobs',
    '/dashboard/routes': 'view:routes',
    '/dashboard/routes/new': 'manage:routes',
    '/dashboard/tracking': 'view:tracking',
    '/dashboard/maintenance': 'view:maintenance',
    '/dashboard/maintenance/new': 'manage:maintenance',
    '/dashboard/documents': 'view:documents',
    '/dashboard/reports': 'view:reports',
    '/dashboard/settings': 'view:settings',
    '/dashboard/costs': 'view:reports',
}

// Check if a user can access a specific route
export function canAccessRoute(role: UserRole | null, pathname: string): boolean {
    if (!role) return false

    // Admin can access everything
    if (role === 'admin') return true

    // Check exact match first
    const requiredPermission = routePermissions[pathname]
    if (requiredPermission) {
        return hasPermission(role, requiredPermission)
    }

    // Check for dynamic routes (e.g., /dashboard/vehicles/[id])
    const basePath = pathname.split('/').slice(0, 3).join('/')
    const basePermission = routePermissions[basePath]
    if (basePermission) {
        return hasPermission(role, basePermission)
    }

    // Default: allow view-only routes
    return true
}

// Get sidebar items based on role
export function getAccessibleRoutes(role: UserRole | null) {
    const allRoutes = [
        { path: '/dashboard', name: 'Dashboard', permission: 'view:dashboard' as Permission },
        { path: '/dashboard/vehicles', name: 'Vehicles', permission: 'view:vehicles' as Permission },
        { path: '/dashboard/drivers', name: 'Drivers', permission: 'view:drivers' as Permission },
        { path: '/dashboard/jobs', name: 'Jobs', permission: 'view:jobs' as Permission },
        { path: '/dashboard/routes', name: 'Routes', permission: 'view:routes' as Permission },
        { path: '/dashboard/tracking', name: 'Tracking', permission: 'view:tracking' as Permission },
        { path: '/dashboard/maintenance', name: 'Maintenance', permission: 'view:maintenance' as Permission },
        { path: '/dashboard/documents', name: 'Documents', permission: 'view:documents' as Permission },
        { path: '/dashboard/reports', name: 'Reports', permission: 'view:reports' as Permission },
        { path: '/dashboard/costs', name: 'Costs', permission: 'view:reports' as Permission },
        { path: '/dashboard/settings', name: 'Settings', permission: 'view:settings' as Permission },
    ]

    return allRoutes.filter(route => hasPermission(role, route.permission))
}
