'use client'

import { useHasPermission } from '@/hooks/useCurrentUser'
import { AccessDenied } from '@/components/auth/PermissionGate'
import { MaintenanceList } from '@/components/maintenance/MaintenanceList'
import { useMaintenance } from '@/hooks/useMaintenance'

export default function MaintenancePage() {
    const canViewMaintenance = useHasPermission('view:maintenance')
    const { data: result, isLoading } = useMaintenance()

    if (!canViewMaintenance) {
        return <AccessDenied message="You don't have permission to view maintenance records." />
    }

    if (isLoading) return null

    return <MaintenanceList initialData={result?.data ?? []} />
}
