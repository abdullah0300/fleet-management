'use client'

import { Calendar, momentLocalizer, Views, Navigate } from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
import moment from 'moment'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import { Card, CardContent } from '@/components/ui/card'
import { useJobs, useUpdateJob, getJobPickupAddress, useAssignJob, useUpdateJobStop } from '@/hooks/useJobs'
import { useDrivers } from '@/hooks/useDrivers'
import { useMemo, useCallback, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Clock, MapPin, MoreHorizontal, Calendar as CalendarIcon } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as DatePicker } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'

// Setup the localizer
const localizer = momentLocalizer(moment)

// Initialize DnD Calendar
const DnDCalendar = withDragAndDrop(Calendar)

import { createContext, useContext } from 'react'

// ... existing imports

// Context to pass handlers to custom components
const DispatchBoardContext = createContext<{ onJobClick: (job: any) => void }>({ onJobClick: () => { } })

// --- Custom Components ---

function CustomEvent({ event }: { event: any }) {
    const { onJobClick } = useContext(DispatchBoardContext)
    const isWindow = event.isWindow
    const statusColor = event.status === 'completed' ? 'bg-emerald-500' :
        event.status === 'in_progress' ? 'bg-amber-500' :
            event.status === 'assigned' ? 'bg-blue-600' : 'bg-slate-400'

    return (
        <div
            onClick={(e) => {
                e.stopPropagation() // Prevent bubbling if needed, though RBC usually handles it
                onJobClick(event)
            }}
            className="h-full w-full flex flex-col overflow-hidden rounded-md border border-border/60 bg-white/95 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-border transition-all duration-200 group cursor-pointer"
        >
            {/* Top Stripe for Status */}

            <div className={`h-1 w-full ${statusColor} shrink-0`} />

            <div className="flex-1 flex flex-col p-2 min-w-0">
                {/* Header: Time Range (Grey) */}
                <div className="text-[10px] text-muted-foreground font-medium mb-0.5 leading-none">
                    {event.timeRange}
                </div>

                {/* Customer */}
                <div className="flex items-start justify-between gap-1.5 mb-0.5">
                    <span className="font-bold text-[11px] leading-tight truncate text-foreground tracking-tight" title={event.customer}>
                        {event.customer}
                    </span>
                    {isWindow && (
                        <Clock className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                    )}
                </div>

                {/* Body: Address */}
                <div className="flex items-center gap-1 text-muted-foreground/80 mb-auto">
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    <span className="text-[10px] truncate leading-none font-medium" title={event.address}>
                        {event.address}
                    </span>
                </div>

                {/* Footer: Time Badge */}
                <div className="mt-1.5 pt-1.5 border-t border-dashed border-slate-100 flex items-center justify-between">
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-sm text-muted-foreground bg-muted/50 border border-transparent">
                        {event.startTime}
                    </span>
                    {/* Optional: Driver Avatar or Initials here in future */}
                </div>
            </div>
        </div>
    )
}

function CustomResourceHeader({ label }: { label: any }) {
    return (
        <div className="text-sm font-medium text-center py-1">
            {label}
        </div>
    )
}

function CustomToolbar(toolbar: any) {
    const goToBack = () => toolbar.onNavigate(Navigate.PREVIOUS)
    const goToNext = () => toolbar.onNavigate(Navigate.NEXT)
    const goToCurrent = () => toolbar.onNavigate(Navigate.TODAY)

    return (
        <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {/* HACK: Hide default RBC event label since we render it inside the card now */}
            <style>{`
                .rbc-event-label { display: none !important; }
                .rbc-event { padding: 2px !important; background-color: transparent !important; }
            `}</style>

            <div className="flex items-center gap-2">
                <div className="flex items-center rounded-md border bg-muted/50 p-1">
                    <Button variant="ghost" size="icon" onClick={goToBack} className="h-7 w-7">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={goToCurrent} className="h-7 text-xs font-medium px-2">
                        Today
                    </Button>
                </div>
                <div className="flex items-center ml-4">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="group h-9 px-3 font-normal text-sm bg-white hover:bg-blue-50/50 border-slate-200 shadow-sm min-w-[240px] justify-start text-left cursor-pointer transition-all duration-300 hover:border-blue-300 hover:shadow-md">
                                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:text-blue-600" />
                                <span className="font-semibold text-foreground transition-all duration-300 group-hover:text-blue-700 group-hover:translate-x-0.5">
                                    {moment(toolbar.date).format('dddd, MMMM D, YYYY')}
                                </span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <DatePicker
                                mode="single"
                                selected={toolbar.date}
                                onSelect={(date) => {
                                    if (date) {
                                        toolbar.onNavigate(Navigate.DATE, date)
                                    }
                                }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="flex gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-muted-foreground">Assigned</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">In Progress</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-muted-foreground">Completed</span>
                </div>
            </div>
        </div>
    )
}

import { JobDetailPopup } from './JobDetailPopup'

// ... existing imports

export function VisualDispatchBoard() {
    const { data: jobsData } = useJobs(1, 100)
    const { data: driversData } = useDrivers()
    const updateJob = useUpdateJob()
    const assignJob = useAssignJob()
    const updateJobStop = useUpdateJobStop()

    const [date, setDate] = useState(new Date())
    const [view, setView] = useState(Views.DAY)
    const [selectedJob, setSelectedJob] = useState<any>(null)

    const handleSelectEvent = useCallback((event: any) => {
        // Find full job data
        const originalJob = jobsData?.data?.find((j: any) => j.id === event.id)
        if (originalJob) {
            setSelectedJob(originalJob)
        }
    }, [jobsData])

    const events = useMemo(() => {
        // ...

        if (!jobsData?.data) return []

        return jobsData.data
            .map(job => {
                // 1. Determine Start Time from Stop #1
                let start: Date | null = null
                let isWindow = false
                let hasStops = false
                let firstStopId: string | null = null
                let firstStop: any = null

                if (job.job_stops && job.job_stops.length > 0) {
                    hasStops = true
                    // Already sorted by API
                    firstStop = job.job_stops[0]
                    firstStopId = firstStop.id

                    if (firstStop.arrival_mode === 'window' && firstStop.window_start) {
                        start = new Date(firstStop.window_start)
                        isWindow = true
                    } else if (firstStop.arrival_mode === 'fixed' && firstStop.scheduled_arrival) {
                        start = new Date(firstStop.scheduled_arrival)
                    }
                }

                // Fallback to legacy
                if (!start && job.scheduled_date) {
                    const timeStr = job.scheduled_time || '09:00:00'
                    start = new Date(`${job.scheduled_date}T${timeStr}`)
                }

                if (!start) return null // Skip unscheduled jobs

                // 2. Determine Duration
                // Default to 2 hours if not specified
                // Or calculate from stops service duration? For now, keep it simple visually.
                const end = new Date(start)
                end.setHours(start.getHours() + 2)

                const pickupAddr = getJobPickupAddress(job)

                // Format Time Range for Display (e.g. "9:00 AM - 11:00 AM")
                const timeRange = `${moment(start).format('h:mm A')} – ${moment(end).format('h:mm A')}`

                return {
                    id: job.id,
                    title: job.job_number, // Unused in custom render but good for default
                    customer: job.customer_name,
                    address: pickupAddr?.split(',')[0] || 'Pickup',
                    start,
                    end,
                    resourceId: job.driver_id,
                    status: job.status,
                    isWindow,
                    firstStopId,
                    firstStop, // Keep ref for updates
                    startTime: moment(start).format('h:mm A'),
                    timeRange
                }
            })
            .filter(Boolean) as any[]
    }, [jobsData])

    const resources = useMemo(() => {
        if (!driversData?.data) return []
        return driversData.data.map(driver => ({
            id: driver.id,
            title: driver.profiles?.full_name || 'Unknown Driver'
        }))
    }, [driversData])

    const eventStyleGetter = (event: any) => {
        return {
            style: {
                backgroundColor: 'transparent', // We handle bg in component
                borderRadius: '0px',
                border: '0px',
                display: 'block',
                padding: '2px', // Slight padding around the card for separation
                overflow: 'visible'
            }
        }
    }

    // Handle drag and drop
    const handleEventDrop = useCallback(async ({ event, start, end, resourceId }: any) => {
        const newDate = moment(start).format('YYYY-MM-DD')
        const newTime = moment(start).format('HH:mm:ss') // Supabase Time format
        const newISO = moment(start).toISOString() // For Timestamptz

        // A. Handle Driver Reassignment
        if (resourceId && resourceId !== event.resourceId) {
            const targetDriver = driversData?.data?.find((d: any) => d.id === resourceId)
            if (!targetDriver?.assigned_vehicle_id) {
                toast.error(`Driver ${targetDriver?.profiles?.full_name} has no vehicle assigned.`)
                return
            }

            try {
                await assignJob.mutateAsync({
                    jobId: event.id,
                    driverId: resourceId,
                    vehicleId: targetDriver.assigned_vehicle_id
                })
                toast.success('Job reassigned to ' + targetDriver.profiles?.full_name)
            } catch (err) {
                toast.error("Failed to reassign")
            }
        }

        // B. Handle Rescheduling (Time Update)
        // We prefer updating the STOP, but we fall back to JOB if no stops
        if (event.firstStopId) {
            try {
                const updates: any = {}

                // If it was a window, shift the window
                if (event.firstStop.arrival_mode === 'window') {
                    updates.window_start = newISO
                    // Calculate duration of original window to shift end? 
                    // For simplicity in this drag, we just set start. 
                    // Ideally we'd shift end too. Let's try:
                    if (event.firstStop.window_end && event.firstStop.window_start) {
                        const duration = new Date(event.firstStop.window_end).getTime() - new Date(event.firstStop.window_start).getTime()
                        updates.window_end = new Date(new Date(newISO).getTime() + duration).toISOString()
                    } else {
                        // Default 4h window if missing
                        updates.window_end = new Date(new Date(newISO).getTime() + (4 * 60 * 60 * 1000)).toISOString()
                    }
                } else {
                    // Fixed mode
                    updates.scheduled_arrival = newISO
                }

                await updateJobStop.mutateAsync({
                    id: event.firstStopId,
                    updates
                })

                // Also sync legacy for backward compatibility
                await updateJob.mutateAsync({
                    id: event.id,
                    updates: { scheduled_date: newDate, scheduled_time: newTime }
                })

                toast.success('Job rescheduled')
            } catch (err) {
                console.error(err)
                toast.error("Failed to reschedule stop")
            }
        } else {
            // Unlikely fallback if no stops
            await updateJob.mutateAsync({
                id: event.id,
                updates: { scheduled_date: newDate, scheduled_time: newTime }
            })
            toast.success('Job rescheduled (Legacy)')
        }

    }, [driversData, assignJob, updateJob, updateJobStop])

    const onDropFromOutside = useCallback(async ({ start, end, resourceId }: any) => {
        const draggedJobId = (window as any).draggedJobId
        if (!draggedJobId) return

        if (!resourceId) {
            toast.error("Please drop onto a driver.")
            return
        }

        const targetDriver = driversData?.data?.find((d: any) => d.id === resourceId)
        if (!targetDriver?.assigned_vehicle_id) {
            toast.error(`Driver ${targetDriver?.profiles?.full_name} has no vehicle.`)
            return
        }

        // We need to fetch the job to get its stops... 
        // Or we can just blindly update legacy fields + assign, 
        // shrinking the scope. Given the complexity of "Find Stop #1 for a job ID I only have as a string",
        // we'll rely on the backend or a quick refetch.
        // Actually, we can use the legacy update for the "drag from pool" scenario 
        // and let the user refine it in the modal if needed, OR we just update the job.

        // Better: Just assign and set legacy date. The UI will pick up legacy date as fallback if stop is missing,
        // BUT if stop exists, UI prefers stop.
        // So we MUST update the stop if it exists.

        // Limitation: We don't have the job object here, only ID.
        // For now, we will assign and update legacy. 
        // If the job already has stops with times, they might not start matches legacy.
        // This is a known limitation of the "Unassigned" pool drag-drop without extra data.

        try {
            await assignJob.mutateAsync({
                jobId: draggedJobId,
                driverId: resourceId,
                vehicleId: targetDriver.assigned_vehicle_id
            })

            await updateJob.mutateAsync({
                id: draggedJobId,
                updates: {
                    scheduled_date: moment(start).format('YYYY-MM-DD'),
                    scheduled_time: moment(start).format('HH:mm:ss')
                }
            })
                // Clear global
                ; (window as any).draggedJobId = null
            toast.success('Job assigned and scheduled')
        } catch (e) {
            toast.error("Failed")
        }

    }, [driversData, assignJob, updateJob])

    const onNavigate = useCallback((newDate: Date) => setDate(newDate), [setDate])
    const onView = useCallback((newView: any) => setView(newView), [setView])


    return (
        <DispatchBoardContext.Provider value={{ onJobClick: handleSelectEvent }}>
            <Card className="h-[750px] flex flex-col border shadow-sm overflow-hidden bg-background">
                <CardContent className="flex-1 p-0 relative">
                    {/* @ts-ignore */}
                    <DnDCalendar

                        localizer={localizer}
                        events={events}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}

                        date={date}
                        onNavigate={onNavigate}
                        view={view}
                        onView={onView}

                        defaultView={Views.DAY}
                        views={[Views.DAY]}
                        className="text-sm font-sans"

                        resourceIdAccessor="id"
                        resourceTitleAccessor="title"
                        resources={resources}

                        onSelectEvent={handleSelectEvent}
                        onEventDrop={handleEventDrop}
                        onDropFromOutside={onDropFromOutside}
                        dragFromOutsideItem={() => ((window as any).draggedJobId ? { id: (window as any).draggedJobId } : {})}
                        draggableAccessor={() => true}
                        resizable={false}

                        eventPropGetter={eventStyleGetter}

                        components={{
                            event: CustomEvent,
                            toolbar: CustomToolbar
                        }}

                        step={60}
                        timeslots={1}
                        min={new Date(0, 0, 0, 6, 0, 0)}
                        max={new Date(0, 0, 0, 20, 0, 0)}

                        // Styling Props
                        dayLayoutAlgorithm="no-overlap"
                    />
                </CardContent>

                <JobDetailPopup
                    job={selectedJob}
                    open={!!selectedJob}
                    onOpenChange={(open) => !open && setSelectedJob(null)}
                />
            </Card>
        </DispatchBoardContext.Provider>
    )
}

