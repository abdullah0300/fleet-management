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
    | 'view:dispatch'   // NEW
    | 'manage:dispatch' // NEW
    | 'view:manifests'  // NEW
    | 'manage:manifests'// NEW
    | 'view:tracking'
    | 'view:maintenance'
    | 'manage:maintenance'
    | 'view:documents'
    | 'manage:documents'
    | 'view:reports'
    | 'view:settings'
    | 'manage:settings'
    | 'view:companies'
    | 'manage:companies'

// Role-Permission Matrix
const rolePermissions: Record<UserRole, Permission[]> = {
    admin: [
        'view:dashboard', 'view:vehicles', 'manage:vehicles',
        'view:drivers', 'manage:drivers', 'view:jobs', 'manage:jobs',
        'view:routes', 'manage:routes', 'view:dispatch', 'manage:dispatch',
        'view:manifests', 'manage:manifests', 'view:tracking',
        'view:maintenance', 'manage:maintenance', 'view:documents',
        'manage:documents', 'view:reports', 'view:settings', 'manage:settings'
    ],
    fleet_manager: [
        'view:dashboard', 'view:vehicles', 'manage:vehicles',
        'view:drivers', 'manage:drivers', 'view:jobs', 'manage:jobs',
        'view:routes', 'manage:routes', 'view:dispatch', 'manage:dispatch',
        'view:manifests', 'manage:manifests', 'view:tracking',
        'view:maintenance', 'manage:maintenance', 'view:documents',
        'manage:documents', 'view:reports', 'view:settings'
    ],
    dispatcher: [
        'view:dashboard', 'view:vehicles', 'view:drivers',
        'view:jobs', 'manage:jobs', 'view:routes', 'manage:routes',
        'view:dispatch', 'manage:dispatch', 'view:manifests', 'manage:manifests',
        'view:tracking', 'view:maintenance', 'view:documents'
    ],
    driver: [
        'view:dashboard', 'view:jobs', 'view:tracking'
    ],
    accountant: [
        'view:dashboard', 'view:reports', 'view:drivers',
        'view:jobs', 'view:maintenance', 'view:manifests'
    ]
}

// Check if a role has a specific permission
export function hasPermission(role: UserRole | null, permission: Permission, isPlatformAdmin: boolean = false): boolean {
    if (isPlatformAdmin) return true
    if (!role) return false
    return rolePermissions[role]?.includes(permission) ?? false
}

// Check if a role has any of the specified permissions
export function hasAnyPermission(role: UserRole | null, permissions: Permission[], isPlatformAdmin: boolean = false): boolean {
    if (isPlatformAdmin) return true
    if (!role) return false
    return permissions.some(p => hasPermission(role, p))
}

// Check if a role has all of the specified permissions
export function hasAllPermissions(role: UserRole | null, permissions: Permission[], isPlatformAdmin: boolean = false): boolean {
    if (isPlatformAdmin) return true
    if (!role) return false
    return permissions.every(p => hasPermission(role, p))
}

// Get route access requirements
const routePermissions: Record<string, Permission> = {
    '/dashboard': 'view:dashboard',
    '/dashboard/companies': 'view:companies',
    '/dashboard/vehicles': 'view:vehicles',
    '/dashboard/vehicles/new': 'manage:vehicles',
    '/dashboard/drivers': 'view:drivers',
    '/dashboard/drivers/new': 'manage:drivers',
    '/dashboard/jobs': 'view:jobs',
    '/dashboard/jobs/new': 'manage:jobs',
    '/dashboard/routes': 'view:routes',
    '/dashboard/routes/new': 'manage:routes',
    '/dashboard/dispatch': 'view:dispatch', // NEW
    '/dashboard/manifests': 'view:manifests', // NEW
    '/dashboard/manifests/new': 'manage:manifests', // NEW
    '/dashboard/tracking': 'view:tracking',
    '/dashboard/maintenance': 'view:maintenance',
    '/dashboard/maintenance/new': 'manage:maintenance',
    '/dashboard/documents': 'view:documents',
    '/dashboard/reports': 'view:reports',
    '/dashboard/settings': 'view:settings',
    '/dashboard/costs': 'view:reports',
}

// Check if a user can access a specific route
export function canAccessRoute(role: UserRole | null, pathname: string, isPlatformAdmin: boolean = false): boolean {
    if (isPlatformAdmin) return true
    if (!role) return false

    // Admin (company admin) can access everything EXCEPT companies page (unless platform admin)
    if (role === 'admin' && !pathname.startsWith('/dashboard/companies')) return true

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
export function getAccessibleRoutes(role: UserRole | null, isPlatformAdmin: boolean = false) {
    const allRoutes = [
        { path: '/dashboard', name: 'Dashboard', permission: 'view:dashboard' as Permission },
        { path: '/dashboard/companies', name: 'Companies', permission: 'view:companies' as Permission },
        { path: '/dashboard/dispatch', name: 'Dispatch', permission: 'view:dispatch' as Permission }, // NEW
        { path: '/dashboard/jobs', name: 'Jobs', permission: 'view:jobs' as Permission },
        { path: '/dashboard/routes', name: 'Routes', permission: 'view:routes' as Permission },
        { path: '/dashboard/manifests', name: 'Manifests', permission: 'view:manifests' as Permission }, // NEW
        { path: '/dashboard/vehicles', name: 'Vehicles', permission: 'view:vehicles' as Permission },
        { path: '/dashboard/drivers', name: 'Drivers', permission: 'view:drivers' as Permission },
        { path: '/dashboard/tracking', name: 'Tracking', permission: 'view:tracking' as Permission },
        { path: '/dashboard/maintenance', name: 'Maintenance', permission: 'view:maintenance' as Permission },
        { path: '/dashboard/documents', name: 'Documents', permission: 'view:documents' as Permission },
        { path: '/dashboard/reports', name: 'Reports', permission: 'view:reports' as Permission },
        { path: '/dashboard/costs', name: 'Costs', permission: 'view:reports' as Permission },
        { path: '/dashboard/settings', name: 'Settings', permission: 'view:settings' as Permission },
    ]

    return allRoutes.filter(route => hasPermission(role, route.permission, isPlatformAdmin))
}
