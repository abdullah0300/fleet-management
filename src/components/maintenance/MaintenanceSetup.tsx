'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useServicePrograms, useAssignServiceProgram } from '@/hooks/useSmartMaintenance'
import { useVehicles } from '@/hooks/useVehicles'
import { Plus, Check, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

export function MaintenanceSetup() {
    const { data: programs, isLoading: programsLoading } = useServicePrograms()
    const { data: vehiclesData } = useVehicles()
    const vehicles = vehiclesData?.data || []

    const assignMutation = useAssignServiceProgram()

    const [selectedVehicle, setSelectedVehicle] = useState<string>('')
    const [selectedProgram, setSelectedProgram] = useState<string>('')

    // Quick Add Program State
    const [isCreating, setIsCreating] = useState(false)
    const [newProgramName, setNewProgramName] = useState('')
    const [newProgramMiles, setNewProgramMiles] = useState('5000')

    const queryClient = useQueryClient()
    const supabase = createClient()

    const handleQuickCreate = async () => {
        if (!newProgramName) return

        const { error } = await supabase.from('service_programs').insert({
            name: newProgramName,
            interval_miles: parseInt(newProgramMiles),
            interval_months: 6 // Default
        })

        if (error) {
            toast.error('Failed to create program')
            return
        }

        toast.success('Service Program Created')
        queryClient.invalidateQueries({ queryKey: ['smart-maintenance', 'programs'] })
        setIsCreating(false)
        setNewProgramName('')
    }

    const handleAssign = async () => {
        if (!selectedVehicle || !selectedProgram) return

        const vehicle = vehicles.find(v => v.id === selectedVehicle)
        if (!vehicle) return

        try {
            await assignMutation.mutateAsync({
                vehicleId: selectedVehicle,
                programId: selectedProgram,
                currentOdometer: vehicle.odometer_reading || 0
            })
            toast.success('Program Assigned Successfully')
            setSelectedVehicle('') // Reset
        } catch (error) {
            toast.error('Failed to assign program (maybe already assigned?)')
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* 1. Create Programs */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Service Programs
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Available Templates</Label>
                        <div className="flex flex-col gap-2 p-2 bg-muted/50 rounded-md max-h-[200px] overflow-y-auto">
                            {programs?.map(p => (
                                <div key={p.id} className="text-sm flex justify-between p-2 bg-background border rounded shadow-sm">
                                    <span>{p.name}</span>
                                    <span className="text-muted-foreground">{p.interval_miles?.toLocaleString()} mi</span>
                                </div>
                            ))}
                            {programs?.length === 0 && <p className="text-sm text-muted-foreground p-2">No programs created yet.</p>}
                        </div>
                    </div>

                    {!isCreating ? (
                        <Button variant="outline" className="w-full dashed border-2" onClick={() => setIsCreating(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Create New Standard
                        </Button>
                    ) : (
                        <div className="p-4 border rounded-lg bg-muted/30 space-y-3 animate-in fade-in zoom-in-95">
                            <div className="space-y-1">
                                <Label>Program Name</Label>
                                <Input
                                    placeholder="e.g. Heavy Duty Oil Change"
                                    value={newProgramName}
                                    onChange={(e) => setNewProgramName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Interval (Miles/Km)</Label>
                                <Input
                                    type="number"
                                    value={newProgramMiles}
                                    onChange={(e) => setNewProgramMiles(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                                <Button size="sm" onClick={handleQuickCreate} disabled={!newProgramName}>Save Template</Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 2. Assign to Vehicles */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Assign to Vehicle
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Select Vehicle</Label>
                        <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select vehicle..." />
                            </SelectTrigger>
                            <SelectContent>
                                {vehicles.map(v => (
                                    <SelectItem key={v.id} value={v.id}>
                                        {v.make} {v.model} ({v.license_plate})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Select Program</Label>
                        <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select maintenance program..." />
                            </SelectTrigger>
                            <SelectContent>
                                {programs?.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name} (Every {p.interval_miles?.toLocaleString()} mi)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        className="w-full mt-4"
                        onClick={handleAssign}
                        disabled={!selectedVehicle || !selectedProgram || assignMutation.isPending}
                    >
                        {assignMutation.isPending ? 'Assigning...' : 'Activate Maintenance Program'}
                    </Button>

                    <p className="text-xs text-muted-foreground mt-2 text-center">
                        This will initialize the status as &quot;Fresh&quot; based on the vehicle&apos;s current odometer reading ({vehicles.find(v => v.id === selectedVehicle)?.odometer_reading || 0} mi).
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
