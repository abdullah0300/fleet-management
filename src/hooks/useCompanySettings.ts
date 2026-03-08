import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from './useCurrentUser'

export const companySettingsKeys = {
    all: ['companySettings'] as const,
    detail: (companyId: string | null) => [...companySettingsKeys.all, companyId] as const,
}

export interface CompanySettings {
    defaultBillingType?: 'flat_rate' | 'per_mile' | 'per_weight' | 'hourly'
    defaultPriority?: 'low' | 'normal' | 'high' | 'urgent'
    defaultFuelType?: 'diesel' | 'petrol' | 'electric' | 'hybrid'
    defaultPaymentType?: 'per_mile' | 'per_trip' | 'hourly' | 'salary'
    defaultDriverRate?: string | number
    defaultFuelPrice?: string | number
    defaultFuelEfficiency?: string | number
    metricSystem?: 'imperial' | 'metric'
}

export function useCompanySettings() {
    const { data: user } = useCurrentUser()
    const companyId = user?.company_id || null

    return useQuery({
        queryKey: companySettingsKeys.detail(companyId),
        queryFn: async () => {
            if (!companyId) return null

            const supabase = createClient()
            const { data, error } = await supabase
                .from('companies')
                .select('settings')
                .eq('id', companyId)
                .single()

            if (error) {
                console.error('Error fetching company settings:', error)
                return null
            }

            return (data?.settings as unknown as CompanySettings) || null
        },
        enabled: !!companyId,
    })
}
