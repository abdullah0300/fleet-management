import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { canAccessRoute, UserRole } from '@/lib/rbac'

const PUBLIC_PATHS = [
    '/login', '/register', '/auth', '/api',
    '/forgot-password', '/reset-password',
    '/', '/privacy-policy', '/terms-of-service',
]

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: { headers: request.headers },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: { headers: request.headers },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const pathname = request.nextUrl.pathname
    const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))

    // Redirect unauthenticated users to login
    if (!user && !isPublic) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // RBAC: enforce route-level permissions for dashboard pages
    if (user && pathname.startsWith('/dashboard')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, is_platform_admin')
            .eq('id', user.id)
            .single()

        if (profile) {
            const isPlatformAdmin = profile.is_platform_admin === true
            const role = profile.role as UserRole | null

            if (!canAccessRoute(role, pathname, isPlatformAdmin)) {
                const url = request.nextUrl.clone()
                url.pathname = '/dashboard'
                return NextResponse.redirect(url)
            }
        }
    }

    return response
}
