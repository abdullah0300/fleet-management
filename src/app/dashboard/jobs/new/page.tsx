'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JobForm } from '@/components/jobs/JobForm'
import { useCreateJob, useAssignJob } from '@/hooks/useJobs'
import { JobInsert } from '@/types/database'

export default function NewJobPage() {
    const router = useRouter()
    const createMutation = useCreateJob()
    const assignMutation = useAssignJob()

    const handleSubmit = async (data: JobInsert) => {
        const result = await createMutation.mutateAsync(data)

        // If both vehicle and driver are assigned, trigger the assign workflow
        if (data.vehicle_id && data.driver_id && result.id) {
            await assignMutation.mutateAsync({
                jobId: result.id,
                vehicleId: data.vehicle_id,
                driverId: data.driver_id,
            })
        }

        router.push('/dashboard/jobs')
    }

    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Create New Job</h1>
                    <p className="text-muted-foreground text-sm">
                        Fill in the details to create a new pickup & delivery job
                    </p>
                </div>
            </div>

            {/* Form */}
            <JobForm
                onSubmit={handleSubmit}
                isSubmitting={createMutation.isPending || assignMutation.isPending}
            />
        </div>
    )
}
