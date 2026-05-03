'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { UserRole } from '@/lib/rbac'

// Redirect each role to their most relevant landing page
function getRoleRedirect(role: UserRole | null): string {
    switch (role) {
        case 'driver':
            return '/dashboard/jobs'
        case 'accountant':
            return '/dashboard/reports'
        case 'dispatcher':
            return '/dashboard/dispatch'
        default:
            // admin, fleet_manager, unknown → main dashboard
            return '/dashboard'
    }
}

export async function login(formData: FormData) {
    const email    = formData.get('email') as string
    const password = formData.get('password') as string
    const remember = formData.get('remember') === 'on'

    const cookieStore = await cookies()

    // If "Keep me logged in" is checked → persistent cookie for 30 days.
    // If not checked → no maxAge, so the cookie is a session cookie and
    // will be cleared when the browser is closed.
    const maxAge = remember ? 60 * 60 * 24 * 30 : undefined

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, {
                                ...options,
                                ...(maxAge !== undefined ? { maxAge } : {}),
                            })
                        )
                    } catch {
                        // Called from a Server Component — safe to ignore.
                    }
                },
            },
        }
    )

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
        console.error('Login error:', error)
        redirect(`/login?error=${encodeURIComponent(error.message)}`)
    }

    // Fetch the user's role for a role-appropriate redirect
    const { data: { user } } = await supabase.auth.getUser()
    let redirectTo = '/dashboard'

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        redirectTo = getRoleRedirect((profile?.role as UserRole) ?? null)
    }

    revalidatePath('/', 'layout')
    redirect(redirectTo)
}


export async function signup(formData: FormData) {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error } = await supabase.auth.signUp(data)

    if (error) {
        redirect('/login?error=Could not create user')
    }

    revalidatePath('/', 'layout')
    redirect('/login?message=Check email to continue sign in process')
}
