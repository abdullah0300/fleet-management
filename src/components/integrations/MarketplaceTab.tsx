'use client'

import { getAllIntegrations } from '@/lib/integrations/registry'
import { IntegrationCard } from './IntegrationCard'
import { useIntegrationStatus } from '@/hooks/useIntegrations'

export function MarketplaceTab() {
    const integrations = getAllIntegrations()
    const available = integrations.filter(i => i.status === 'available')
    const comingSoon = integrations.filter(i => i.status === 'coming_soon')

    // Check connection status for all available integrations
    const { data: cargomaticStatus } = useIntegrationStatus('cargomatic')

    const connectedSlugs = new Set(
        cargomaticStatus?.status === 'connected' ? ['cargomatic'] : []
    )

    const connected = available.filter(i => connectedSlugs.has(i.slug))
    const notConnected = available.filter(i => !connectedSlugs.has(i.slug))

    return (
        <div className="space-y-8">
            {connected.length > 0 && (
                <section>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Connected
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {connected.map(integration => (
                            <IntegrationCard key={integration.slug} integration={integration} />
                        ))}
                    </div>
                </section>
            )}

            {notConnected.length > 0 && (
                <section>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Available
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {notConnected.map(integration => (
                            <IntegrationCard key={integration.slug} integration={integration} />
                        ))}
                    </div>
                </section>
            )}

            {comingSoon.length > 0 && (
                <section>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Coming Soon
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {comingSoon.map(integration => (
                            <IntegrationCard key={integration.slug} integration={integration} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
