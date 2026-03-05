'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Wrench, DollarSign, Calendar, Settings, FileText, Gauge } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useVehicles } from '@/hooks/useVehicles'
import { MaintenanceRecordInsert } from '@/types/database'
import { useServicePrograms } from '@/hooks/useSmartMaintenance'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const optionalNumber = z.number().optional().catch(undefined)

const serviceFormSchema = z.object({
    vehicle_id: z.string().min(1, 'Vehicle is required'),
    program_id: z.string().optional(),
    type: z.enum(['scheduled', 'repair', 'inspection']),
    description: z.string().min(1, 'Description is required'),
    cost: optionalNumber,
    parts_cost: optionalNumber,
    labor_cost: optionalNumber,
    mechanic_notes: z.string().optional(),
    odometer_at_service: optionalNumber,
    service_date: z.string().optional(),
    next_service_date: z.string().optional(),
    next_service_odometer: optionalNumber,
    status: z.enum(['scheduled', 'in_progress', 'completed']),
})

type ServiceFormData = z.infer<typeof serviceFormSchema>

interface ServiceFormProps {
    initialData?: Partial<ServiceFormData & { id: string }>
    onSubmit: (data: MaintenanceRecordInsert) => Promise<void>
    isSubmitting?: boolean
}

export function ServiceForm({ initialData, onSubmit, isSubmitting }: ServiceFormProps) {
    const router = useRouter()
    const { data: vehiclesData } = useVehicles()
    const { data: programs } = useServicePrograms()
    const vehicles = vehiclesData?.data || []

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<ServiceFormData>({
        resolver: zodResolver(serviceFormSchema),
        defaultValues: {
            vehicle_id: initialData?.vehicle_id || '',
            program_id: initialData?.program_id || '',
            type: initialData?.type || 'scheduled',
            description: initialData?.description || '',
            cost: initialData?.cost,
            parts_cost: initialData?.parts_cost || 0,
            labor_cost: initialData?.labor_cost || 0,
            mechanic_notes: initialData?.mechanic_notes || '',
            odometer_at_service: initialData?.odometer_at_service,
            service_date: initialData?.service_date || '',
            next_service_date: initialData?.next_service_date || '',
            next_service_odometer: initialData?.next_service_odometer,
            status: initialData?.status || 'scheduled',
        },
    })

    const selectedVehicleId = watch('vehicle_id')
    const selectedProgramId = watch('program_id')
    const selectedType = watch('type')
    const selectedStatus = watch('status')
    const watchPartsCost = watch('parts_cost') || 0
    const watchLaborCost = watch('labor_cost') || 0
    const totalCost = watchPartsCost + watchLaborCost

    const handleFormSubmit = async (data: ServiceFormData) => {
        const calculatedTotal = (data.parts_cost || 0) + (data.labor_cost || 0)

        const maintenanceData: MaintenanceRecordInsert = {
            vehicle_id: data.vehicle_id,
            type: data.type,
            description: data.description,
            cost: calculatedTotal > 0 ? calculatedTotal : (data.cost || null),
            parts_cost: data.parts_cost || null,
            labor_cost: data.labor_cost || null,
            mechanic_notes: data.mechanic_notes || null,
            odometer_at_service: data.odometer_at_service || null,
            service_date: data.service_date || null,
            next_service_date: data.next_service_date || null,
            next_service_odometer: data.next_service_odometer || null,
            status: data.status,
            program_id: data.program_id || null
        }

        await onSubmit(maintenanceData)
    }

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId)

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
            {/* ── Step 1: Vehicle & Type ── */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2 p-4 sm:p-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</div>
                        Service Details
                    </CardTitle>
                    <CardDescription className="text-xs">Select a vehicle and configure the service type</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs sm:text-sm font-medium">Vehicle *</Label>
                            <Select
                                value={selectedVehicleId}
                                onValueChange={(value) => {
                                    setValue('vehicle_id', value)
                                    const vehicle = vehicles.find(v => v.id === value)
                                    if (vehicle?.odometer_reading) {
                                        setValue('odometer_at_service', vehicle.odometer_reading)
                                    }
                                }}
                            >
                                <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Select a vehicle..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {vehicles.map((vehicle) => (
                                        <SelectItem key={vehicle.id} value={vehicle.id}>
                                            {vehicle.make} {vehicle.model} — {vehicle.license_plate}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.vehicle_id && (
                                <p className="text-xs text-red-500">{errors.vehicle_id.message}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs sm:text-sm font-medium">Service Program</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] gap-1 text-muted-foreground"
                                    onClick={() => router.push('/dashboard/maintenance/setup')}
                                >
                                    <Settings className="h-3 w-3" /> Manage
                                </Button>
                            </div>
                            {(!programs || programs.length === 0) ? (
                                <div className="p-3 border border-dashed rounded-md bg-muted/30 text-center">
                                    <p className="text-xs text-muted-foreground">
                                        No programs configured.
                                    </p>
                                    <Button
                                        type="button"
                                        variant="link"
                                        size="sm"
                                        className="text-xs mt-1 h-auto p-0"
                                        onClick={() => router.push('/dashboard/maintenance/setup')}
                                    >
                                        Set up programs →
                                    </Button>
                                </div>
                            ) : (
                                <Select
                                    value={selectedProgramId}
                                    onValueChange={(value) => {
                                        setValue('program_id', value === 'none' ? '' : value)
                                        const prog = programs?.find(p => p.id === value)
                                        if (prog) {
                                            setValue('description', prog.name)
                                            setValue('type', 'scheduled')
                                        }
                                    }}
                                >
                                    <SelectTrigger className="text-sm">
                                        <SelectValue placeholder="Select program..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">— Custom Service —</SelectItem>
                                        {programs?.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} {p.interval_miles ? `(${p.interval_miles.toLocaleString()} mi)` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs sm:text-sm font-medium">Type *</Label>
                            <Select
                                value={selectedType}
                                onValueChange={(value: 'scheduled' | 'repair' | 'inspection') => setValue('type', value)}
                            >
                                <SelectTrigger className="text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="scheduled">
                                        <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-sky-500" /> Scheduled</span>
                                    </SelectItem>
                                    <SelectItem value="repair">
                                        <span className="flex items-center gap-1.5"><Wrench className="h-3 w-3 text-orange-500" /> Repair</span>
                                    </SelectItem>
                                    <SelectItem value="inspection">
                                        <span className="flex items-center gap-1.5"><Gauge className="h-3 w-3 text-purple-500" /> Inspection</span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs sm:text-sm font-medium">Status</Label>
                            <Select
                                value={selectedStatus}
                                onValueChange={(value: 'scheduled' | 'in_progress' | 'completed') => setValue('status', value)}
                            >
                                <SelectTrigger className="text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm font-medium">Description *</Label>
                        <Textarea
                            className="min-h-[70px] resize-none text-sm"
                            placeholder="Oil change, tire rotation, brake repair, accident damage..."
                            {...register('description')}
                        />
                        {errors.description && (
                            <p className="text-xs text-red-500">{errors.description.message}</p>
                        )}
                    </div>

                    {/* Vehicle info preview */}
                    {selectedVehicle && (
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border text-xs animate-in fade-in">
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Current Odometer:</span>
                            <span className="font-medium">{(selectedVehicle.odometer_reading || 0).toLocaleString()} mi</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Step 2: Cost Breakdown ── */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2 p-4 sm:p-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</div>
                        Cost & Odometer
                    </CardTitle>
                    <CardDescription className="text-xs">Itemize costs for better tracking. Leave blank if unknown at scheduling time.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                                Parts Cost
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="text-sm pl-7"
                                    {...register('parts_cost', { valueAsNumber: true })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs sm:text-sm font-medium flex items-center gap-1">
                                Labor Cost
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    className="text-sm pl-7"
                                    {...register('labor_cost', { valueAsNumber: true })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs sm:text-sm font-medium">Odometer at Service</Label>
                            <Input
                                type="number"
                                placeholder="Current mileage"
                                className="text-sm"
                                {...register('odometer_at_service', { valueAsNumber: true })}
                            />
                        </div>
                    </div>

                    {/* Auto-calculated Total */}
                    {totalCost > 0 && (
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-lg border border-emerald-200 animate-in fade-in">
                            <span className="text-sm font-medium text-emerald-800 flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5" /> Total Cost
                            </span>
                            <span className="text-lg font-bold text-emerald-700">${totalCost.toFixed(2)}</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Step 3: Notes ── */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2 p-4 sm:p-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</div>
                        Mechanic Notes
                    </CardTitle>
                    <CardDescription className="text-xs">Document repair details, incident reports, or observations</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                    <Textarea
                        className="min-h-[80px] resize-none text-sm"
                        placeholder="Brake pads worn to 2mm, replaced all four. Found minor oil leak on valve cover gasket — scheduled follow-up."
                        {...register('mechanic_notes')}
                    />
                </CardContent>
            </Card>

            {/* ── Step 4: Schedule ── */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2 p-4 sm:p-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">4</div>
                        Schedule
                    </CardTitle>
                    <CardDescription className="text-xs">When this service is happening and when it's next due</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
                    <div className="space-y-1.5">
                        <Label className="text-xs sm:text-sm font-medium">Service Date</Label>
                        <Input
                            type="date"
                            className="text-sm"
                            {...register('service_date')}
                        />
                    </div>
                    {selectedProgramId ? (
                        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-sm text-blue-800">
                            <p className="font-medium text-xs">⏱ Next service auto-calculated</p>
                            <p className="text-xs text-blue-600 mt-1">
                                The next service date and odometer will be automatically calculated from the program's interval settings.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs sm:text-sm font-medium">Next Service Date</Label>
                                <Input
                                    type="date"
                                    className="text-sm"
                                    {...register('next_service_date')}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs sm:text-sm font-medium">Next Service Odometer</Label>
                                <Input
                                    type="number"
                                    placeholder="e.g., 50000"
                                    className="text-sm"
                                    {...register('next_service_odometer', { valueAsNumber: true })}
                                />
                                <p className="text-[10px] text-muted-foreground">
                                    Flagged when vehicle reaches this mileage
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-3 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2 min-w-[140px]">
                    {isSubmitting ? 'Saving...' : (
                        <>
                            <Wrench className="h-4 w-4" />
                            {initialData?.id ? 'Update Service' : 'Schedule Service'}
                        </>
                    )}
                </Button>
            </div>
        </form>
    )
}
