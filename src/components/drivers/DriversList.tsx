'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Users, Truck, Clock, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DriverCard } from '@/components/drivers/DriverCard'
import { Driver } from '@/types/database'

interface DriversListProps {
    initialData: Driver[]
}

export function DriversList({ initialData }: DriversListProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    // Use initialData from server
    const drivers = initialData

    // Stats from initial data
    const stats = {
        total: drivers.length,
        available: drivers.filter((d) => d.status === 'available').length,
        onTrip: drivers.filter((d) => d.status === 'on_trip').length,
        offDuty: drivers.filter((d) => d.status === 'off_duty').length,
    }

    // Filter drivers
    const filteredDrivers = drivers.filter((driver: any) => {
        const matchesSearch =
            driver.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            driver.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            driver.license_number?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === 'all' || driver.status === statusFilter
        return matchesSearch && matchesStatus
    })

    return (
        <div className="flex flex-col gap-4 sm:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Drivers</h1>
                    <p className="text-muted-foreground text-sm">Manage your fleet drivers</p>
                </div>
                <Button
                    onClick={() => router.push('/dashboard/drivers/new')}
                    className="gap-2 w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4" />
                    Add Driver
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'all' ? 'bg-accent-purple-muted border-accent-purple/40' : 'hover:bg-accent-purple-muted/50'}`}
                    onClick={() => setStatusFilter('all')}
                >
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-accent-purple" />
                        <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'available' ? 'bg-status-success-muted border-status-success/40' : 'hover:bg-status-success-muted/50'}`}
                    onClick={() => setStatusFilter('available')}
                >
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-status-success" />
                        <span className="text-xs text-muted-foreground">Available</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.available}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'on_trip' ? 'bg-status-info-muted border-status-info/40' : 'hover:bg-status-info-muted/50'}`}
                    onClick={() => setStatusFilter('on_trip')}
                >
                    <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-status-info" />
                        <span className="text-xs text-muted-foreground">On Trip</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.onTrip}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'off_duty' ? 'bg-status-warning-muted border-status-warning/40' : 'hover:bg-status-warning-muted/50'}`}
                    onClick={() => setStatusFilter('off_duty')}
                >
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-status-warning" />
                        <span className="text-xs text-muted-foreground">Off Duty</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.offDuty}</p>
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search drivers..."
                    className="pl-9 bg-background"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Driver Grid */}
            {filteredDrivers.length === 0 ? (
                <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold">No drivers found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery ? 'Try a different search term' : 'Add your first driver to get started'}
                    </p>
                    {!searchQuery && (
                        <Button
                            className="mt-4 gap-2"
                            onClick={() => router.push('/dashboard/drivers/new')}
                        >
                            <Plus className="h-4 w-4" />
                            Add Driver
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {filteredDrivers.map((driver: any) => (
                        <DriverCard
                            key={driver.id}
                            driver={driver}
                            onViewDetails={() => router.push(`/dashboard/drivers/${driver.id}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
