'use client'

import { MaintenanceSetup } from '@/components/maintenance/MaintenanceSetup'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function MaintenanceSetupPage() {
    const router = useRouter()

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Maintenance Configuration</h1>
                    <p className="text-muted-foreground">Define service programs and assign them to your fleet.</p>
                </div>
            </div>

            <MaintenanceSetup />
        </div>
    )
}
