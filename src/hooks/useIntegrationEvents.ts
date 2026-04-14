import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { IntegrationEvent } from '@/types/database'
import { useCompanyId } from './useCurrentUser'

const supabase = createClient()

export const integrationEventKeys = {
    all: ['integration_events'] as const,
    list: (slug: string, limit: number) =>
        [...integrationEventKeys.all, slug, limit] as const,
}

async function fetchIntegrationEvents(
    companyId: string,
    slug: string,
    limit: number,
): Promise<IntegrationEvent[]> {
    const { data, error } = await supabase
        .from('integration_events')
        .select('*')
        .eq('company_id', companyId)
        .eq('integration_slug', slug)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching integration events:', error)
        return []
    }
    return (data ?? []) as IntegrationEvent[]
}

export function useIntegrationEvents(slug: string, limit = 50) {
    const companyId = useCompanyId()

    return useQuery({
        queryKey: integrationEventKeys.list(slug, limit),
        queryFn: () => fetchIntegrationEvents(companyId ?? '', slug, limit),
        enabled: !!companyId && !!slug,
    })
}
