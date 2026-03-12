'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Plus, List, GripVertical, FileText, ChevronRight, X, Clock, Calendar, User, Mail, DollarSign, Trash2, Loader2 } from 'lucide-react'
import { PhoneInput } from '@/components/ui/phone-input'

import { LocationPicker } from '@/components/ui/LocationPicker'
import { JobRouteMap } from '@/components/jobs/JobRouteMap'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCreateJobWithStops, useUpdateJobWithStops, CreateJobWithStopsInput, JobWithRelations } from '@/hooks/useJobs'
import { useRoutes } from '@/hooks/useRoutes'
import { useCustomers } from '@/hooks/useCustomers'
import { useCompanySettings } from '@/hooks/useCompanySettings'
import { useSaveCostEstimate, calculateJobCosts } from '@/hooks/useCostEstimates'
import { Route, Customer } from '@/types/database'
import { toast } from 'sonner'
import { cn, formatLocalISODate } from '@/lib/utils'

/**
 * Helper: Convert local ISO string (e.g. 2024-03-12T14:00) 
 * into full UTC ISO string for DB storage.
 */
function toUTCISO(localStr: string | null | undefined): string | null {
    if (!localStr) return null
    const date = new Date(localStr)
    return isNaN(date.getTime()) ? null : date.toISOString()
}

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
            return formatLocalISODate(stop.window_start)
        }
    } else {
        if (stop.scheduled_arrival) {
            return formatLocalISODate(stop.scheduled_arrival)
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

    // Rule 2 has been removed to allow for overlapping Time Windows logically found in standard routing scenarios.

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
        const dateToUse = dateVal || formatLocalISODate(new Date())
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
    initialData?: JobWithRelations
    isEditing?: boolean
}

export function JobCreationContent({ onSave, onCancel, variant = 'page', initialData, isEditing = false }: JobCreationContentProps) {
    const [activeTab, setActiveTab] = useState('details')

    // Use the new hook for creating jobs with stops
    const createJobMutation = useCreateJobWithStops()
    const updateJobMutation = useUpdateJobWithStops()
    const saveCostMutation = useSaveCostEstimate()

    // --- Cost Estimation State ---
    const [distanceMeters, setDistanceMeters] = useState(0)
    const [fuelPrice, setFuelPrice] = useState('4.50') // Default fallback
    const [plannedTolls, setPlannedTolls] = useState('0.00')
    const [totalEstimatedCost, setTotalEstimatedCost] = useState(0)

    // Calculate live estimate whenever distance or prices change
    useEffect(() => {
        const miles = distanceMeters / 1609.34
        const fPrice = parseFloat(fuelPrice) || 0
        const tCost = parseFloat(plannedTolls) || 0
        
        // Use a default efficiency of 10 mpg for now
        const estimatedFuelCost = (miles / 10) * fPrice
        setTotalEstimatedCost(estimatedFuelCost + tCost)
    }, [distanceMeters, fuelPrice, plannedTolls])

    // Core Job Data
    const [jobNumber, setJobNumber] = useState(initialData?.job_number || '')
    const [customerId, setCustomerId] = useState<string | null>(initialData?.customer_id || null)
    const [customerName, setCustomerName] = useState(initialData?.customer_name || initialData?.customers?.name || '')
    const [customerPhone, setCustomerPhone] = useState(initialData?.customer_phone || initialData?.customers?.phone || '')
    const [customerEmail, setCustomerEmail] = useState(initialData?.customer_email || initialData?.customers?.email || '')
    const [weight, setWeight] = useState(initialData?.weight?.toString() || '')
    const [notes, setNotes] = useState(initialData?.notes || '')

    // Customer search state
    const { customers, isLoading: isCustomersLoading, fetchCustomers, createCustomer } = useCustomers()
    const [custSelectOpen, setCustSelectOpen] = useState(false)
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false)
    const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
    // Separate state for New Customer form - isolated from selected customer
    const [newCustName, setNewCustName] = useState('')
    const [newCustPhone, setNewCustPhone] = useState('')
    const [newCustEmail, setNewCustEmail] = useState('')

    // Company Settings Defaults
    const { data: settings } = useCompanySettings()

    // Fetch customers on mount
    useEffect(() => {
        fetchCustomers()
    }, [])

    // Scheduling
    const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>((initialData?.priority as any) || 'normal')

    // Pricing & Revenue
    const [billingType, setBillingType] = useState<'flat_rate' | 'per_mile' | 'per_weight' | 'hourly'>(
        (initialData?.billing_type as any) || 'flat_rate'
    )

    // Set defaults from DB settings once they load (if creating new)
    useEffect(() => {
        if (!isEditing && !initialData && settings) {
            if (settings.defaultPriority) setPriority(settings.defaultPriority)
            if (settings.defaultBillingType) setBillingType(settings.defaultBillingType)
            // if you need other defaults in the future they go here
        }
    }, [settings, isEditing, initialData])
    const [revenue, setRevenue] = useState(initialData?.revenue?.toString() || '')
    const [driverPayOverride, setDriverPayOverride] = useState(initialData?.driver_pay_rate_override?.toString() || '')

    // Route Template Selection
    const [selectedRouteId, setSelectedRouteId] = useState<string | null>(initialData?.route_id || null)
    const { data: routesData } = useRoutes()
    const routes = routesData?.data || []

    // Stops
    const [stops, setStops] = useState<{
        id: string,
        address: string,
        lat?: number,
        lng?: number,
        type: 'pickup' | 'dropoff' | 'waypoint',
        notes: string,
        location_name: string,
        // Schedule fields
        arrival_mode?: 'fixed' | 'window',
        scheduled_arrival?: string,
        window_start?: string,
        window_end?: string,
        service_duration?: number
    }[]>(() => {
        if (initialData?.job_stops && initialData.job_stops.length > 0) {
            return initialData.job_stops.map(s => ({
                id: s.id,
                address: s.address,
                lat: s.latitude || undefined,
                lng: s.longitude || undefined,
                type: s.type,
                notes: s.notes || '',
                location_name: s.location_name || '',
                arrival_mode: (s.arrival_mode as any) || 'fixed',
                scheduled_arrival: s.scheduled_arrival || undefined,
                window_start: s.window_start || undefined,
                window_end: s.window_end || undefined,
                service_duration: s.service_duration || 0
            }))
        }
        return [
            { id: '1', address: '', type: 'pickup' as const, notes: '', location_name: '' },
            { id: '2', address: '', type: 'dropoff' as const, notes: '', location_name: '' }
        ]
    })

    const resetForm = () => {
        setJobNumber('')
        setCustomerId(null)
        setCustomerName('')
        setCustomerPhone('')
        setCustomerEmail('')
        setWeight('')
        setNotes('')
        setPriority('normal')
        setSelectedRouteId(null)
        setStops([
            { id: '1', address: '', type: 'pickup' as const, notes: '', location_name: '' },
            { id: '2', address: '', type: 'dropoff' as const, notes: '', location_name: '' }
        ])
        setDistanceMeters(0)
        setFuelPrice('4.50')
        setPlannedTolls('0.00')
        setTotalEstimatedCost(0)
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
                notes: '',
                location_name: ''
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
                        notes: '',
                        location_name: ''
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
                notes: '',
                location_name: ''
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
        setStops([...stops, { id: Math.random().toString(), address: '', type: 'dropoff', notes: '', location_name: '' }])
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
                // Extract YYYY-MM-DD safely
                const dateObj = new Date(startTime)
                if (!isNaN(dateObj.getTime())) {
                    legacyDate = formatLocalISODate(dateObj)
                    legacyTime = dateObj.toLocaleTimeString('en-GB', { hour12: false }) // HH:mm:ss
                }
            }
        }

        // Build the input for the API
        const input: CreateJobWithStopsInput = {
            job: {
                job_number: jobNumber || `JOB-${Date.now().toString(36).toUpperCase()}`,
                customer_id: customerId,
                scheduled_date: legacyDate, // derived
                scheduled_time: legacyTime, // derived
                priority: priority,
                status: 'pending',
                notes: notes || null,
                weight: weight ? parseFloat(weight) : null,
                route_id: selectedRouteId || null,
                billing_type: billingType,
                revenue: revenue ? parseFloat(revenue) : null,
                driver_pay_rate_override: driverPayOverride ? parseFloat(driverPayOverride) : null,
            },
            stops: validStops.map((stop, index) => ({
                sequence_order: index + 1,
                type: stop.type,
                address: stop.address,
                latitude: stop.lat || null,
                longitude: stop.lng || null,
                notes: stop.notes || null,
                location_name: stop.location_name || null,
                scheduled_time: null, // Legacy field, we use sched_arrival now
                service_duration: (stop as any).service_duration || 0,
                arrival_mode: (stop as any).arrival_mode || 'fixed',
                scheduled_arrival: toUTCISO((stop as any).scheduled_arrival),
                window_start: toUTCISO((stop as any).window_start),
                window_end: toUTCISO((stop as any).window_end)
            }))
        }

        try {
            if (isEditing && initialData) {
                // Update existing job
                const updatedJob = await updateJobMutation.mutateAsync({
                    id: initialData.id,
                    job: input.job,
                    stops: input.stops
                })

                // Save/Update the cost estimate record
                await saveCostMutation.mutateAsync({
                    job_id: initialData.id,
                    distance_km: distanceMeters / 1000,
                    fuel_price_per_liter: parseFloat(fuelPrice), // We are treating gal as L for matching DB field for now
                    fuel_cost: (distanceMeters / 1609.34 / 10) * parseFloat(fuelPrice),
                    toll_cost: parseFloat(plannedTolls),
                    total_cost: totalEstimatedCost,
                    status: 'estimate'
                })

                toast.success('Job updated successfully!')
                if (onSave) onSave(updatedJob)
            } else {
                // Create new job
                const newJob = await createJobMutation.mutateAsync(input)

                // Save the cost estimate record for the new job
                await saveCostMutation.mutateAsync({
                    job_id: newJob.id,
                    distance_km: distanceMeters / 1000,
                    fuel_price_per_liter: parseFloat(fuelPrice),
                    fuel_cost: (distanceMeters / 1609.34 / 10) * parseFloat(fuelPrice),
                    toll_cost: parseFloat(plannedTolls),
                    total_cost: totalEstimatedCost,
                    status: 'estimate'
                })

                toast.success('Job created successfully!')
                if (onSave) onSave(newJob)
                resetForm()
            }
        } catch (error) {
            console.error('Failed to save job:', error)
            toast.error(isEditing ? 'Failed to update job.' : 'Failed to create job.')
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
                            <div>
                                <div className="space-y-2">
                                    <Label>Customer *</Label>
                                    <div className="flex gap-2">
                                        {/* Searchable customer combobox */}
                                        <Popover open={custSelectOpen} onOpenChange={setCustSelectOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn('flex-1 justify-between font-normal', !customerId && 'text-muted-foreground')}
                                                >
                                                    {customerName || (isCustomersLoading ? 'Loading...' : 'Select a customer...')}
                                                    <Plus className="ml-2 h-3.5 w-3.5 opacity-40 rotate-45" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[300px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Search customers..." />
                                                    <CommandList>
                                                        <CommandEmpty>
                                                            <p className="text-xs text-center text-muted-foreground py-2">No customers found</p>
                                                        </CommandEmpty>
                                                        <CommandGroup>
                                                            {customers.map(c => (
                                                                <CommandItem
                                                                    key={c.id}
                                                                    value={c.name}
                                                                    onSelect={() => {
                                                                        setCustomerId(c.id)
                                                                        setCustomerName(c.name)
                                                                        setCustomerPhone(c.phone || '')
                                                                        setCustomerEmail(c.email || '')
                                                                        setCustSelectOpen(false)
                                                                    }}
                                                                >
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium text-sm">{c.name}</span>
                                                                        {(c.phone || c.email) && (
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {c.phone}{c.phone && c.email ? ' · ' : ''}{c.email}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>

                                        {/* New Customer button + popover form */}
                                        <Popover
                                            open={customerDropdownOpen}
                                            onOpenChange={(open) => {
                                                setCustomerDropdownOpen(open)
                                                if (open) {
                                                    // Clear new customer form when opening
                                                    setNewCustName('')
                                                    setNewCustPhone('')
                                                    setNewCustEmail('')
                                                }
                                            }}
                                        >
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="icon" className="shrink-0 h-10 w-10" title="Add new customer">
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80 p-4" align="end">
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="font-semibold text-sm">New Customer</h4>
                                                        <p className="text-xs text-muted-foreground">Fill in the customer details</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Name *</Label>
                                                        <Input
                                                            placeholder="Full name or company"
                                                            value={newCustName}
                                                            onChange={e => setNewCustName(e.target.value)}
                                                            autoFocus
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Phone</Label>
                                                        <PhoneInput value={newCustPhone} onChange={setNewCustPhone} />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Email</Label>
                                                        <div className="relative">
                                                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                            <Input
                                                                className="pl-9"
                                                                type="email"
                                                                placeholder="client@email.com"
                                                                value={newCustEmail}
                                                                onChange={e => setNewCustEmail(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <Button
                                                        className="w-full"
                                                        size="sm"
                                                        disabled={isCreatingCustomer || !newCustName.trim()}
                                                        onClick={async () => {
                                                            setIsCreatingCustomer(true)
                                                            const newCustomer = await createCustomer({
                                                                name: newCustName.trim(),
                                                                phone: newCustPhone || undefined,
                                                                email: newCustEmail || undefined,
                                                            })
                                                            if (newCustomer) {
                                                                setCustomerId(newCustomer.id)
                                                                setCustomerName(newCustomer.name)
                                                                setCustomerPhone(newCustomer.phone || '')
                                                                setCustomerEmail(newCustomer.email || '')
                                                                setCustomerDropdownOpen(false)
                                                            }
                                                            setIsCreatingCustomer(false)
                                                        }}
                                                    >
                                                        {isCreatingCustomer
                                                            ? <><Loader2 className="h-3 w-3 mr-2 animate-spin" />Saving...</>
                                                            : <><Plus className="h-3 w-3 mr-2" />Save Customer</>
                                                        }
                                                    </Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {/* Show selected customer contact info */}
                                    {customerId && (customerPhone || customerEmail) && (
                                        <div className="flex gap-3 text-xs text-muted-foreground">
                                            {customerPhone && <span>📞 {customerPhone}</span>}
                                            {customerEmail && <span>✉️ {customerEmail}</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-slate-50 border-slate-200 shadow-sm">
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <h3 className="font-semibold text-sm">Pricing & Revenue</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Billing Type</Label>
                                    <Select value={billingType} onValueChange={(v) => setBillingType(v as any)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="flat_rate">Flat Rate</SelectItem>
                                            <SelectItem value="per_mile">Per Mile</SelectItem>
                                            <SelectItem value="hourly">Hourly</SelectItem>
                                            <SelectItem value="per_weight">Per Weight</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Revenue / Charge ($)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={revenue}
                                        onChange={e => setRevenue(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">What the customer pays</p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-slate-200/60 mt-2">
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground">Driver Pay Override (Optional)</Label>
                                    <Input
                                        type="number"
                                        placeholder="Driver base rate will be used if empty"
                                        value={driverPayOverride}
                                        onChange={e => setDriverPayOverride(e.target.value)}
                                    />
                                    <p className="text-[10px] text-muted-foreground">Custom rate just for this job</p>
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
                                                <Input
                                                    placeholder="Location Name (e.g. Downtown LA)"
                                                    className="w-44 h-8 text-xs"
                                                    value={stop.location_name}
                                                    onChange={(e) => updateStop(stop.id, 'location_name', e.target.value)}
                                                />
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

                    {/* Map Preview */}
                    {(() => {
                        const stopsWithCoords = stops.filter(s => s.lat && s.lng)
                        if (stopsWithCoords.length < 2) return null

                        const pickupStop = stopsWithCoords.find(s => s.type === 'pickup')
                        const dropoffStop = [...stopsWithCoords].reverse().find(s => s.type === 'dropoff')
                        const waypointStops = stopsWithCoords
                            .filter(s => s !== pickupStop && s !== dropoffStop)
                            .map((s, i) => ({
                                lat: s.lat!,
                                lng: s.lng!,
                                type: s.type as 'pickup' | 'dropoff' | 'waypoint',
                                sequence: i + 2,
                                address: s.address
                            }))

                        return (
                            <Card className="overflow-hidden border-slate-200 shadow-sm">
                                <div className="px-4 py-2 bg-slate-50 border-b flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm font-medium">Route Preview</span>
                                    <span className="text-xs text-muted-foreground ml-auto">{stopsWithCoords.length} stops mapped</span>
                                </div>
                                <div className="h-[300px]">
                                    <JobRouteMap
                                        pickup={pickupStop ? { lat: pickupStop.lat!, lng: pickupStop.lng!, address: pickupStop.address } : undefined}
                                        delivery={dropoffStop ? { lat: dropoffStop.lat!, lng: dropoffStop.lng!, address: dropoffStop.address } : undefined}
                                        waypoints={waypointStops}
                                        onDistanceChange={setDistanceMeters}
                                    />
                                </div>
                            </Card>
                        )
                    })()}

                    {/* Cost Estimation Card */}
                    <Card className="bg-slate-50 border-slate-200 shadow-sm mt-6">
                        <CardHeader className="pb-3 border-b bg-white/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-green-600" />
                                    <CardTitle className="text-sm font-semibold">Cost Estimation</CardTitle>
                                </div>
                                <Badge variant="outline" className="bg-white text-[10px] py-0 px-2">
                                    Planned vs Actual
                                </Badge>
                            </div>
                            <CardDescription className="text-[11px] mt-1">
                                Estimate trip costs based on route distance and manual price overrides.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Route Distance</Label>
                                <div className="h-9 px-3 flex items-center bg-white border rounded-md text-sm font-semibold text-slate-700">
                                    {(distanceMeters / 1609.34).toFixed(1)} miles
                                </div>
                                <p className="text-[10px] text-muted-foreground italic">Calculated and fetched from map</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Fuel Price ($/gal)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                                    <Input 
                                        type="number" 
                                        step="0.01"
                                        className="pl-7 h-9 text-sm"
                                        value={fuelPrice}
                                        onChange={(e) => setFuelPrice(e.target.value)}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground italic">Override avg. price used for estimates</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Planned Tolls ($)</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                                    <Input 
                                        type="number" 
                                        step="0.01"
                                        className="pl-7 h-9 text-sm"
                                        value={plannedTolls}
                                        onChange={(e) => setPlannedTolls(e.target.value)}
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground italic">Enter projected toll expenses ($)</p>
                            </div>
                        </CardContent>
                        <div className="px-6 py-3 bg-white/50 border-t flex justify-between items-center rounded-b-xl">
                            <span className="text-sm font-medium text-slate-600">Total Estimated Cost:</span>
                            <span className="text-lg font-bold text-green-700">
                                ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(
                                    ((distanceMeters / 1609.34) / 10) * Number(fuelPrice) + Number(plannedTolls)
                                )}
                            </span>
                        </div>
                    </Card>
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
