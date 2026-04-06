'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RouteForm } from '@/components/routes/RouteForm'
import { useRoute, useUpdateRoute } from '@/hooks/useRoutes'
import { RouteInsert } from '@/types/database'

export default function EditRoutePage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string

    const { data: route, isLoading } = useRoute(id)
    const updateMutation = useUpdateRoute()

    const handleSubmit = async (data: RouteInsert) => {
        await updateMutation.mutateAsync({ id, updates: data })
        router.push(`/dashboard/routes/${id}`)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground text-sm">Loading route...</div>
            </div>
        )
    }

    if (!route) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground text-sm">Route not found.</div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4 sm:gap-6 max-w-3xl mx-auto pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 sm:gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Edit Route</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                        Update route details and cost estimates
                    </p>
                </div>
            </div>

            {/* Form */}
            <RouteForm
                initialData={{
                    id: route.id,
                    name: route.name ?? undefined,
                    distance_km: route.distance_km ?? 0,
                    estimated_duration: route.estimated_duration ?? 0,
                    estimated_toll_cost: route.estimated_toll_cost ?? 0,
                    estimated_fuel_cost: route.estimated_fuel_cost ?? 0,
                    origin: route.origin as { address?: string; lat?: number; lng?: number } | undefined,
                    destination: route.destination as { address?: string; lat?: number; lng?: number } | undefined,
                    waypoints: route.waypoints as { address?: string; lat?: number; lng?: number }[] | undefined,
                }}
                onSubmit={handleSubmit}
                isSubmitting={updateMutation.isPending}
            />
        </div>
    )
}
