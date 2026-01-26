'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Truck, Settings, Users, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { VehicleCard } from '@/components/vehicles/VehicleCard'

interface VehiclesListProps {
    initialData: any[]
}

export function VehiclesList({ initialData }: VehiclesListProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    // Use initialData directly (from server)
    const vehicles = initialData

    // Stats from initial data
    const stats = {
        total: vehicles.length,
        available: vehicles.filter((v) => v.status === 'available').length,
        inUse: vehicles.filter((v) => v.status === 'in_use').length,
        maintenance: vehicles.filter((v) => v.status === 'maintenance').length,
    }

    // Filter vehicles
    const filteredVehicles = vehicles.filter((vehicle) => {
        const matchesSearch =
            vehicle.registration_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.make?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.model?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter
        return matchesSearch && matchesStatus
    })

    return (
        <div className="flex flex-col gap-4 sm:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Vehicles</h1>
                    <p className="text-muted-foreground text-sm">Manage your fleet vehicles</p>
                </div>
                <Button
                    onClick={() => router.push('/dashboard/vehicles/new')}
                    className="gap-2 w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4" />
                    Add Vehicle
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'all' ? 'bg-accent-purple-muted border-accent-purple/40' : 'hover:bg-accent-purple-muted/50'}`}
                    onClick={() => setStatusFilter('all')}
                >
                    <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-accent-purple" />
                        <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'available' ? 'bg-status-success-muted border-status-success/40' : 'hover:bg-status-success-muted/50'}`}
                    onClick={() => setStatusFilter('available')}
                >
                    <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-status-success" />
                        <span className="text-xs text-muted-foreground">Available</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.available}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'in_use' ? 'bg-status-info-muted border-status-info/40' : 'hover:bg-status-info-muted/50'}`}
                    onClick={() => setStatusFilter('in_use')}
                >
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-status-info" />
                        <span className="text-xs text-muted-foreground">In Use</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.inUse}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'maintenance' ? 'bg-status-warning-muted border-status-warning/40' : 'hover:bg-status-warning-muted/50'}`}
                    onClick={() => setStatusFilter('maintenance')}
                >
                    <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-status-warning" />
                        <span className="text-xs text-muted-foreground">Maintenance</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.maintenance}</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search vehicles..."
                    className="pl-9 bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Vehicle Grid */}
            {filteredVehicles.length === 0 ? (
                <div className="text-center py-12">
                    <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold">No vehicles found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery ? 'Try a different search term' : 'Add your first vehicle to get started'}
                    </p>
                    {!searchQuery && (
                        <Button
                            className="mt-4 gap-2"
                            onClick={() => router.push('/dashboard/vehicles/new')}
                        >
                            <Plus className="h-4 w-4" />
                            Add Vehicle
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredVehicles.map((vehicle: any) => (
                        <VehicleCard
                            key={vehicle.id}
                            vehicle={vehicle}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
