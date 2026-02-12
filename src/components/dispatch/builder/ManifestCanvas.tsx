'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MapPin, Plus, GripVertical, Calendar, User, Truck, Send, Loader2, X, ChevronDown, Search, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { getJobDeliveryAddress, getJobStopCount, useAssignJob } from '@/hooks/useJobs'
import { Job } from '@/types/database'
import { useCreateManifest, useAddJobToManifest } from '@/hooks/useManifests'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Accept any job type (with or without job_stops)
type ManifestJob = Job & { job_stops?: any[] }

interface ManifestCanvasProps {
    jobs: ManifestJob[]
    drivers: any[]
    vehicles: any[]
    activeDriver?: any
    activeVehicle?: any
    selectedDriverId?: string | null
    selectedVehicleId?: string | null
    manifestDate: string
    onDateChange: (date: string) => void
    onSelectDriver: (id: string) => void
    onSelectVehicle: (id: string) => void
    onRemoveJob?: (jobId: string) => void
}

export function ManifestCanvas({
    jobs,
    drivers,
    vehicles,
    activeDriver,
    activeVehicle,
    selectedDriverId,
    selectedVehicleId,
    manifestDate,
    onDateChange,
    onSelectDriver,
    onSelectVehicle,
    onRemoveJob
}: ManifestCanvasProps) {
    const router = useRouter()
    const { setNodeRef } = useDroppable({
        id: 'manifest-container'
    })

    // Dropdown open states
    const [driverOpen, setDriverOpen] = useState(false)
    const [vehicleOpen, setVehicleOpen] = useState(false)

    // Supabase hooks
    const createManifest = useCreateManifest()
    const addJob = useAddJobToManifest()
    const assignJob = useAssignJob()
    const [isDispatching, setIsDispatching] = useState(false)

    // Smart mode detection
    const isSingleJobMode = jobs.length === 1
    const canDispatch = activeDriver && activeVehicle && jobs.length > 0

    // Single job dispatch - assigns directly without manifest
    const handleDispatchSingleJob = async () => {
        if (!canDispatch) {
            toast.error('Please select a driver, vehicle, and a job')
            return
        }

        setIsDispatching(true)
        try {
            await assignJob.mutateAsync({
                jobId: jobs[0].id,
                driverId: activeDriver.id,
                vehicleId: activeVehicle.id
            })

            toast.success(`Job ${jobs[0].job_number} assigned to ${activeDriver.profiles?.full_name}!`)

            // Navigate to jobs page
            router.push('/dashboard/jobs')

        } catch (error: any) {
            toast.error(error.message || 'Failed to assign job')
        } finally {
            setIsDispatching(false)
        }
    }

    // Multi-job dispatch - creates manifest
    const handleDispatchManifest = async () => {
        if (!canDispatch) {
            toast.error('Please select a driver, vehicle, and at least one job')
            return
        }

        setIsDispatching(true)
        try {
            // 1. Create manifest in Supabase
            const manifest = await createManifest.mutateAsync({
                driver_id: activeDriver.id,
                vehicle_id: activeVehicle.id,
                scheduled_date: manifestDate,
                status: 'scheduled'
            })

            // 2. Add all jobs to manifest with sequence order
            for (let i = 0; i < jobs.length; i++) {
                await addJob.mutateAsync({
                    manifestId: manifest.id,
                    jobId: jobs[i].id,
                    sequence: i + 1
                })
            }

            toast.success(`Manifest dispatched with ${jobs.length} jobs!`)

            // Navigate to the new manifest details page
            router.push(`/dashboard/manifests/${manifest.id}`)

        } catch (error: any) {
            toast.error(error.message || 'Failed to dispatch manifest')
        } finally {
            setIsDispatching(false)
        }
    }

    // Smart dispatch handler
    const handleDispatch = () => {
        if (jobs.length === 0) {
            toast.info('Please add a job from the right panel first', {
                description: 'Drag a job to this area or create a new one'
            })
            return
        }
        if (isSingleJobMode) {
            handleDispatchSingleJob()
        } else {
            handleDispatchManifest()
        }
    }

    // Button text based on job count
    const getButtonText = () => {
        if (jobs.length === 0) return 'Dispatch'
        if (jobs.length === 1) return 'Dispatch Job'
        return 'Dispatch Manifest'
    }

    return (
        <Card className="flex flex-col h-full border-2 border-primary/20 shadow-lg">
            {/* Header / Manifest Settings */}
            <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-4 mb-4">
                    <Input
                        type="date"
                        value={manifestDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="w-auto h-9 bg-white"
                    />
                    <div className="flex-1" />
                    <Button
                        size="sm"
                        onClick={handleDispatch}
                        disabled={isDispatching}
                        className={cn("gap-2", jobs.length === 0 && "opacity-50")}
                    >
                        {isDispatching ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Dispatching...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                {getButtonText()}
                            </>
                        )}
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Driver Searchable Dropdown */}
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" /> Driver
                        </label>
                        <Popover open={driverOpen} onOpenChange={setDriverOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={driverOpen}
                                    className={cn(
                                        "w-full h-10 justify-between bg-white",
                                        selectedDriverId ? 'border-blue-200 bg-blue-50/50' : 'border-dashed'
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "h-6 w-6 rounded-full flex items-center justify-center",
                                            selectedDriverId ? 'bg-blue-100' : 'bg-slate-100'
                                        )}>
                                            <User className={cn(
                                                "h-3 w-3",
                                                selectedDriverId ? 'text-blue-600' : 'text-slate-400'
                                            )} />
                                        </div>
                                        <span className="truncate">
                                            {activeDriver?.profiles?.full_name || 'Select driver...'}
                                        </span>
                                    </div>
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search drivers..." />
                                    <CommandList>
                                        <CommandEmpty>No driver found.</CommandEmpty>
                                        <CommandGroup>
                                            {drivers.map((driver) => (
                                                <CommandItem
                                                    key={driver.id}
                                                    value={driver.profiles?.full_name || driver.id}
                                                    onSelect={() => {
                                                        onSelectDriver(driver.id)
                                                        setDriverOpen(false)
                                                    }}
                                                    className="flex items-center gap-2"
                                                >
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        driver.status === 'available' ? 'bg-green-500' : 'bg-amber-500'
                                                    )} />
                                                    <span>{driver.profiles?.full_name || 'Unknown'}</span>
                                                    <span className="text-xs text-muted-foreground ml-auto">
                                                        {driver.status}
                                                    </span>
                                                    {selectedDriverId === driver.id && (
                                                        <Check className="h-4 w-4 text-primary" />
                                                    )}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Vehicle Searchable Dropdown */}
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Truck className="h-3 w-3" /> Vehicle
                        </label>
                        <Popover open={vehicleOpen} onOpenChange={setVehicleOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={vehicleOpen}
                                    className={cn(
                                        "w-full h-10 justify-between bg-white",
                                        selectedVehicleId ? 'border-orange-200 bg-orange-50/50' : 'border-dashed'
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={cn(
                                            "h-6 w-6 rounded-full flex items-center justify-center",
                                            selectedVehicleId ? 'bg-orange-100' : 'bg-slate-100'
                                        )}>
                                            <Truck className={cn(
                                                "h-3 w-3",
                                                selectedVehicleId ? 'text-orange-600' : 'text-slate-400'
                                            )} />
                                        </div>
                                        <span className="truncate">
                                            {activeVehicle
                                                ? `${activeVehicle.license_plate}`
                                                : 'Select vehicle...'}
                                        </span>
                                    </div>
                                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search vehicles..." />
                                    <CommandList>
                                        <CommandEmpty>No vehicle found.</CommandEmpty>
                                        <CommandGroup>
                                            {vehicles.map((vehicle) => (
                                                <CommandItem
                                                    key={vehicle.id}
                                                    value={`${vehicle.license_plate} ${vehicle.make} ${vehicle.model}`}
                                                    onSelect={() => {
                                                        onSelectVehicle(vehicle.id)
                                                        setVehicleOpen(false)
                                                    }}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Truck className="h-4 w-4 text-orange-500" />
                                                    <div className="flex-1">
                                                        <span className="font-medium">{vehicle.license_plate}</span>
                                                        <span className="text-xs text-muted-foreground ml-2">
                                                            {vehicle.make} {vehicle.model}
                                                        </span>
                                                    </div>
                                                    {selectedVehicleId === vehicle.id && (
                                                        <Check className="h-4 w-4 text-primary" />
                                                    )}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            </div>

            {/* Droppable Area */}
            <CardContent className="flex-1 bg-slate-50 overflow-auto p-4 min-h-0" ref={setNodeRef}>

                <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4 relative">
                        {/* Route Line (Visual) */}
                        {jobs.length > 0 && (
                            <div className="absolute left-[28px] top-4 bottom-4 w-0.5 bg-slate-200 z-0" />
                        )}

                        {jobs.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg bg-white/50">
                                <p className="font-medium">Drag jobs here from the right</p>
                                <p className="text-xs mt-1">Select driver & vehicle above, then dispatch</p>
                            </div>
                        )}

                        {jobs.map((job, index) => (
                            <SortableManifestItem
                                key={job.id}
                                job={job}
                                index={index}
                                onRemove={onRemoveJob ? () => onRemoveJob(job.id) : undefined}
                            />
                        ))}
                    </div>
                </SortableContext>

                {/* Quick Add Row - contextual hint */}
                {jobs.length > 0 && (
                    <div className="mt-4 text-xs text-center">
                        {isSingleJobMode ? (
                            <span className="text-muted-foreground">
                                Ready to dispatch • <span className="text-blue-600 font-medium">Drag more jobs to create a manifest</span>
                            </span>
                        ) : (
                            <span className="text-muted-foreground">
                                {jobs.length} jobs ready to dispatch as <span className="font-medium text-primary">manifest</span>
                            </span>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function SortableManifestItem({
    job,
    index,
    onRemove
}: {
    job: ManifestJob
    index: number
    onRemove?: () => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: job.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1
    }

    return (
        <div ref={setNodeRef} style={style} className="relative z-10 bg-white border rounded-lg p-3 shadow-sm flex items-start gap-3 group">
            <div
                {...attributes}
                {...listeners}
                className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
            >
                <GripVertical className="h-4 w-4" />
            </div>

            <div className="flex-none flex flex-col items-center gap-1">
                <div className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    {index + 1}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <div className="font-medium text-sm truncate">{job.customer_name || 'Unknown Customer'}</div>
                    <Badge variant="secondary" className="text-[10px]">{job.job_number}</Badge>
                </div>
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {getJobDeliveryAddress(job)}
                </div>
                {getJobStopCount(job) > 2 && (
                    <div className="text-xs text-muted-foreground mt-1">
                        {getJobStopCount(job)} stops
                    </div>
                )}
            </div>

            {/* Remove button */}
            {onRemove && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded text-red-500"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    )
}
