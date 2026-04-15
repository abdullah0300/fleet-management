'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet'
import { TmsIntegration } from '@/lib/integrations/types'
import { useIntegrationStatus, useDisconnectIntegration } from '@/hooks/useIntegrations'
import { CargomaticSetup } from './CargomaticSetup'
import { ActivityLog } from './ActivityLog'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { Loader2, Plug, Unplug, Activity, Copy, Check } from 'lucide-react'

function IntegrationLogo({ integration }: { integration: TmsIntegration }) {
    if (integration.logoUrl) {
        return (
            <div className="h-10 w-10 rounded-lg bg-white border border-border flex items-center justify-center shrink-0 overflow-hidden p-1.5">
                <img
                    src={integration.logoUrl}
                    alt={`${integration.name} logo`}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                            parent.className = 'h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0'
                            parent.innerHTML = integration.logoText
                        }
                    }}
                />
            </div>
        )
    }
    return (
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
            {integration.logoText}
        </div>
    )
}

interface IntegrationCardProps {
    integration: TmsIntegration
}

export function IntegrationCard({ integration }: IntegrationCardProps) {
    const { data: status, isLoading } = useIntegrationStatus(integration.slug)
    const disconnect = useDisconnectIntegration()
    const [setupOpen, setSetupOpen] = useState(false)
    const [copiedWebhook, setCopiedWebhook] = useState(false)

    const isConnected = status?.status === 'connected'
    const isComingSoon = integration.status === 'coming_soon'

    const handleDisconnect = async () => {
        const result = await disconnect.mutateAsync(integration.slug)
        if (result.success) {
            toast.success(`Disconnected from ${integration.name}`)
        }
    }

    const handleCopyWebhook = async () => {
        if (!status?.webhookUrl) return
        await navigator.clipboard.writeText(status.webhookUrl)
        setCopiedWebhook(true)
        setTimeout(() => setCopiedWebhook(false), 2000)
    }

    return (
        <>
            <Card className={isComingSoon ? 'opacity-60' : undefined}>
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <IntegrationLogo integration={integration} />
                            <div>
                                <CardTitle className="text-base">{integration.name}</CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    {integration.category.replace('_', ' ')}
                                </CardDescription>
                            </div>
                        </div>

                        {isComingSoon ? (
                            <Badge variant="secondary" className="text-xs shrink-0">Coming Soon</Badge>
                        ) : isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : isConnected ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs shrink-0">
                                Connected
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-xs shrink-0">Not connected</Badge>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {integration.description}
                    </p>

                    {isConnected && status?.maskedUsername && (
                        <div className="text-xs text-muted-foreground space-y-1">
                            <div>
                                <span className="font-medium">Account: </span>
                                <span className="font-mono">{status.maskedUsername}</span>
                            </div>
                            {status.connectedAt && (
                                <div>
                                    <span className="font-medium">Connected: </span>
                                    {formatDistanceToNow(new Date(status.connectedAt), { addSuffix: true })}
                                </div>
                            )}
                        </div>
                    )}

                    {isConnected && status?.webhookUrl && (
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">Webhook URL</p>
                            <div className="flex items-center gap-1.5">
                                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 overflow-hidden text-ellipsis whitespace-nowrap block">
                                    {status.webhookUrl}
                                </code>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0"
                                    onClick={handleCopyWebhook}
                                >
                                    {copiedWebhook ? (
                                        <Check className="h-3.5 w-3.5 text-green-600" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {!isComingSoon && (
                        <div className="flex gap-2 pt-1">
                            {isConnected ? (
                                <>
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant="outline" size="sm" className="gap-1.5">
                                                <Activity className="h-3.5 w-3.5" />
                                                Activity
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
                                            <SheetHeader>
                                                <SheetTitle>{integration.name} Activity Log</SheetTitle>
                                            </SheetHeader>
                                            <div className="mt-4">
                                                <ActivityLog slug={integration.slug} />
                                            </div>
                                        </SheetContent>
                                    </Sheet>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5 text-destructive hover:text-destructive"
                                        onClick={handleDisconnect}
                                        disabled={disconnect.isPending}
                                    >
                                        {disconnect.isPending ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Unplug className="h-3.5 w-3.5" />
                                        )}
                                        Disconnect
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    size="sm"
                                    className="gap-1.5"
                                    onClick={() => setSetupOpen(true)}
                                    disabled={isLoading}
                                >
                                    <Plug className="h-3.5 w-3.5" />
                                    Connect
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {integration.slug === 'cargomatic' && (
                <CargomaticSetup open={setupOpen} onOpenChange={setSetupOpen} />
            )}
        </>
    )
}
