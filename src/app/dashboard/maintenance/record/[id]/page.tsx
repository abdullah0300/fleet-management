'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    ArrowLeft, Wrench, Save, CheckCircle2, Clock, Play, AlertCircle,
    DollarSign, FileText, Upload, Trash2, ExternalLink, Gauge, Truck,
    Calendar, ChevronRight, Loader2
} from 'lucide-react'
import { useMaintenanceRecord, useUpdateMaintenance, useCompleteMaintenance, maintenanceKeys } from '@/hooks/useMaintenance'
import { useDocuments, useUploadDocument, useDeleteDocument } from '@/hooks/useDocuments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── Status Pipeline Config ──────────────────────────
const PIPELINE_STEPS = [
    { key: 'scheduled', label: 'Scheduled', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100 border-amber-300', ring: 'ring-amber-400' },
    { key: 'in_progress', label: 'In Progress', icon: Play, color: 'text-blue-600', bg: 'bg-blue-100 border-blue-300', ring: 'ring-blue-400' },
    { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 border-emerald-300', ring: 'ring-emerald-400' },
] as const

function getStepIndex(status: string | null) {
    const idx = PIPELINE_STEPS.findIndex(s => s.key === status)
    return idx >= 0 ? idx : 0
}

export default function WorkOrderDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    // ── Data Fetching ──
    const { data: record, isLoading, error } = useMaintenanceRecord(id)
    const { data: docsData } = useDocuments({ entityType: 'maintenance', entityId: id })
    const documents = docsData?.data || []

    // ── Mutations ──
    const updateMutation = useUpdateMaintenance()
    const completeMutation = useCompleteMaintenance()
    const uploadMutation = useUploadDocument()
    const deleteMutation = useDeleteDocument()

    // ── Local State ──
    const [partsCost, setPartsCost] = useState<string>('')
    const [laborCost, setLaborCost] = useState<string>('')
    const [mechanicNotes, setMechanicNotes] = useState<string>('')
    const [isEditing, setIsEditing] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [completeOdometer, setCompleteOdometer] = useState<string>('')
    const [odometerError, setOdometerError] = useState<string>('')
    const [showCompleteDialog, setShowCompleteDialog] = useState(false)

    // ── Sync form state when data arrives ──
    const initForm = useCallback(() => {
        if (record) {
            setPartsCost(String(record.parts_cost || 0))
            setLaborCost(String(record.labor_cost || 0))
            setMechanicNotes(record.mechanic_notes || '')
            setIsEditing(false)
        }
    }, [record])

    // Init on first load
    if (record && !isEditing && partsCost === '' && laborCost === '') {
        initForm()
    }

    // ── Handlers ──
    const calculatedTotal = (Number(partsCost) || 0) + (Number(laborCost) || 0)

    const handleSave = async () => {
        if (!record) return
        setIsSaving(true)
        try {
            await updateMutation.mutateAsync({
                id: record.id,
                updates: {
                    parts_cost: Number(partsCost) || 0,
                    labor_cost: Number(laborCost) || 0,
                    cost: calculatedTotal,
                    mechanic_notes: mechanicNotes,
                }
            })
            toast.success('Work order updated')
            setIsEditing(false)
        } catch (err: any) {
            toast.error('Failed to save: ' + err.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleStatusChange = async (newStatus: string) => {
        if (!record || record.status === newStatus) return
        if (newStatus === 'completed') {
            setShowCompleteDialog(true)
            return
        }
        try {
            await updateMutation.mutateAsync({ id: record.id, updates: { status: newStatus as any } })
            toast.success(`Status updated to ${newStatus.replace('_', ' ')}`)
        } catch (err: any) {
            toast.error('Failed to update status')
        }
    }

    const handleComplete = async () => {
        if (!record) return
        if (!completeOdometer || Number(completeOdometer) <= 0) {
            setOdometerError('Odometer reading is required to complete a work order.')
            return
        }
        setOdometerError('')
        try {
            await completeMutation.mutateAsync({
                id: record.id,
                cost: calculatedTotal || undefined,
                odometerReading: Number(completeOdometer),
            })
            toast.success('Work order completed!')
            setShowCompleteDialog(false)
            setCompleteOdometer('')
        } catch (err: any) {
            toast.error('Failed to complete: ' + err.message)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !record) return
        try {
            await uploadMutation.mutateAsync({
                file,
                metadata: {
                    entityType: 'maintenance',
                    entityId: record.id,
                    documentType: 'repair_invoice',
                }
            })
            toast.success('File uploaded')
        } catch (err: any) {
            toast.error('Upload failed: ' + err.message)
        }
        e.target.value = ''
    }

    const handleDeleteDoc = async (docId: string) => {
        try {
            await deleteMutation.mutateAsync(docId)
            toast.success('Document removed')
        } catch (err: any) {
            toast.error('Failed to delete: ' + err.message)
        }
    }

    // ── Loading & Error States ──
    if (isLoading) {
        return (
            <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
                <Skeleton className="h-8 w-48" />
                <div className="grid gap-6 md:grid-cols-3">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                </div>
                <Skeleton className="h-64" />
            </div>
        )
    }

    if (error || !record) {
        return (
            <div className="p-6 max-w-5xl mx-auto">
                <div className="flex items-center gap-3 p-6 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                    <div>
                        <h3 className="font-semibold text-red-900">Record Not Found</h3>
                        <p className="text-sm text-red-700">This maintenance record doesn't exist or you don't have access.</p>
                    </div>
                    <Button variant="outline" className="ml-auto" onClick={() => router.push('/dashboard/maintenance')}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                </div>
            </div>
        )
    }

    const currentStepIdx = getStepIndex(record.status)
    const isCompleted = record.status === 'completed'
    const vehicle = record.vehicles

    return (
        <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/maintenance')} className="shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Wrench className="h-5 w-5 text-primary" />
                            Work Order
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {record.description || 'Untitled Service'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {record.service_programs?.name && (
                        <Badge variant="secondary" className="text-xs font-medium bg-indigo-50 text-indigo-700 border-indigo-200">
                            Fulfilling: {record.service_programs.name}
                        </Badge>
                    )}
                    <Badge variant="outline" className={cn(
                        'text-xs font-semibold px-3 py-1 border',
                        record.type === 'repair' ? 'bg-orange-50 border-orange-300 text-orange-700' :
                            record.type === 'inspection' ? 'bg-purple-50 border-purple-300 text-purple-700' :
                                'bg-sky-50 border-sky-300 text-sky-700'
                    )}>
                        {record.type || 'scheduled'}
                    </Badge>
                    {vehicle && (
                        <Badge variant="outline" className="text-xs gap-1">
                            <Truck className="h-3 w-3" />
                            {vehicle.make} {vehicle.model} — {vehicle.license_plate}
                        </Badge>
                    )}
                </div>
            </div>

            {/* ── Status Pipeline ── */}
            <Card className="overflow-hidden">
                <CardContent className="p-0">
                    <div className="flex">
                        {PIPELINE_STEPS.map((step, idx) => {
                            const StepIcon = step.icon
                            const isActive = idx === currentStepIdx
                            const isPast = idx < currentStepIdx
                            const isFuture = idx > currentStepIdx

                            return (
                                <button
                                    key={step.key}
                                    onClick={() => !isCompleted && handleStatusChange(step.key)}
                                    disabled={isCompleted && step.key !== 'completed'}
                                    className={cn(
                                        'flex-1 flex items-center justify-center gap-2 py-4 px-3 text-sm font-medium transition-all relative',
                                        'border-b-[3px]',
                                        isActive && `${step.bg} border-b-current ${step.color}`,
                                        isPast && 'bg-emerald-50/50 text-emerald-600 border-b-emerald-400',
                                        isFuture && 'bg-muted/30 text-muted-foreground border-b-transparent',
                                        !isCompleted && 'hover:bg-accent/50 cursor-pointer',
                                        isCompleted && step.key !== 'completed' && 'opacity-50 cursor-default'
                                    )}
                                >
                                    <StepIcon className="h-4 w-4 shrink-0" />
                                    <span className="hidden sm:inline">{step.label}</span>
                                    {idx < PIPELINE_STEPS.length - 1 && (
                                        <ChevronRight className="h-3 w-3 absolute right-0 text-muted-foreground/40 hidden md:block" />
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* ── Main Grid ── */}
            <div className="grid gap-6 md:grid-cols-5">
                {/* Left Column — Cost & Notes (3/5) */}
                <div className="md:col-span-3 space-y-6">
                    {/* Cost Breakdown Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-emerald-600" />
                                    Cost Breakdown
                                </CardTitle>
                                {!isCompleted && (
                                    <Button
                                        variant={isEditing ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                                        {isEditing ? 'Save' : 'Edit'}
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Parts Cost</Label>
                                    {isEditing ? (
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="pl-7"
                                                value={partsCost}
                                                onChange={e => setPartsCost(e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-2xl font-bold tracking-tight text-foreground">
                                            ${Number(partsCost).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Labor Cost</Label>
                                    {isEditing ? (
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="pl-7"
                                                value={laborCost}
                                                onChange={e => setLaborCost(e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-2xl font-bold tracking-tight text-foreground">
                                            ${Number(laborCost).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* Total */}
                            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-lg border border-emerald-200">
                                <span className="text-sm font-medium text-emerald-800">Total Cost</span>
                                <span className="text-xl font-bold text-emerald-700">${calculatedTotal.toFixed(2)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Mechanic Notes / Incident Report */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-600" />
                                Mechanic Notes & Incident Report
                            </CardTitle>
                            <CardDescription>Document repairs, accident details, or any observations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isEditing ? (
                                <Textarea
                                    placeholder="Describe what work was done, any issues found, accident/incident details..."
                                    rows={6}
                                    value={mechanicNotes}
                                    onChange={e => setMechanicNotes(e.target.value)}
                                    className="resize-none"
                                />
                            ) : (
                                <div className={cn(
                                    "min-h-[100px] rounded-lg p-4 text-sm whitespace-pre-wrap",
                                    mechanicNotes ? "bg-muted/30 border" : "bg-muted/20 border border-dashed text-muted-foreground italic"
                                )}>
                                    {mechanicNotes || 'No notes added yet. Click "Edit" to add repair details or incident reports.'}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column — Info & Attachments (2/5) */}
                <div className="md:col-span-2 space-y-6">
                    {/* Quick Info Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Service Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Service Date</span>
                                <span className="font-medium">{record.service_date ? new Date(record.service_date).toLocaleDateString() : '—'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" /> Odometer at Service</span>
                                <span className="font-medium">{record.odometer_at_service ? `${record.odometer_at_service.toLocaleString()} mi` : '—'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" /> Current Vehicle Odometer</span>
                                <span className="font-medium">{vehicle?.odometer_reading ? `${vehicle.odometer_reading.toLocaleString()} mi` : '—'}</span>
                            </div>
                            {record.next_service_date && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Next Service Due</span>
                                    <span className="font-medium">{new Date(record.next_service_date).toLocaleDateString()}</span>
                                </div>
                            )}
                            {record.next_service_odometer && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-1.5"><Gauge className="h-3.5 w-3.5" /> Next Service Odometer</span>
                                    <span className="font-medium">{record.next_service_odometer.toLocaleString()} mi</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Old Total Cost</span>
                                <span className="font-medium">{record.cost != null ? `$${Number(record.cost).toFixed(2)}` : '—'}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Attachments Card */}
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Upload className="h-4 w-4 text-violet-600" />
                                    Attachments
                                </CardTitle>
                                <Badge variant="secondary" className="text-xs">{documents.length}</Badge>
                            </div>
                            <CardDescription>Invoices, photos, inspection reports</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {/* Upload Zone */}
                            {!isCompleted && (
                                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors">
                                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                                    <span className="text-xs text-muted-foreground">Click to upload or drag file</span>
                                    <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx" />
                                    {uploadMutation.isPending && (
                                        <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                                        </div>
                                    )}
                                </label>
                            )}

                            {/* Document List */}
                            {documents.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">No attachments yet</p>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {documents.map(doc => {
                                        const url = doc.file_url?.toLowerCase() || ''
                                        const isImage = url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.webp')
                                        return (
                                            <div key={doc.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border text-sm group">
                                                <div className="w-8 h-8 rounded bg-violet-100 flex items-center justify-center text-lg shrink-0">
                                                    {isImage ? '🖼️' : '📄'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="truncate block text-xs font-medium">{doc.document_type || 'File'}</span>
                                                    <span className="text-[10px] text-muted-foreground">{new Date(doc.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {doc.file_url && (
                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => window.open(doc.file_url!, '_blank')}>
                                                            <ExternalLink className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                    {!isCompleted && (
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => handleDeleteDoc(doc.id)}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Complete Work Order Button */}
                    {!isCompleted && (
                        <Button
                            size="lg"
                            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
                            onClick={() => setShowCompleteDialog(true)}
                        >
                            <CheckCircle2 className="h-5 w-5" />
                            Complete Work Order
                        </Button>
                    )}
                </div>
            </div>

            {/* ── Complete Dialog ── */}
            <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            Complete Work Order
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">
                            Enter the vehicle's current odometer reading to complete this work order. This keeps mileage tracking and next-service calculations accurate.
                        </p>
                        {vehicle && (
                            <div className="p-3 bg-muted/30 rounded-lg border text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Vehicle</span>
                                    <span className="font-medium">{vehicle.make} {vehicle.model} ({vehicle.license_plate})</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-muted-foreground">Last Recorded Odometer</span>
                                    <span className="font-medium">{(vehicle.odometer_reading || 0).toLocaleString()} mi</span>
                                </div>
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium">
                                Current Odometer Reading (Miles) <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="number"
                                placeholder={`e.g. ${((vehicle?.odometer_reading || 0)).toLocaleString()}`}
                                value={completeOdometer}
                                onChange={e => { setCompleteOdometer(e.target.value); setOdometerError('') }}
                                className={odometerError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                            />
                            {odometerError ? (
                                <p className="text-xs text-red-500 flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> {odometerError}
                                </p>
                            ) : (
                                <p className="text-[10px] text-muted-foreground">Required — updates vehicle mileage and recalculates next service schedule</p>
                            )}
                        </div>
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                            <div className="flex justify-between">
                                <span className="text-emerald-800">Total Cost to Record</span>
                                <span className="font-bold text-emerald-700">${calculatedTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={handleComplete}
                            disabled={completeMutation.isPending}
                        >
                            {completeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                            Complete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
