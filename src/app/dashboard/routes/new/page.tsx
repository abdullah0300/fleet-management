'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RouteForm } from '@/components/routes/RouteForm'
import { useCreateRoute } from '@/hooks/useRoutes'
import { RouteInsert } from '@/types/database'

export default function NewRoutePage() {
    const router = useRouter()
    const createMutation = useCreateRoute()

    const handleSubmit = async (data: RouteInsert) => {
        await createMutation.mutateAsync(data)
        router.push('/dashboard/routes')
    }

    return (
        <div className="flex flex-col gap-4 sm:gap-6 max-w-3xl mx-auto pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 sm:gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Create Route</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                        Plan a new route with cost estimates
                    </p>
                </div>
            </div>

            {/* Form */}
            <RouteForm
                onSubmit={handleSubmit}
                isSubmitting={createMutation.isPending}
            />
        </div>
    )
}
