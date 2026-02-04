'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Plus, User, Truck, Loader2, Info, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DriverForm } from '@/components/drivers/DriverForm'
import { VehicleForm } from '@/components/vehicles/VehicleForm'
import { DriverDetailPopup } from './DriverDetailPopup'
import { VehicleDetailPopup } from './VehicleDetailPopup'
import { useState, useMemo } from 'react'
import { useCreateDriver } from '@/hooks/useDrivers'
import { useCreateVehicle } from '@/hooks/useVehicles'
import { toast } from 'sonner'

interface ResourcePanelProps {
    drivers: any[]
    vehicles: any[]
    selectedDriverId?: string | null
    selectedVehicleId?: string | null
    onSelectDriver: (id: string) => void
    onSelectVehicle: (id: string) => void
    onDriverCreated?: (driver: any) => void
    onVehicleCreated?: (vehicle: any) => void
}

export function ResourcePanel({
    drivers,
    vehicles,
    selectedDriverId,
    selectedVehicleId,
    onSelectDriver,
    onSelectVehicle,
    onDriverCreated,
    onVehicleCreated
}: ResourcePanelProps) {
    const [driverFormOpen, setDriverFormOpen] = useState(false)
    const [vehicleFormOpen, setVehicleFormOpen] = useState(false)

    // Search states
    const [driverSearch, setDriverSearch] = useState('')
    const [vehicleSearch, setVehicleSearch] = useState('')

    // Detail popup states
    const [viewingDriver, setViewingDriver] = useState<any>(null)
    const [viewingVehicle, setViewingVehicle] = useState<any>(null)

    // Real Supabase mutations
    const createDriver = useCreateDriver()
    const createVehicle = useCreateVehicle()

    // Filtered drivers based on search
    const filteredDrivers = useMemo(() => {
        if (!driverSearch.trim()) return drivers
        const search = driverSearch.toLowerCase()
        return drivers.filter(driver =>
            driver.profiles?.full_name?.toLowerCase().includes(search) ||
            driver.license_number?.toLowerCase().includes(search) ||
            driver.status?.toLowerCase().includes(search)
        )
    }, [drivers, driverSearch])

    // Filtered vehicles based on search
    const filteredVehicles = useMemo(() => {
        if (!vehicleSearch.trim()) return vehicles
        const search = vehicleSearch.toLowerCase()
        return vehicles.filter(vehicle =>
            vehicle.registration_number?.toLowerCase().includes(search) ||
            vehicle.make?.toLowerCase().includes(search) ||
            vehicle.model?.toLowerCase().includes(search)
        )
    }, [vehicles, vehicleSearch])

    const handleCreateDriver = async (data: any) => {
        try {
            const newDriver = await createDriver.mutateAsync(data)
            toast.success('Driver created successfully!')
            if (onDriverCreated) onDriverCreated(newDriver)
            setDriverFormOpen(false)
        } catch (error: any) {
            toast.error(error.message || 'Failed to create driver')
        }
    }

    const handleCreateVehicle = async (data: any) => {
        try {
            const newVehicle = await createVehicle.mutateAsync(data)
            toast.success('Vehicle created successfully!')
            if (onVehicleCreated) onVehicleCreated(newVehicle)
            setVehicleFormOpen(false)
        } catch (error: any) {
            toast.error(error.message || 'Failed to create vehicle')
        }
    }

    return (
        <>
            <Card className="flex flex-col h-full bg-slate-50/50">
                <CardHeader className="pb-3 border-b bg-background">
                    <CardTitle className="text-sm font-medium">Resources</CardTitle>
                    <CardDescription className="text-xs">Click to view details</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                    <Tabs defaultValue="drivers" className="flex-1 flex flex-col h-full">

                        <div className="px-3 pt-3">
                            <TabsList className="w-full grid grid-cols-2">
                                <TabsTrigger value="drivers">Drivers</TabsTrigger>
                                <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="drivers" className="flex-1 overflow-hidden flex flex-col p-3 space-y-2 min-h-0">
                            {/* Search Input */}
                            <div className="relative flex-none">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search drivers..."
                                    value={driverSearch}
                                    onChange={(e) => setDriverSearch(e.target.value)}
                                    className="h-8 pl-8 pr-8 text-xs"
                                />
                                {driverSearch && (
                                    <button
                                        onClick={() => setDriverSearch('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            <Dialog open={driverFormOpen} onOpenChange={setDriverFormOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full text-xs border-dashed flex-none">
                                        <Plus className="h-3 w-3 mr-1" /> New Driver
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Add New Driver</DialogTitle>
                                    </DialogHeader>
                                    <DriverForm
                                        onSubmit={handleCreateDriver}
                                        isSubmitting={createDriver.isPending}
                                    />
                                </DialogContent>
                            </Dialog>

                            <div className="flex-1 overflow-auto space-y-2 min-h-0">
                                {filteredDrivers.length === 0 ? (
                                    <div className="text-center py-4 text-xs text-muted-foreground">
                                        {driverSearch ? 'No drivers match your search' : 'No drivers available'}
                                    </div>
                                ) : (
                                    filteredDrivers.map(driver => (
                                        <div
                                            key={driver.id}
                                            className={`flex items-center gap-3 p-2 bg-white border rounded-md hover:bg-accent cursor-pointer text-left transition-all ${selectedDriverId === driver.id ? 'ring-2 ring-primary border-primary' : ''
                                                }`}
                                            onClick={() => setViewingDriver(driver)}
                                        >
                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center relative flex-none">
                                                <User className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div className="overflow-hidden flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{driver.profiles?.full_name || 'Unknown'}</div>
                                                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${driver.status === 'available' ? 'bg-green-500' : 'bg-amber-500'}`} />
                                                    {driver.status || 'unknown'}
                                                </div>
                                            </div>
                                            <Info className="h-4 w-4 text-muted-foreground flex-none" />
                                        </div>
                                    ))
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="vehicles" className="flex-1 overflow-hidden flex flex-col p-3 space-y-2 min-h-0">
                            {/* Search Input */}
                            <div className="relative flex-none">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search vehicles..."
                                    value={vehicleSearch}
                                    onChange={(e) => setVehicleSearch(e.target.value)}
                                    className="h-8 pl-8 pr-8 text-xs"
                                />
                                {vehicleSearch && (
                                    <button
                                        onClick={() => setVehicleSearch('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            <Dialog open={vehicleFormOpen} onOpenChange={setVehicleFormOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-full text-xs border-dashed flex-none">
                                        <Plus className="h-3 w-3 mr-1" /> New Vehicle
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Add New Vehicle</DialogTitle>
                                    </DialogHeader>
                                    <VehicleForm
                                        onSubmit={handleCreateVehicle}
                                        isSubmitting={createVehicle.isPending}
                                    />
                                </DialogContent>
                            </Dialog>

                            <div className="flex-1 overflow-auto space-y-2 min-h-0">
                                {filteredVehicles.length === 0 ? (
                                    <div className="text-center py-4 text-xs text-muted-foreground">
                                        {vehicleSearch ? 'No vehicles match your search' : 'No vehicles available'}
                                    </div>
                                ) : (
                                    filteredVehicles.map(vehicle => (
                                        <div
                                            key={vehicle.id}
                                            className={`flex items-center gap-3 p-2 bg-white border rounded-md hover:bg-accent cursor-pointer text-left transition-all ${selectedVehicleId === vehicle.id ? 'ring-2 ring-primary border-primary' : ''
                                                }`}
                                            onClick={() => setViewingVehicle(vehicle)}
                                        >
                                            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center relative flex-none">
                                                <Truck className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">{vehicle.registration_number}</div>
                                                <div className="text-[10px] text-muted-foreground truncate">{vehicle.make} {vehicle.model}</div>
                                            </div>
                                            <Info className="h-4 w-4 text-muted-foreground flex-none" />
                                        </div>
                                    ))
                                )}
                            </div>
                        </TabsContent>

                    </Tabs>
                </CardContent>
            </Card>

            {/* Driver Detail Popup */}
            <DriverDetailPopup
                driver={viewingDriver}
                open={!!viewingDriver}
                onOpenChange={(open) => !open && setViewingDriver(null)}
                onSelectForManifest={() => {
                    if (viewingDriver) {
                        onSelectDriver(viewingDriver.id)
                        toast.success(`Driver "${viewingDriver.profiles?.full_name}" selected for manifest`)
                    }
                }}
            />

            {/* Vehicle Detail Popup */}
            <VehicleDetailPopup
                vehicle={viewingVehicle}
                open={!!viewingVehicle}
                onOpenChange={(open) => !open && setViewingVehicle(null)}
                onSelectForManifest={() => {
                    if (viewingVehicle) {
                        onSelectVehicle(viewingVehicle.id)
                        toast.success(`Vehicle "${viewingVehicle.registration_number}" selected for manifest`)
                    }
                }}
            />
        </>
    )
}
