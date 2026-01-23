import { getDrivers } from '@/lib/data'
import { DriversList } from '@/components/drivers/DriversList'

// Server Component - fetches data on server
export default async function DriversPage() {
    const drivers = await getDrivers()
    return <DriversList initialData={drivers} />
}
