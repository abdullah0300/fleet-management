'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VehicleForm } from '@/components/vehicles/VehicleForm'
import { useCreateVehicle } from '@/hooks/useVehicles'
import { VehicleInsert } from '@/types/database'

export default function NewVehiclePage() {
    const router = useRouter()
    const createMutation = useCreateVehicle()

    const handleSubmit = async (data: VehicleInsert) => {
        await createMutation.mutateAsync(data)
        router.push('/dashboard/vehicles')
    }

    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Add New Vehicle</h1>
                    <p className="text-muted-foreground text-sm">
                        Enter the vehicle details below
                    </p>
                </div>
            </div>

            {/* Form Card */}
            <div className="bg-card border rounded-xl p-6">
                <VehicleForm
                    onSubmit={handleSubmit}
                    isSubmitting={createMutation.isPending}
                />
            </div>
        </div>
    )
}
