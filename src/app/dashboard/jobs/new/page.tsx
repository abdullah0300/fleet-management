'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JobCreationContent } from '@/components/jobs/JobCreationContent'

export default function NewJobPage() {
    const router = useRouter()

    const handleSave = () => {
        // Navigate back to jobs list after successful save
        router.push('/dashboard/jobs')
    }

    const handleCancel = () => {
        router.back()
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

            {/* Form - Same as dispatch modal */}
            <JobCreationContent
                onSave={handleSave}
                onCancel={handleCancel}
                variant="page"
            />
        </div>
    )
}
