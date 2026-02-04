'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Wrench, DollarSign, Calendar } from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useVehicles } from '@/hooks/useVehicles'
import { MaintenanceRecordInsert } from '@/types/database'
import { useServicePrograms } from '@/hooks/useSmartMaintenance'

const serviceFormSchema = z.object({
    vehicle_id: z.string().min(1, 'Vehicle is required'),
    program_id: z.string().optional(),
    type: z.enum(['scheduled', 'repair', 'inspection']),
    description: z.string().min(1, 'Description is required'),
    cost: z.number().optional(),
    odometer_at_service: z.number().optional(),
    service_date: z.string().optional(),
    next_service_date: z.string().optional(),
    next_service_odometer: z.number().optional(),
    status: z.enum(['scheduled', 'in_progress', 'completed']),
})

type ServiceFormData = z.infer<typeof serviceFormSchema>

interface ServiceFormProps {
    initialData?: Partial<ServiceFormData & { id: string }>
    onSubmit: (data: MaintenanceRecordInsert) => Promise<void>
    isSubmitting?: boolean
}

import { useRouter } from 'next/navigation'

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

    const handleFormSubmit = async (data: ServiceFormData) => {
        // Here we can use program_id if we want to pass it to the parent
        // But the parent expects MaintenanceRecordInsert which might not have program_id column yet?
        // Wait, I updated the SQL to add program_id to maintenance_records table!
        // So I should update the type definition or just cast it for now if types aren't auto-generated.

        const maintenanceData: MaintenanceRecordInsert & { program_id?: string | null } = {
            vehicle_id: data.vehicle_id,
            type: data.type,
            description: data.description,
            cost: data.cost || null,
            odometer_at_service: data.odometer_at_service || null,
            service_date: data.service_date || null,
            next_service_date: data.next_service_date || null,
            next_service_odometer: data.next_service_odometer || null,
            status: data.status,
            program_id: data.program_id || null
        }

        await onSubmit(maintenanceData)
    }

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 sm:space-y-6">
            {/* Vehicle & Type */}
            <Card>
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Service Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-xs sm:text-sm">Vehicle *</Label>
                            <Select
                                value={selectedVehicleId}
                                onValueChange={(value) => setValue('vehicle_id', value)}
                            >
                                <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Select a vehicle..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {vehicles.map((vehicle) => (
                                        <SelectItem key={vehicle.id} value={vehicle.id}>
                                            {vehicle.make} {vehicle.model} - {vehicle.registration_number}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.vehicle_id && (
                                <p className="text-xs text-status-error">{errors.vehicle_id.message}</p>
                            )}
                        </div>

                        <div className="space-y-1.5 sm:space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs sm:text-sm">Service Program (Optional)</Label>
                                <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                                    onClick={() => router.push('/dashboard/maintenance/setup')}
                                >
                                    Manage Programs
                                </Button>
                            </div>
                            <Select
                                value={selectedProgramId}
                                onValueChange={(value) => {
                                    setValue('program_id', value)
                                    // Auto-fill details if program selected
                                    const prog = programs?.find(p => p.id === value)
                                    if (prog) {
                                        setValue('description', prog.name)
                                        setValue('type', 'scheduled')
                                    }
                                }}
                            >
                                <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Select standard program..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- Custom Service --</SelectItem>
                                    {programs?.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-xs sm:text-sm">Type *</Label>
                            <Select
                                value={selectedType}
                                onValueChange={(value: 'scheduled' | 'repair' | 'inspection') => setValue('type', value)}
                            >
                                <SelectTrigger className="text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="scheduled">Scheduled Maintenance</SelectItem>
                                    <SelectItem value="repair">Repair</SelectItem>
                                    <SelectItem value="inspection">Inspection</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs sm:text-sm">Description *</Label>
                        <textarea
                            className="w-full min-h-[60px] sm:min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            placeholder="Oil change, tire rotation, brake inspection..."
                            {...register('description')}
                        />
                        {errors.description && (
                            <p className="text-xs text-status-error">{errors.description.message}</p>
                        )}
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs sm:text-sm">Status</Label>
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
                </CardContent>
            </Card>

            {/* Cost & Odometer */}
            <Card>
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Cost & Odometer
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-xs sm:text-sm">Cost ($)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="text-sm"
                                {...register('cost', { valueAsNumber: true })}
                            />
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-xs sm:text-sm">Odometer at Service</Label>
                            <Input
                                type="number"
                                placeholder="Current mileage"
                                className="text-sm"
                                {...register('odometer_at_service', { valueAsNumber: true })}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Dates */}
            <Card>
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Schedule
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 p-3 pt-0 sm:p-6 sm:pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-xs sm:text-sm">Service Date</Label>
                            <Input
                                type="date"
                                className="text-sm"
                                {...register('service_date')}
                            />
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                            <Label className="text-xs sm:text-sm">Next Service Date</Label>
                            <Input
                                type="date"
                                className="text-sm"
                                {...register('next_service_date')}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs sm:text-sm">Next Service Odometer</Label>
                        <Input
                            type="number"
                            placeholder="e.g., 50000"
                            className="text-sm"
                            {...register('next_service_odometer', { valueAsNumber: true })}
                        />
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                            Maintenance will be flagged when vehicle reaches this mileage
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-3 justify-end">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
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
