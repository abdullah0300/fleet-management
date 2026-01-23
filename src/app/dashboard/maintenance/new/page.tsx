'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ServiceForm } from '@/components/maintenance/ServiceForm'
import { useCreateMaintenance } from '@/hooks/useMaintenance'
import { MaintenanceRecordInsert } from '@/types/database'

export default function NewMaintenancePage() {
    const router = useRouter()
    const createMutation = useCreateMaintenance()

    const handleSubmit = async (data: MaintenanceRecordInsert) => {
        await createMutation.mutateAsync(data)
        router.push('/dashboard/maintenance')
    }

    return (
        <div className="flex flex-col gap-4 sm:gap-6 max-w-3xl mx-auto pb-8">
            {/* Header */}
            <div className="flex items-center gap-3 sm:gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Schedule Maintenance</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm">
                        Create a new maintenance record for a vehicle
                    </p>
                </div>
            </div>

            {/* Form */}
            <ServiceForm
                onSubmit={handleSubmit}
                isSubmitting={createMutation.isPending}
            />
        </div>
    )
}
