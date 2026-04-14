import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PendingTender } from '@/types/database'
import { useEffect } from 'react'
import { useCompanyId } from './useCurrentUser'
import { acceptTender, declineTender } from '@/actions/integrations'
import { jobKeys } from './useJobs'
import { toast } from 'sonner'

const supabase = createClient()

export const tenderKeys = {
    all: ['pending_tenders'] as const,
    lists: () => [...tenderKeys.all, 'list'] as const,
    count: () => [...tenderKeys.all, 'count'] as const,
}

async function fetchPendingTenders(companyId: string): Promise<PendingTender[]> {
    const { data, error } = await supabase
        .from('pending_tenders')
        .select('*')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .order('received_at', { ascending: false })

    if (error) {
        console.error('Error fetching pending tenders:', error)
        return []
    }
    return (data ?? []) as PendingTender[]
}

async function fetchPendingTenderCount(companyId: string): Promise<number> {
    const { count, error } = await supabase
        .from('pending_tenders')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'pending')

    if (error) return 0
    return count ?? 0
}

/**
 * Fetches all pending tenders and subscribes to realtime inserts.
 */
export function usePendingTenders() {
    const queryClient = useQueryClient()
    const companyId = useCompanyId()

    const query = useQuery({
        queryKey: tenderKeys.lists(),
        queryFn: () => fetchPendingTenders(companyId ?? ''),
        enabled: !!companyId,
    })

    useEffect(() => {
        if (!companyId) return

        const channel = supabase
            .channel('pending-tenders-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'pending_tenders',
                    filter: `company_id=eq.${companyId}`,
                },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: tenderKeys.lists() })
                    queryClient.invalidateQueries({ queryKey: tenderKeys.count() })

                    const tender = payload.new as PendingTender
                    toast('New Load Tender', {
                        description: `Tender ${tender.shipment_reference} arrived from ${tender.integration_slug}.`,
                    })
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [companyId, queryClient])

    return query
}

/**
 * Count-only hook for the Dispatch tab badge.
 */
export function usePendingTenderCount() {
    const companyId = useCompanyId()

    return useQuery({
        queryKey: tenderKeys.count(),
        queryFn: () => fetchPendingTenderCount(companyId ?? ''),
        enabled: !!companyId,
        refetchInterval: 60_000,   // fallback poll every 60s
    })
}

export function useAcceptTender() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (tenderId: string) => acceptTender(tenderId),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: tenderKeys.lists() })
            queryClient.invalidateQueries({ queryKey: tenderKeys.count() })
            if (result.success && result.jobId) {
                queryClient.invalidateQueries({ queryKey: jobKeys.lists() })
            }
        },
    })
}

export function useDeclineTender() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (tenderId: string) => declineTender(tenderId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: tenderKeys.lists() })
            queryClient.invalidateQueries({ queryKey: tenderKeys.count() })
        },
    })
}
