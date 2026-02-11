import { createClient } from '@/lib/supabase/client'
import { Company, CompanyInsert, CompanyUpdate } from '@/types/database'

const supabase = createClient()

export type CompanyWithDetails = Company & {
    _count?: {
        vehicles: number
        drivers: number
        jobs: number
    }
}

// Fetch all companies (Platform Admin only)
export async function fetchCompanies(): Promise<CompanyWithDetails[]> {
    const { data, error } = await supabase
        .from('companies')
        .select(`
            *,
            vehicles:vehicles(count),
            drivers:drivers(count),
            jobs:jobs(count)
        `)
        .order('created_at', { ascending: false })

    if (error) throw error

    // Transform count results
    return (data || []).map((company: any) => ({
        ...company,
        _count: {
            vehicles: company.vehicles?.[0]?.count || 0,
            drivers: company.drivers?.[0]?.count || 0,
            jobs: company.jobs?.[0]?.count || 0
        }
    }))
}

// Fetch single company by ID
export async function fetchCompany(id: string): Promise<Company> {
    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error
    return data
}

// Create a new company
export async function createCompany(company: CompanyInsert): Promise<Company> {
    const { data, error } = await supabase
        .from('companies')
        .insert([company])
        .select()
        .single()

    if (error) throw error
    return data
}

// Update a company
export async function updateCompany(id: string, updates: CompanyUpdate): Promise<Company> {
    const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data
}

// Delete a company (or suspend)
export async function deleteCompany(id: string): Promise<void> {
    // Ideally just suspend, but DELETE for now
    const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id)

    if (error) throw error
}
