import { getRoutes } from '@/lib/data'
import { RoutesList } from '@/components/routes/RoutesList'

// Server Component - fetches data on server
export default async function RoutesPage() {
    const routes = await getRoutes()
    return <RoutesList initialData={routes} />
}
