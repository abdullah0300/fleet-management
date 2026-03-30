'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

// Single module-level client — never recreated on re-renders
const supabase = createClient()

/**
 * Hook to listen for database changes and invalidate React Query cache.
 * @param tableName The database table to listen to (e.g., 'jobs', 'manifests')
 * @param queryKeys The React Query keys to invalidate when a change occurs
 * @param filter Optional Postgres filter string (e.g., 'id=eq.123')
 */
export function useRealtimeUpdate(
    tableName: string,
    queryKeys: readonly unknown[],
    filter?: string
) {
    const queryClient = useQueryClient()

    // Keep a ref to the latest queryKeys so the subscription effect never
    // needs to list it as a dependency — prevents channel rebuild on every render
    // when callers pass inline array literals.
    const queryKeysRef = useRef(queryKeys)
    useEffect(() => {
        queryKeysRef.current = queryKeys
    })

    useEffect(() => {
        const channelName = `realtime-${tableName}-${filter || 'all'}`

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: tableName,
                    filter
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: queryKeysRef.current })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [tableName, filter, queryClient]) // queryKeys intentionally omitted — managed via ref
}
