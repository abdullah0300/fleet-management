import { getVehicles } from '@/lib/data'
import { VehiclesList } from '@/components/vehicles/VehiclesList'

// This is a Server Component (no 'use client')
// Data is fetched on the server before the page renders

export default async function VehiclesPage() {
    // Server-side fetch - runs before page loads
    const vehicles = await getVehicles()

    // Pass data to client component for interactivity
    return <VehiclesList initialData={vehicles} />
}
