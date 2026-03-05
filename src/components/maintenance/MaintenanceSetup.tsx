'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useServicePrograms, useAssignServiceProgram } from '@/hooks/useSmartMaintenance'
import { useVehicles } from '@/hooks/useVehicles'
import { Plus, Check, Settings, Wrench, ChevronRight, Truck, AlertCircle, Info } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'

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
    const [newProgramMonths, setNewProgramMonths] = useState('6')

    const queryClient = useQueryClient()
    const supabase = createClient()

    const handleQuickCreate = async () => {
        if (!newProgramName) return

        const { error } = await supabase.from('service_programs').insert({
            name: newProgramName,
            interval_miles: parseInt(newProgramMiles) || null,
            interval_months: parseInt(newProgramMonths) || null
        })

        if (error) {
            toast.error('Failed to create program')
            return
        }

        toast.success('Service Program Created')
        queryClient.invalidateQueries({ queryKey: ['smart-maintenance', 'programs'] })
        setIsCreating(false)
        setNewProgramName('')
        setNewProgramMiles('5000')
        setNewProgramMonths('6')
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
            setSelectedVehicle('')
            setSelectedProgram('')
        } catch (error) {
            toast.error('Failed to assign program (maybe already assigned?)')
        }
    }

    const selectedVehicleData = vehicles.find(v => v.id === selectedVehicle)

    return (
        <div className="space-y-6">
            {/* How It Works Guide */}
            <Card className="border-blue-200 bg-blue-50/30">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold text-sm text-blue-900">How Maintenance Programs Work</h4>
                            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                <strong>Step 1:</strong> Create a maintenance template (e.g., "Oil Change every 5,000 miles / 4 months").{' '}
                                <strong>Step 2:</strong> Assign the template to your vehicles. The system will automatically track when each vehicle's service is due and alert you.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Step 1: Create Programs */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Settings className="h-4 w-4" />
                                    Service Programs
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    Reusable maintenance templates with schedule intervals
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Available Templates</Label>
                            <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
                                {programs?.length === 0 && (
                                    <div className="p-4 border border-dashed rounded-lg text-center">
                                        <Wrench className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
                                        <p className="text-sm text-muted-foreground">No programs yet</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Create your first template below</p>
                                    </div>
                                )}
                                {programs?.map(p => (
                                    <div key={p.id} className="flex items-center justify-between p-3 bg-background border rounded-lg shadow-sm hover:bg-accent/50 transition-colors">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <Wrench className="h-4 w-4 text-primary" />
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium">{p.name}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {p.interval_miles && (
                                                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                                                            {p.interval_miles.toLocaleString()} mi
                                                        </Badge>
                                                    )}
                                                    {p.interval_months && (
                                                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                                                            {p.interval_months} mo
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {!isCreating ? (
                            <Button variant="outline" className="w-full border-dashed border-2 gap-2" onClick={() => setIsCreating(true)}>
                                <Plus className="h-4 w-4" /> Create New Template
                            </Button>
                        ) : (
                            <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5 space-y-3 animate-in fade-in zoom-in-95">
                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <Plus className="h-4 w-4" /> New Service Template
                                </h4>
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Template Name *</Label>
                                    <Input
                                        placeholder="e.g. Heavy Duty Oil Change"
                                        value={newProgramName}
                                        onChange={(e) => setNewProgramName(e.target.value)}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Every (Miles)</Label>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 5000"
                                            value={newProgramMiles}
                                            onChange={(e) => setNewProgramMiles(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Every (Months)</Label>
                                        <Input
                                            type="number"
                                            placeholder="e.g. 6"
                                            value={newProgramMonths}
                                            onChange={(e) => setNewProgramMonths(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    Whichever comes first — miles or months — will trigger the alert.
                                </p>
                                <div className="flex gap-2 justify-end pt-1">
                                    <Button size="sm" variant="ghost" onClick={() => { setIsCreating(false); setNewProgramName('') }}>Cancel</Button>
                                    <Button size="sm" onClick={handleQuickCreate} disabled={!newProgramName}>
                                        <Check className="h-3 w-3 mr-1" /> Save Template
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Step 2: Assign to Vehicles */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</div>
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Truck className="h-4 w-4" />
                                    Assign to Vehicle
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    Apply a template to a vehicle to start tracking
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(!programs || programs.length === 0) ? (
                            <div className="p-6 border border-dashed rounded-lg text-center">
                                <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                                <p className="text-sm text-muted-foreground font-medium">Create a template first</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    You need at least one service program before you can assign it to a vehicle.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium">Select Vehicle</Label>
                                    <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a vehicle..." />
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
                                    <Label className="text-xs font-medium">Select Program</Label>
                                    <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Choose a maintenance program..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {programs?.map(p => (
                                                <SelectItem key={p.id} value={p.id}>
                                                    {p.name} ({p.interval_miles ? `${p.interval_miles.toLocaleString()} mi` : ''}{p.interval_miles && p.interval_months ? ' / ' : ''}{p.interval_months ? `${p.interval_months} mo` : ''})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedVehicleData && selectedProgram && (
                                    <div className="p-3 bg-muted/30 rounded-lg border text-xs space-y-1 animate-in fade-in">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Vehicle Odometer:</span>
                                            <span className="font-medium">{(selectedVehicleData.odometer_reading || 0).toLocaleString()} mi</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Program:</span>
                                            <span className="font-medium">{programs?.find(p => p.id === selectedProgram)?.name}</span>
                                        </div>
                                    </div>
                                )}

                                <Button
                                    className="w-full gap-2"
                                    onClick={handleAssign}
                                    disabled={!selectedVehicle || !selectedProgram || assignMutation.isPending}
                                >
                                    {assignMutation.isPending ? 'Assigning...' : (
                                        <>
                                            <ChevronRight className="h-4 w-4" />
                                            Activate Maintenance Tracking
                                        </>
                                    )}
                                </Button>

                                <p className="text-[10px] text-muted-foreground text-center">
                                    Tracking starts from the vehicle's current odometer. Alerts will fire when service is due.
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
