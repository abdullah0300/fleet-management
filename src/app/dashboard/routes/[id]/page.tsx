'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, Trash2, MapPin, Clock, Navigation, DollarSign, Fuel, CircleDollarSign } from 'lucide-react'
import { useRoute, useDeleteRoute } from '@/hooks/useRoutes'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function RouteDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const { data: route, isLoading, error } = useRoute(id)
    const deleteMutation = useDeleteRoute()

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this route?')) return
        await deleteMutation.mutateAsync(id)
        router.push('/dashboard/routes')
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-[250px]" />
                        <Skeleton className="h-4 w-[150px]" />
                    </div>
                </div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    <Skeleton className="h-[200px] rounded-xl" />
                    <Skeleton className="h-[200px] rounded-xl" />
                </div>
            </div>
        )
    }

    if (error || !route) {
        return <div className="p-8 text-center">Route not found</div>
    }

    const origin = route.origin as { address?: string } | null
    const destination = route.destination as { address?: string } | null

    return (
        <div className="flex flex-col gap-4 sm:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3 sm:gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                            {route.name || 'Unnamed Route'}
                        </h1>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                            {route.distance_km} km • {route.estimated_duration} min
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-12 sm:ml-0">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/dashboard/routes/${id}/edit`)}
                        className="gap-2"
                    >
                        <Edit className="h-4 w-4" />
                        Edit
                    </Button>
                    <Button
                        variant="destructive"
                        size="icon"
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Route Map Placeholder */}
            <Card className="overflow-hidden">
                <div className="h-[200px] sm:h-[300px] bg-gradient-to-br from-status-info-muted to-accent-purple-muted flex items-center justify-center">
                    <div className="text-center">
                        <Navigation className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">Map Integration</p>
                        <p className="text-xs text-muted-foreground/60">Google Maps or Mapbox required</p>
                    </div>
                </div>
            </Card>

            {/* Details Grid */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                {/* Locations */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Locations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-status-success-muted flex items-center justify-center shrink-0">
                                <MapPin className="h-4 w-4 text-status-success" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Origin</p>
                                <p className="font-medium text-sm">{origin?.address || 'Not set'}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-status-error-muted flex items-center justify-center shrink-0">
                                <MapPin className="h-4 w-4 text-status-error" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Destination</p>
                                <p className="font-medium text-sm">{destination?.address || 'Not set'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Distance & Duration */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Distance & Time
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-accent-purple-muted/30 rounded-lg text-center">
                                <p className="text-2xl sm:text-3xl font-bold text-accent-purple">
                                    {route.distance_km || 0}
                                </p>
                                <p className="text-xs text-muted-foreground">Kilometers</p>
                            </div>
                            <div className="p-4 bg-status-info-muted/30 rounded-lg text-center">
                                <p className="text-2xl sm:text-3xl font-bold text-status-info">
                                    {route.estimated_duration || 0}
                                </p>
                                <p className="text-xs text-muted-foreground">Minutes</p>
                            </div>
                        </div>
                        {route.distance_km && route.estimated_duration && (
                            <p className="text-xs text-muted-foreground text-center mt-3">
                                Average speed: {((route.distance_km / route.estimated_duration) * 60).toFixed(1)} km/h
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Cost Estimates */}
                <Card className="md:col-span-2">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Cost Estimates
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Fuel className="h-4 w-4 text-status-warning" />
                                    <span className="text-sm">Fuel Cost</span>
                                </div>
                                <p className="text-xl font-bold">
                                    ${(route.estimated_fuel_cost || 0).toFixed(2)}
                                </p>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <CircleDollarSign className="h-4 w-4 text-status-info" />
                                    <span className="text-sm">Toll Cost</span>
                                </div>
                                <p className="text-xl font-bold">
                                    ${(route.estimated_toll_cost || 0).toFixed(2)}
                                </p>
                            </div>
                            <div className="p-4 bg-status-success-muted/30 rounded-lg col-span-2 sm:col-span-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="h-4 w-4 text-status-success" />
                                    <span className="text-sm">Total Est.</span>
                                </div>
                                <p className="text-xl font-bold text-status-success">
                                    ${((route.estimated_fuel_cost || 0) + (route.estimated_toll_cost || 0)).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Use Route Button */}
            <div className="flex gap-3 justify-end">
                <Button
                    onClick={() => router.push(`/dashboard/jobs/new?route_id=${id}`)}
                    className="gap-2"
                >
                    <Navigation className="h-4 w-4" />
                    Create Job with this Route
                </Button>
            </div>
        </div>
    )
}
