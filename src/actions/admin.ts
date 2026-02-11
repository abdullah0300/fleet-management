'use server'

import { createClient } from '@supabase/supabase-js'
import { CompanyInsert } from '@/types/database'

// Initialize Supabase Admin client with Service Role Key
// This bypasses RLS and allows user management
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export type CreateCompanyParams = {
    name: string
    slug: string
    email: string
    address?: string
    phone?: string
    logo_url?: string
    status?: 'active' | 'suspended' | 'trial'
    adminEmail: string
    adminPassword?: string // Optional, if provided we create the user
    adminName?: string
}

export async function createCompanyWithAdmin(params: CreateCompanyParams) {
    try {
        console.log('Creating company:', params.name)

        // 1. Create the Company
        const companyData: CompanyInsert = {
            name: params.name,
            slug: params.slug,
            email: params.email,
            address: params.address,
            phone: params.phone,
            logo_url: params.logo_url,
            status: params.status || 'active'
        }

        const { data: company, error: companyError } = await supabaseAdmin
            .from('companies')
            .insert(companyData)
            .select()
            .single()

        if (companyError) {
            console.error('Error creating company:', companyError)
            return { success: false, error: companyError.message }
        }

        if (!company) {
            return { success: false, error: 'Failed to create company record' }
        }

        console.log('Company created:', company.id)

        // 2. Create the Admin User (if email/password provided)
        if (params.adminEmail && params.adminPassword) {
            console.log('Creating admin user:', params.adminEmail)

            const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
                email: params.adminEmail,
                password: params.adminPassword,
                email_confirm: true, // Auto-confirm for convenience
                user_metadata: {
                    full_name: params.adminName || 'Company Admin',
                    role: 'admin',
                    company_id: company.id
                }
            })

            if (userError) {
                console.error('Error creating admin user:', userError)
                // Note: We don't rollback the company creation here, but we return the error
                // In a production system, we might want a transaction or manual rollback
                return {
                    success: true,
                    company,
                    userError: 'Company created, but failed to create admin user: ' + userError.message
                }
            }

            console.log('Admin user created:', userData.user.id)

            // Explicitly ensure profile is created/updated correctly (trigger should handle it, but explicit update is safer with admin rights)
            // Actually, handle_new_user trigger might have raced or been bypassed by admin.createUser if not careful?
            // The trigger runs on INSERT to public.profiles (if triggered by auth.users insert).
            // But we can also manually upsert the profile to be sure about the role/company_id

            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .upsert({
                    id: userData.user.id,
                    email: params.adminEmail,
                    full_name: params.adminName || 'Company Admin',
                    company_id: company.id,
                    role: 'admin',
                    is_platform_admin: false
                })

            if (profileError) {
                console.error('Error updating profile:', profileError)
            }
        }

        return { success: true, company }

    } catch (error: any) {
        console.error('Unexpected error in createCompanyWithAdmin:', error)
        return { success: false, error: error.message || 'An unexpected error occurred' }
    }
}
