import { getMaintenanceRecords } from '@/lib/data'
import { MaintenanceList } from '@/components/maintenance/MaintenanceList'

// Server Component - fetches data on server
export default async function MaintenancePage() {
    const records = await getMaintenanceRecords()
    return <MaintenanceList initialData={records} />
}
