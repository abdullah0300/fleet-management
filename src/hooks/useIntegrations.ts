import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { connectIntegration, disconnectIntegration, getIntegrationStatus } from '@/actions/integrations'

export const integrationKeys = {
    all: ['integrations'] as const,
    status: (slug: string) => [...integrationKeys.all, 'status', slug] as const,
}

export function useIntegrationStatus(slug: string) {
    return useQuery({
        queryKey: integrationKeys.status(slug),
        queryFn: () => getIntegrationStatus(slug),
    })
}

export function useConnectIntegration() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            slug,
            credentials,
        }: {
            slug: string
            credentials: { username: string; password: string }
        }) => connectIntegration(slug, credentials),
        onSuccess: (_data, { slug }) => {
            queryClient.invalidateQueries({ queryKey: integrationKeys.status(slug) })
        },
    })
}

export function useDisconnectIntegration() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (slug: string) => disconnectIntegration(slug),
        onSuccess: (_data, slug) => {
            queryClient.invalidateQueries({ queryKey: integrationKeys.status(slug) })
        },
    })
}
