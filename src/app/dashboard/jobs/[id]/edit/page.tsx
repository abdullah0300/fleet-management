'use client'

import { useParams, useRouter } from 'next/navigation'
import { JobCreationContent } from '@/components/jobs/JobCreationContent'
import { useJob } from '@/hooks/useJobs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'

export default function EditJobPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    const { data: job, isLoading, error } = useJob(id)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (error || !job) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 mb-4">Error loading job details</p>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto py-6 max-w-5xl">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Edit Job {job.job_number}</h1>
                    <p className="text-muted-foreground">Update job details, schedule, and stops</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Job Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <JobCreationContent
                        initialData={job}
                        isEditing={true}
                        onCancel={() => router.back()}
                        onSave={() => router.push(`/dashboard/jobs/${id}`)}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
