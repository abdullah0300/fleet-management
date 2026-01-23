'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Navigation, MapPin, Clock, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Route } from '@/types/database'

interface RoutesListProps {
    initialData: Route[]
}

export function RoutesList({ initialData }: RoutesListProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')

    // Use initialData from server
    const routes = initialData

    // Stats
    const stats = {
        total: routes.length,
        totalDistance: routes.reduce((sum, r) => sum + (r.distance_km || 0), 0),
        avgDuration: routes.length > 0
            ? Math.round(routes.reduce((sum, r) => sum + (r.estimated_duration || 0), 0) / routes.length)
            : 0,
    }

    // Filter routes
    const filteredRoutes = routes.filter((route) => {
        const origin = route.origin as { address?: string } | null
        const destination = route.destination as { address?: string } | null
        return (
            route.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            origin?.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            destination?.address?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })

    return (
        <div className="flex flex-col gap-4 sm:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Routes</h1>
                    <p className="text-muted-foreground text-sm">Manage delivery routes</p>
                </div>
                <Button
                    onClick={() => router.push('/dashboard/routes/new')}
                    className="gap-2 w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4" />
                    Create Route
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div className="p-3 rounded-xl border bg-accent-purple-muted/30">
                    <div className="flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-accent-purple" />
                        <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <div className="p-3 rounded-xl border bg-status-info-muted/30">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-status-info" />
                        <span className="text-xs text-muted-foreground">Total KM</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.totalDistance.toFixed(0)}</p>
                </div>
                <div className="p-3 rounded-xl border bg-status-success-muted/30">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-status-success" />
                        <span className="text-xs text-muted-foreground">Avg Min</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.avgDuration}</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search routes..."
                    className="pl-9 bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Route List */}
            {filteredRoutes.length === 0 ? (
                <div className="text-center py-12">
                    <Navigation className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold">No routes found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery ? 'Try a different search term' : 'Create your first route'}
                    </p>
                    {!searchQuery && (
                        <Button
                            className="mt-4 gap-2"
                            onClick={() => router.push('/dashboard/routes/new')}
                        >
                            <Plus className="h-4 w-4" />
                            Create Route
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredRoutes.map((route) => {
                        const origin = route.origin as { address?: string } | null
                        const destination = route.destination as { address?: string } | null

                        return (
                            <Card
                                key={route.id}
                                className="hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => router.push(`/dashboard/routes/${route.id}`)}
                            >
                                <CardContent className="p-3 sm:p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Navigation className="h-4 w-4 text-accent-purple shrink-0" />
                                                <h3 className="font-semibold truncate">{route.name || 'Unnamed Route'}</h3>
                                            </div>
                                            <div className="mt-2 space-y-1 text-xs sm:text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-status-success shrink-0" />
                                                    <span className="truncate">{origin?.address || 'Origin'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="w-2 h-2 rounded-full bg-status-error shrink-0" />
                                                    <span className="truncate">{destination?.address || 'Destination'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 shrink-0">
                                            <Badge variant="outline" className="text-xs">
                                                {route.distance_km || 0} km
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {route.estimated_duration || 0} min
                                            </span>
                                            {(route.estimated_fuel_cost || route.estimated_toll_cost) && (
                                                <span className="text-xs text-status-success flex items-center gap-1">
                                                    <DollarSign className="h-3 w-3" />
                                                    {((route.estimated_fuel_cost || 0) + (route.estimated_toll_cost || 0)).toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
