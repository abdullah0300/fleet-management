'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
    Calendar, User, Truck, Package, ArrowRight, X, Save,
    CheckCircle2, AlertCircle, Search, Map
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
// import { useToast } from '@/components/ui/use-toast' 
import { Job, ManifestInsert } from '@/types/database'
import { useCreateManifest, useAddJobToManifest } from '@/hooks/useManifests'
import { getJobDeliveryAddress } from '@/hooks/useJobs'

// Fetchers (local to component or imported)
// We need drivers and vehicles too.
// I'll assume we can fetch them via supabase client here or use hooks if they exist.
// Ideally usage of `useDrivers` and `useVehicles` (if they exist).
// I'll fetch them directly for now to avoid dependency hell if hooks are missing.

export function ManifestBuilder() {
    const router = useRouter()
    // const { toast } = useToast()
    const supabase = createClient()
    const createManifest = useCreateManifest()
    const addJob = useAddJobToManifest()

    // State
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [selectedDriver, setSelectedDriver] = useState<string>('')
    const [selectedVehicle, setSelectedVehicle] = useState<string>('')
    const [selectedJobs, setSelectedJobs] = useState<Job[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Fetch Data
    const { data: pendingJobs } = useQuery({
        queryKey: ['jobs', 'pending'],
        queryFn: async () => {
            const { data } = await supabase
                .from('jobs')
                .select('*') // All fields including customer_name
                .eq('status', 'pending')
                .is('manifest_id', null) // Only unassigned
            return (data || []) as Job[]
        }
    })

    const { data: drivers } = useQuery({
        queryKey: ['drivers', 'available'],
        queryFn: async () => {
            const { data } = await supabase
                .from('drivers')
                .select('*, profiles(full_name)')
                .eq('status', 'available')
            return data || []
        }
    })

    const { data: vehicles } = useQuery({
        queryKey: ['vehicles', 'available'],
        queryFn: async () => {
            const { data } = await supabase
                .from('vehicles')
                .select('*')
                .eq('status', 'available')
            return data || []
        }
    })

    // Actions
    const handleAddJob = (job: Job) => {
        if (selectedJobs.find(j => j.id === job.id)) return
        setSelectedJobs([...selectedJobs, job])
    }

    const handleRemoveJob = (jobId: string) => {
        setSelectedJobs(selectedJobs.filter(j => j.id !== jobId))
    }

    const handleCreateManifest = async () => {
        if (!selectedDriver || !selectedVehicle || selectedJobs.length === 0) {
            alert("Please select a driver, vehicle, and at least one job.")
            return
        }

        setIsSubmitting(true)
        try {
            // 1. Create Manifest
            const manifestData: ManifestInsert = {
                driver_id: selectedDriver,
                vehicle_id: selectedVehicle,
                scheduled_date: selectedDate,
                status: 'scheduled',
                // manifest_number auto generated
            }

            const newManifest = await createManifest.mutateAsync(manifestData)

            // 2. Add Jobs
            // Execute sequentially to maintain order
            let sequence = 1
            for (const job of selectedJobs) {
                await addJob.mutateAsync({
                    manifestId: newManifest.id,
                    jobId: job.id,
                    sequence: sequence++
                })
            }

            alert("Manifest created successfully with " + selectedJobs.length + " jobs.")

            router.push('/dashboard/manifests')

        } catch (error: any) {
            alert(error.message || "Failed to create manifest")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Filters
    const filteredPendingJobs = pendingJobs?.filter(job =>
        !selectedJobs.find(j => j.id === job.id) &&
        (job.job_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || []

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-10rem)]">
            {/* LEFT: JOB SELECTOR */}
            <Card className="lg:col-span-1 flex flex-col h-full">
                <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-lg flex items-center justify-between">
                        <span>Pending Jobs</span>
                        <Badge variant="secondary">{filteredPendingJobs.length}</Badge>
                    </CardTitle>
                    <div className="relative mt-2">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search pending jobs..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-4 space-y-3">
                    {filteredPendingJobs.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No pending jobs found
                        </div>
                    ) : (
                        filteredPendingJobs.map(job => (
                            <div
                                key={job.id}
                                className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors group"
                                onClick={() => handleAddJob(job)}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-semibold text-sm">{job.job_number}</span>
                                    <ArrowRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-sm text-muted-foreground mb-1">
                                    <User className="inline h-3 w-3 mr-1" />
                                    {job.customer_name || 'No Name'}
                                </div>
                                <div className="text-xs text-muted-foreground line-clamp-1">
                                    <Map className="inline h-3 w-3 mr-1" />
                                    {getJobDeliveryAddress(job)}
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>

            {/* RIGHT: MANIFEST BUILDER */}
            <Card className="lg:col-span-2 flex flex-col h-full bg-slate-50/50">
                <CardHeader className="bg-background border-b pb-4">
                    <CardTitle className="text-lg mb-4">New Manifest</CardTitle>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Scheduled Date</label>
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Driver</label>
                            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Driver" />
                                </SelectTrigger>
                                <SelectContent>
                                    {drivers?.map((d: any) => (
                                        <SelectItem key={d.id} value={d.id}>
                                            {d.profiles?.full_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Vehicle</label>
                            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Vehicle" />
                                </SelectTrigger>
                                <SelectContent>
                                    {vehicles?.map(v => (
                                        <SelectItem key={v.id} value={v.id}>
                                            {v.registration_number} - {v.make}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                Assigned Jobs ({selectedJobs.length})
                            </h3>
                            {selectedJobs.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                    Drag to reorder (Coming soon)
                                </span>
                            )}
                        </div>

                        {selectedJobs.length === 0 ? (
                            <div className="border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground flex flex-col items-center justify-center h-[300px] bg-background">
                                <Package className="h-12 w-12 mb-4 opacity-20" />
                                <p className="font-medium">No jobs assigned</p>
                                <p className="text-sm">Select pending jobs from the left to build the manifest.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {selectedJobs.map((job, index) => (
                                    <div key={job.id} className="bg-background p-4 rounded-lg border shadow-sm flex items-center gap-4 group hover:border-primary/50 transition-colors">
                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-sm">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold">{job.job_number}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {job.customer_name} • {(job.delivery_location as any)?.address}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive"
                                            onClick={() => handleRemoveJob(job.id)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
                <div className="p-4 bg-background border-t flex justify-end gap-3">
                    <Button variant="outline" onClick={() => router.back()}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateManifest}
                        disabled={isSubmitting || selectedJobs.length === 0 || !selectedDriver || !selectedVehicle}
                        className="w-full sm:w-auto min-w-[150px]"
                    >
                        {isSubmitting ? (
                            <>Creating...</>
                        ) : (
                            <><Save className="mr-2 h-4 w-4" /> Create Manifest</>
                        )}
                    </Button>
                </div>
            </Card>
        </div>
    )
}
