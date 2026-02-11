'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

/**
 * Hook to listen for database changes and invalidate React Query cache
 * @param tableName The database table to listen to (e.g., 'jobs', 'manifests')
 * @param queryKeys The React Query keys to invalidate when a change occurs
 * @param filter Optional Postgres filter string (e.g., 'id=eq.123')
 */
export function useRealtimeUpdate(
    tableName: string,
    queryKeys: readonly unknown[], // Accepts readonly tuples from our query key factories
    filter?: string
) {
    const queryClient = useQueryClient()
    const supabase = createClient()

    useEffect(() => {
        // Create a unique channel name based on parameters
        const channelName = `realtime-${tableName}-${filter || 'all'}`

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: tableName,
                    filter
                },
                () => {
                    // When a change is detected, invalidate the query
                    // This triggers a re-fetch of the fresh data
                    console.log(`Realtime update detected on ${tableName}. Invalidating queries.`)
                    queryClient.invalidateQueries({ queryKey: queryKeys })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [tableName, filter, queryKeys, queryClient, supabase])
}
