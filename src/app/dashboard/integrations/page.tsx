import { createClient } from '@/lib/supabase/server'
import { hasPermission } from '@/lib/rbac'
import { AccessDenied } from '@/components/auth/PermissionGate'
import { MarketplaceTab } from '@/components/integrations/MarketplaceTab'

export const dynamic = 'force-dynamic'

export default async function IntegrationsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let role: string | null = null
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        role = profile?.role ?? null
    }

    if (!hasPermission(role as any, 'manage:integrations')) {
        return <AccessDenied />
    }

    return (
        <div className="flex flex-col h-full overflow-auto">
            <div className="flex-none px-6 py-5 border-b bg-background">
                <h1 className="text-lg font-bold tracking-tight">Integrations</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Connect your TMS to freight brokers and load boards to receive tenders automatically.
                </p>
            </div>

            <div className="flex-1 overflow-auto p-6">
                <MarketplaceTab />
            </div>
        </div>
    )
}
