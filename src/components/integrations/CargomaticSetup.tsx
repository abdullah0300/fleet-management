'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { useConnectIntegration } from '@/hooks/useIntegrations'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { toast } from 'sonner'
import { Copy, Check, Loader2 } from 'lucide-react'

const schema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

interface CargomaticSetupProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function CargomaticSetup({ open, onOpenChange }: CargomaticSetupProps) {
    const [webhookUrl, setWebhookUrl] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const connect = useConnectIntegration()
    const { data: user } = useCurrentUser()
    const isAdmin = user?.is_platform_admin || user?.role === 'admin'

    const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
    })

    const onSubmit = async (data: FormData) => {
        const result = await connect.mutateAsync({
            slug: 'cargomatic',
            credentials: data,
        })

        if (result.success) {
            if (isAdmin) {
                setWebhookUrl(result.webhookUrl)
            } else {
                toast.success('Connected to Cargomatic')
                handleClose()
                return
            }
            toast.success('Connected to Cargomatic')
        } else {
            toast.error(result.error ?? 'Connection failed')
        }
    }

    const handleCopy = async () => {
        if (!webhookUrl) return
        await navigator.clipboard.writeText(webhookUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleClose = () => {
        setWebhookUrl(null)
        setCopied(false)
        reset()
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Connect Cargomatic</DialogTitle>
                </DialogHeader>

                {!webhookUrl ? (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Enter your Cargomatic credentials to connect your account.
                            {isAdmin && " We'll generate a webhook URL for you to share with Cargomatic."}
                        </p>

                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                placeholder="your@email.com"
                                autoComplete="username"
                                {...register('username')}
                            />
                            {errors.username && (
                                <p className="text-xs text-destructive">{errors.username.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                {...register('password')}
                            />
                            {errors.password && (
                                <p className="text-xs text-destructive">{errors.password.message}</p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={connect.isPending}>
                                {connect.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Connect
                            </Button>
                        </DialogFooter>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Cargomatic is connected. Share this webhook URL with Cargomatic so they
                            can push load tenders to your TMS.
                        </p>

                        <div className="space-y-2">
                            <Label>Your Webhook URL</Label>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value={webhookUrl}
                                    className="font-mono text-xs"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={handleCopy}
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Keep this URL private — it includes a secret token that authenticates
                                incoming webhooks from Cargomatic.
                            </p>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleClose}>Done</Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
