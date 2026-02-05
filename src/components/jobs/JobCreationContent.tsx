'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Calendar, User, Phone, Mail, Loader2, Clock } from 'lucide-react'
import { PhoneInput } from '@/components/ui/phone-input'
import { LocationPicker } from '@/components/ui/LocationPicker'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useCreateJobWithStops, CreateJobWithStopsInput } from '@/hooks/useJobs'
import { useRoutes } from '@/hooks/useRoutes'
import { Route } from '@/types/database'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { MapPin } from 'lucide-react'

// Helper: Get the effective end time of a stop
// For fixed mode: scheduled_arrival + service_duration
// For window mode: window_end + service_duration
function getStopEndTime(stop: any): Date | null {
    const mode = stop.arrival_mode || 'fixed'
    const duration = stop.service_duration || 0

    if (mode === 'window') {
        // Window mode: window_end + service_duration
        // Driver could arrive at the last moment of window, then needs time to complete service
        if (stop.window_end) {
            const endTime = new Date(stop.window_end)
            endTime.setMinutes(endTime.getMinutes() + duration)
            return endTime
        }
        return null
    } else {
        // Fixed mode: scheduled_arrival + service_duration
        if (stop.scheduled_arrival) {
            const arrival = new Date(stop.scheduled_arrival)
            arrival.setMinutes(arrival.getMinutes() + duration)
            return arrival
        }
        return null
    }
}

// Helper: Get the start date of a stop for date-level comparison
function getStopStartDate(stop: any): string | null {
    const mode = stop.arrival_mode || 'fixed'

    if (mode === 'window') {
        if (stop.window_start) {
            return stop.window_start.split('T')[0]
        }
    } else {
        if (stop.scheduled_arrival) {
            return stop.scheduled_arrival.split('T')[0]
        }
    }
    return null
}

// Helper: Validate if current stop time is valid based on previous stop
function validateStopSequence(
    currentStop: any,
    previousStop: any | null
): { isValid: boolean; message: string | null } {
    if (!previousStop) {
        return { isValid: true, message: null }
    }

    const prevEndTime = getStopEndTime(previousStop)
    const prevDate = getStopStartDate(previousStop)
    const currDate = getStopStartDate(currentStop)
    const currMode = currentStop.arrival_mode || 'fixed'

    // If previous stop has no time set, no validation needed
    if (!prevDate) {
        return { isValid: true, message: null }
    }

    // If current stop has no time set, can't validate yet
    if (!currDate) {
        return { isValid: true, message: null }
    }

    // Rule 1: Current date must be >= previous date
    if (currDate < prevDate) {
        return {
            isValid: false,
            message: `Date must be on or after ${new Date(prevDate).toLocaleDateString()}`
        }
    }

    // Rule 2: Current stop's start time must be >= previous stop's end time
    // For sequential stops, the next stop can only begin after the previous one ends
    if (prevEndTime) {
        const currStartTime = currMode === 'window'
            ? (currentStop.window_start ? new Date(currentStop.window_start) : null)
            : (currentStop.scheduled_arrival ? new Date(currentStop.scheduled_arrival) : null)

        if (currStartTime && currStartTime < prevEndTime) {
            return {
                isValid: false,
                message: `Must be after ${prevEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            }
        }
    }

    return { isValid: true, message: null }
}

// Helper: Validate window end is after window start within same stop
function validateWindowEndAfterStart(stop: any): { isValid: boolean; message: string | null } {
    const mode = stop.arrival_mode || 'fixed'

    // Only validate for window mode
    if (mode !== 'window') {
        return { isValid: true, message: null }
    }

    // If either is not set, can't validate yet
    if (!stop.window_start || !stop.window_end) {
        return { isValid: true, message: null }
    }

    const startTime = new Date(stop.window_start)
    const endTime = new Date(stop.window_end)

    if (endTime < startTime) {
        return {
            isValid: false,
            message: `Must be after ${startTime.toLocaleDateString()} ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        }
    }

    return { isValid: true, message: null }
}

// DateTimeInput component
function DateTimeInput({
    value,
    onChange,
    minDate,
    minTime,
    hasError
}: {
    value: string | null | undefined,
    onChange: (val: string) => void,
    minDate?: string,
    minTime?: string,
    hasError?: boolean
}) {
    // Parse existing value
    const valStr = value || ''
    const dateVal = valStr.split('T')[0] || ''
    const timeVal = valStr.split('T')[1]?.substring(0, 5) || ''

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value
        if (!newDate) return
        const timeToUse = timeVal || '09:00'
        onChange(`${newDate}T${timeToUse}`)
    }

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTime = e.target.value
        if (!newTime) return
        const dateToUse = dateVal || new Date().toISOString().split('T')[0]
        onChange(`${dateToUse}T${newTime}`)
    }

    // Custom styles to hide native browser picker icons
    const hideNativeIconStyle: React.CSSProperties = {
        WebkitAppearance: 'none',
        MozAppearance: 'textfield'
    }

    const errorClass = hasError ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'

    return (
        <div className="flex gap-1.5">
            {/* Date Input with Calendar Icon */}
            <div className="relative">
                <Calendar className={cn(
                    "absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none z-10",
                    hasError ? "text-red-400" : "text-slate-400"
                )} />
                <input
                    type="date"
                    className={cn(
                        "h-7 pl-7 pr-1 text-xs w-[115px] rounded-md border focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
                        errorClass
                    )}
                    value={dateVal}
                    onChange={handleDateChange}
                    min={minDate}
                    style={hideNativeIconStyle}
                />
            </div>
            {/* Time Input with Clock Icon */}
            <div className="relative">
                <Clock className={cn(
                    "absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none z-10",
                    hasError ? "text-red-400" : "text-blue-500"
                )} />
                <input
                    type="time"
                    className={cn(
                        "h-7 pl-7 pr-1 text-xs w-[85px] rounded-md border focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
                        errorClass
                    )}
                    value={timeVal}
                    onChange={handleTimeChange}
                    min={minDate === dateVal ? minTime : undefined}
                    style={hideNativeIconStyle}
                />
            </div>
        </div>
    )
}

interface JobCreationContentProps {
    onSave?: (job: any) => void
    onCancel?: () => void
    variant?: 'modal' | 'page'
}

export function JobCreationContent({ onSave, onCancel, variant = 'page' }: JobCreationContentProps) {
    const [activeTab, setActiveTab] = useState('details')

    // Use the new hook for creating jobs with stops
    const createJobMutation = useCreateJobWithStops()

    // Core Job Data
    const [jobNumber, setJobNumber] = useState('')
    const [customerName, setCustomerName] = useState('')
    const [customerPhone, setCustomerPhone] = useState('')
    const [customerEmail, setCustomerEmail] = useState('')
    const [weight, setWeight] = useState('')
    const [notes, setNotes] = useState('')

    // Scheduling
    const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')

    // Route Template Selection
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
    const { data: routesData } = useRoutes()
    const routes = routesData?.data || []

    // Stops
    const [stops, setStops] = useState<{
        id: string,
        address: string,
        lat?: number,
        lng?: number,
        type: 'pickup' | 'dropoff' | 'waypoint',
        notes: string
    }[]>([
        { id: '1', address: '', type: 'pickup', notes: '' },
        { id: '2', address: '', type: 'dropoff', notes: '' }
    ])

    const resetForm = () => {
        setJobNumber('')
        setCustomerName('')
        setCustomerPhone('')
        setCustomerEmail('')
        setWeight('')
        setNotes('')
        setPriority('normal')
        setSelectedRouteId(null)
        setStops([
            { id: '1', address: '', type: 'pickup', notes: '' },
            { id: '2', address: '', type: 'dropoff', notes: '' }
        ])
        setActiveTab('details')
    }

    // Handle route template selection - auto-fill stops from route
    const handleSelectRoute = (routeId: string) => {
        if (routeId === 'none') {
            setSelectedRouteId(null)
            return
        }

        const route = routes.find((r: Route) => r.id === routeId)
        if (!route) return

        setSelectedRouteId(routeId)

        // Build stops array from route
        const newStops: typeof stops = []

        // 1. Add origin as first stop (pickup)
        const origin = route.origin as { address?: string; lat?: number; lng?: number } | null
        if (origin?.address) {
            newStops.push({
                id: crypto.randomUUID(),
                address: origin.address,
                lat: origin.lat,
                lng: origin.lng,
                type: 'pickup',
                notes: ''
            })
        }

        // 2. Add waypoints
        const waypoints = route.waypoints as { address?: string; lat?: number; lng?: number }[] | null
        if (waypoints && Array.isArray(waypoints)) {
            waypoints.forEach(wp => {
                if (wp.address) {
                    newStops.push({
                        id: crypto.randomUUID(),
                        address: wp.address,
                        lat: wp.lat,
                        lng: wp.lng,
                        type: 'waypoint',
                        notes: ''
                    })
                }
            })
        }

        // 3. Add destination as last stop (dropoff)
        const destination = route.destination as { address?: string; lat?: number; lng?: number } | null
        if (destination?.address) {
            newStops.push({
                id: crypto.randomUUID(),
                address: destination.address,
                lat: destination.lat,
                lng: destination.lng,
                type: 'dropoff',
                notes: ''
            })
        }

        if (newStops.length >= 2) {
            setStops(newStops)
            toast.success(`Loaded ${newStops.length} stops from "${route.name || 'Route'}"`, {
                description: 'You can now add scheduling times to each stop'
            })
        } else {
            toast.error('Route does not have enough stops')
        }
    }

    const addStop = () => {
        setStops([...stops, { id: Math.random().toString(), address: '', type: 'dropoff', notes: '' }])
    }

    const removeStop = (id: string) => {
        if (stops.length <= 1) return
        setStops(stops.filter(s => s.id !== id))
    }

    const updateStop = (id: string, field: string, value: any) => {
        setStops(stops.map(s => s.id === id ? { ...s, [field]: value } : s))
    }

    const updateStopLocation = (id: string, address: string, coords?: { lat: number, lng: number }) => {
        setStops(stops.map(s => s.id === id ? {
            ...s,
            address,
            lat: coords?.lat,
            lng: coords?.lng
        } : s))
    }

    const handleSave = async () => {
        // Validation
        if (!customerName.trim()) {
            toast.error('Customer name is required')
            setActiveTab('details')
            return
        }

        const validStops = stops.filter(s => s.address.trim())
        if (validStops.length < 2) {
            toast.error('At least 2 stops with addresses are required')
            setActiveTab('route')
            return
        }

        // Validate stop time sequence
        for (let i = 1; i < validStops.length; i++) {
            const validation = validateStopSequence(validStops[i], validStops[i - 1])
            if (!validation.isValid) {
                toast.error(`Stop ${i + 1} has invalid timing: ${validation.message}`)
                setActiveTab('route')
                return
            }
        }

        // Validate window end >= window start for each stop
        for (let i = 0; i < validStops.length; i++) {
            const windowValidation = validateWindowEndAfterStart(validStops[i])
            if (!windowValidation.isValid) {
                toast.error(`Stop ${i + 1}: Window End must be after Window Start`)
                setActiveTab('route')
                return
            }
        }

        // Derive legacy schedule from first stop for backward compatibility
        let legacyDate: string | null = null
        let legacyTime: string | null = null

        if (validStops.length > 0) {
            const firstStop = validStops[0] as any
            // Use window_start if window mode, else scheduled_arrival
            const startTime = firstStop.arrival_mode === 'window'
                ? firstStop.window_start
                : firstStop.scheduled_arrival

            if (startTime) {
                // Extract YYYY-MM-DD and HH:mm:ss from ISO string
                const dateObj = new Date(startTime)
                if (!isNaN(dateObj.getTime())) {
                    legacyDate = dateObj.toISOString().split('T')[0]
                    legacyTime = dateObj.toLocaleTimeString('en-GB', { hour12: false }) // HH:mm:ss
                }
            }
        }

        // Build the input for the API
        const input: CreateJobWithStopsInput = {
            job: {
                job_number: jobNumber || `JOB-${Date.now().toString(36).toUpperCase()}`,
                customer_name: customerName,
                customer_phone: customerPhone || null,
                customer_email: customerEmail || null,
                scheduled_date: legacyDate, // derived
                scheduled_time: legacyTime, // derived
                priority: priority,
                status: 'pending',
                notes: notes || null,
                weight: weight ? parseFloat(weight) : null,
                route_id: selectedRouteId || null,
            },
            stops: validStops.map((stop, index) => ({
                sequence_order: index + 1,
                type: stop.type,
                address: stop.address,
                latitude: stop.lat || null,
                longitude: stop.lng || null,
                notes: stop.notes || null,
                scheduled_time: null, // Legacy field, we use sched_arrival now
                service_duration: (stop as any).service_duration || 0,
                arrival_mode: (stop as any).arrival_mode || 'fixed',
                scheduled_arrival: (stop as any).scheduled_arrival || null,
                window_start: (stop as any).window_start || null,
                window_end: (stop as any).window_end || null
            }))
        }

        try {
            const newJob = await createJobMutation.mutateAsync(input)
            toast.success('Job created successfully!')

            // Call onSave if provided
            if (onSave) onSave(newJob)

            // Reset form
            resetForm()
        } catch (error) {
            console.error('Failed to create job:', error)
            toast.error('Failed to create job. Please try again.')
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="details">Customer & Details</TabsTrigger>
                    <TabsTrigger value="route">Route & Stops</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 outline-none">
                    <Card className="bg-slate-50 border-slate-200 shadow-sm">
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <h3 className="font-semibold text-sm">Customer Information</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Job Number</Label>
                                    <Input
                                        placeholder="Auto-generated"
                                        value={jobNumber}
                                        onChange={e => setJobNumber(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Customer Name *</Label>
                                    <Input
                                        placeholder="Client Name"
                                        value={customerName}
                                        onChange={e => setCustomerName(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <PhoneInput
                                        value={customerPhone}
                                        onChange={setCustomerPhone}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input className="pl-9" placeholder="client@email.com" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-slate-200 shadow-sm">
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <h3 className="font-semibold text-sm">Priority & Notes</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Priority</Label>
                                    <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="urgent">Urgent</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Weight (lbs)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.0"
                                        value={weight}
                                        onChange={e => setWeight(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Notes</Label>
                                <Input
                                    placeholder="Any additional notes..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="route" className="space-y-4 outline-none">
                    {/* Route Template Selector */}
                    {routes.length > 0 && (
                        <Card className="bg-blue-50/70 border-blue-200">
                            <CardContent className="pt-4 pb-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-blue-600" />
                                        <div>
                                            <Label className="text-sm font-medium">Use Saved Route Template</Label>
                                            <p className="text-xs text-muted-foreground">Quick-fill stops from a saved route</p>
                                        </div>
                                    </div>
                                    <Select value={selectedRouteId || 'none'} onValueChange={handleSelectRoute}>
                                        <SelectTrigger className="w-64 bg-white">
                                            <SelectValue placeholder="Select a route..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- No template --</SelectItem>
                                            {routes.map((route: Route) => (
                                                <SelectItem key={route.id} value={route.id}>
                                                    {route.name || 'Unnamed Route'}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <div className="flex justify-between items-center mb-2">
                        <Label className="text-base font-semibold">Route Stops</Label>
                        <Button variant="outline" size="sm" onClick={addStop}>
                            <Plus className="h-4 w-4 mr-2" /> Add Stop
                        </Button>
                    </div>

                    <div className="space-y-4">
                        {stops.map((stop, idx) => {
                            // Get previous stop for validation
                            const prevStop = idx > 0 ? stops[idx - 1] : null
                            const validation = validateStopSequence(stop, prevStop)
                            const windowEndValidation = validateWindowEndAfterStart(stop)

                            // Calculate min date/time from previous stop
                            let minDate: string | undefined
                            let minTime: string | undefined
                            if (prevStop) {
                                const prevEndTime = getStopEndTime(prevStop)
                                if (prevEndTime) {
                                    minDate = prevEndTime.toISOString().split('T')[0]
                                    minTime = prevEndTime.toTimeString().substring(0, 5)
                                }
                            }

                            // For window_end: min is window_start
                            let windowStartDate: string | undefined
                            let windowStartTime: string | undefined
                            if ((stop as any).window_start) {
                                const wsDate = new Date((stop as any).window_start)
                                windowStartDate = wsDate.toISOString().split('T')[0]
                                windowStartTime = wsDate.toTimeString().substring(0, 5)
                            }

                            return (
                                <Card key={stop.id} className={cn(
                                    "bg-white border-slate-200 shadow-sm relative",
                                    !validation.isValid && "border-red-300 bg-red-50/50"
                                )}>
                                    <div className={cn(
                                        "absolute left-0 top-0 bottom-0 w-1.5 rounded-l-md",
                                        stop.type === 'pickup' ? 'bg-green-500' :
                                            stop.type === 'dropoff' ? 'bg-red-500' : 'bg-blue-500'
                                    )} />
                                    <CardContent className="pt-4 pl-6 space-y-3 grid grid-cols-12 gap-x-4">
                                        <div className="col-span-11 space-y-3">
                                            {/* Row 1: Type + Location + Mode */}
                                            <div className="flex gap-2 items-start flex-wrap">
                                                <Select value={stop.type} onValueChange={(val: 'pickup' | 'dropoff' | 'waypoint') => updateStop(stop.id, 'type', val)}>
                                                    <SelectTrigger className="w-28 h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="pickup">Pickup</SelectItem>
                                                        <SelectItem value="waypoint">Waypoint</SelectItem>
                                                        <SelectItem value="dropoff">Dropoff</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <div className="flex-1 min-w-0 max-w-md">
                                                    <LocationPicker
                                                        value={stop.address}
                                                        onChange={(val, coords) => updateStopLocation(stop.id, val, coords)}
                                                        placeholder="Search address..."
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                            </div>

                                            {/* Row 2: Scheduling Mode */}
                                            <div className="flex flex-wrap gap-x-4 gap-y-2 items-end">
                                                <div className="space-y-1">
                                                    <Label className="text-xs text-muted-foreground">Scheduling Mode</Label>
                                                    <Select
                                                        value={(stop as any).arrival_mode || 'fixed'}
                                                        onValueChange={(val) => updateStop(stop.id, 'arrival_mode', val)}
                                                    >
                                                        <SelectTrigger className="w-32 h-7 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="fixed">Fixed Time</SelectItem>
                                                            <SelectItem value="window">Time Window</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Scheduling Inputs - Based on Mode */}
                                                {(() => {
                                                    const mode = (stop as any).arrival_mode || 'fixed'

                                                    if (mode === 'fixed') {
                                                        // Fixed Time mode: single arrival + duration
                                                        return (
                                                            <>
                                                                <div className="space-y-1">
                                                                    <Label className={cn(
                                                                        "text-xs",
                                                                        !validation.isValid ? "text-red-500" : "text-muted-foreground"
                                                                    )}>
                                                                        Scheduled Arrival
                                                                    </Label>
                                                                    <DateTimeInput
                                                                        value={(stop as any).scheduled_arrival}
                                                                        onChange={(val: string) => updateStop(stop.id, 'scheduled_arrival', val)}
                                                                        minDate={minDate}
                                                                        minTime={minTime}
                                                                        hasError={!validation.isValid}
                                                                    />
                                                                    {!validation.isValid && (
                                                                        <p className="text-xs text-red-500">{validation.message}</p>
                                                                    )}
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-xs text-muted-foreground">Duration (min)</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        className="h-7 w-20 text-xs"
                                                                        placeholder="0"
                                                                        value={(stop as any).service_duration || ''}
                                                                        onChange={(e) => updateStop(stop.id, 'service_duration', parseInt(e.target.value) || 0)}
                                                                    />
                                                                </div>
                                                            </>
                                                        )
                                                    } else {
                                                        // Time Window mode: start + end window + duration
                                                        return (
                                                            <div className="flex flex-col gap-2">
                                                                {/* Row 1: Window Start */}
                                                                <div className="flex flex-wrap gap-x-4 gap-y-2 items-end">
                                                                    <div className="space-y-1">
                                                                        <Label className={cn(
                                                                            "text-xs",
                                                                            !validation.isValid ? "text-red-500" : "text-muted-foreground"
                                                                        )}>
                                                                            Window Start
                                                                        </Label>
                                                                        <DateTimeInput
                                                                            value={(stop as any).window_start}
                                                                            onChange={(val: string) => updateStop(stop.id, 'window_start', val)}
                                                                            minDate={minDate}
                                                                            minTime={minTime}
                                                                            hasError={!validation.isValid}
                                                                        />
                                                                        {!validation.isValid && (
                                                                            <p className="text-xs text-red-500">{validation.message}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {/* Row 2: Window End + Duration */}
                                                                <div className="flex flex-wrap gap-x-4 gap-y-2 items-end">
                                                                    <div className="space-y-1">
                                                                        <Label className={cn(
                                                                            "text-xs",
                                                                            !windowEndValidation.isValid ? "text-red-500" : "text-muted-foreground"
                                                                        )}>
                                                                            Window End
                                                                        </Label>
                                                                        <DateTimeInput
                                                                            value={(stop as any).window_end}
                                                                            onChange={(val: string) => updateStop(stop.id, 'window_end', val)}
                                                                            minDate={windowStartDate}
                                                                            minTime={windowStartTime}
                                                                            hasError={!windowEndValidation.isValid}
                                                                        />
                                                                        {!windowEndValidation.isValid && (
                                                                            <p className="text-xs text-red-500">{windowEndValidation.message}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <Label className="text-xs text-muted-foreground">Duration (min)</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min="0"
                                                                            className="h-7 w-20 text-xs"
                                                                            placeholder="0"
                                                                            value={(stop as any).service_duration || ''}
                                                                            onChange={(e) => updateStop(stop.id, 'service_duration', parseInt(e.target.value) || 0)}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    }
                                                })()}
                                            </div>

                                            <div className="flex-1">
                                                <Input
                                                    placeholder="Notes (e.g. Gate Code, Contact Person)"
                                                    className="text-xs h-8 mt-2"
                                                    value={stop.notes}
                                                    onChange={(e) => updateStop(stop.id, 'notes', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-span-1 pt-1 flex justify-end">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => removeStop(stop.id)}
                                                disabled={stops.length <= 2}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Footer Actions */}
            <div className={cn(
                "flex justify-between",
                variant === 'page' ? "pt-4 border-t" : "p-4 border-t bg-slate-50"
            )}>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <div className="flex gap-2">
                    {activeTab === 'details' ? (
                        <Button type="button" onClick={() => setActiveTab('route')}>
                            Next: Route Details
                        </Button>
                    ) : (
                        <>
                            <Button type="button" variant="outline" onClick={() => setActiveTab('details')}>
                                Back
                            </Button>
                            <Button
                                onClick={handleSave}
                                disabled={createJobMutation.isPending}
                            >
                                {createJobMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Job'
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
