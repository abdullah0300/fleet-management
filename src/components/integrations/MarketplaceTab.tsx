'use client'

import { getAllIntegrations } from '@/lib/integrations/registry'
import { IntegrationCard } from './IntegrationCard'
import { useIntegrationStatus } from '@/hooks/useIntegrations'

function ConnectedSection() {
    // Check if Cargomatic (the only available integration) is connected
    const { data: cargomaticStatus } = useIntegrationStatus('cargomatic')
    const hasConnected = cargomaticStatus?.status === 'connected'

    if (!hasConnected) return null

    const available = getAllIntegrations().filter(i => i.status === 'available')

    return (
        <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Connected
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {available.map(integration => (
                    <IntegrationCard key={integration.slug} integration={integration} />
                ))}
            </div>
        </section>
    )
}

export function MarketplaceTab() {
    const integrations = getAllIntegrations()
    const available = integrations.filter(i => i.status === 'available')
    const comingSoon = integrations.filter(i => i.status === 'coming_soon')

    return (
        <div className="space-y-8">
            <ConnectedSection />

            <section>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Available
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {available.map(integration => (
                        <IntegrationCard key={integration.slug} integration={integration} />
                    ))}
                </div>
            </section>

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
