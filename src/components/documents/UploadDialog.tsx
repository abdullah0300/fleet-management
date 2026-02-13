'use client'

import { useState, useRef, useMemo } from 'react'
import { Upload, FileText, X, Loader2, Search, Check, ChevronDown } from 'lucide-react'
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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog'
import { useVehicles } from '@/hooks/useVehicles'
import { useDrivers } from '@/hooks/useDrivers'
import { useUploadDocument } from '@/hooks/useDocuments'
import { cn } from '@/lib/utils'

interface UploadDialogProps {
    trigger?: React.ReactNode
    onSuccess?: () => void
    entityType?: 'vehicle' | 'driver' | 'job' | 'manifest'
    entityId?: string
    relatedJobs?: { id: string; job_number: string; customer_name?: string }[]
}

const documentTypes = [
    { value: 'trouble_ticket', label: 'Trouble Ticket' },
    { value: 'yard_ticket', label: 'Yard Ticket' },
    { value: 'storage_receipt', label: 'Storage Receipt' },
    { value: 'scale_ticket', label: 'Scale Ticket' },
    { value: 'repair_invoice', label: 'Repair Invoice' },
    { value: 'proof_of_pickup', label: 'Proof of Pick Up' },
    { value: 'proof_of_delivery', label: 'Proof of Delivery' },
    { value: 'proof_of_completion', label: 'Proof of Completion' },
    { value: 'bol', label: 'BOL' },
    { value: 'lumper_fee', label: 'Lumper Fee' },
    { value: 'interchange_in', label: 'Interchange In' },
    { value: 'interchange_out', label: 'Interchange Out' },
    { value: 'delivery_order', label: 'Delivery Order' },
    { value: 'chassis_interchange', label: 'Chassis Interchange' },
    { value: 'chassis_photo', label: 'Chassis Photo' },
    { value: 'container_trailer_photo', label: 'Container/Trailer Photo' },
    { value: 'manifest', label: 'Manifest' },
    { value: 'other', label: 'Other' },
]

export function UploadDialog({ trigger, onSuccess, entityType: initialType, entityId: initialId, relatedJobs }: UploadDialogProps) {
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [entityType, setEntityType] = useState<'vehicle' | 'driver' | 'job' | 'manifest'>(initialType || 'vehicle')
    const [entityId, setEntityId] = useState(initialId || '')
    const [documentType, setDocumentType] = useState('other')
    const [expiryDate, setExpiryDate] = useState('')
    const [typeSearch, setTypeSearch] = useState('')
    const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const typeDropdownRef = useRef<HTMLDivElement>(null)

    const filteredDocTypes = useMemo(() => {
        if (!typeSearch) return documentTypes
        return documentTypes.filter(t =>
            t.label.toLowerCase().includes(typeSearch.toLowerCase())
        )
    }, [typeSearch])

    const { data: vehiclesData } = useVehicles()
    const { data: driversData } = useDrivers()
    const uploadMutation = useUploadDocument()

    const vehicles = vehiclesData?.data || []
    const drivers = driversData?.data || []

    // If relatedJobs are provided (e.g. from Manifest page), we MUST link to a job
    const isJobSelectionRequired = !!relatedJobs && relatedJobs.length > 0

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
        }
    }

    const handleSubmit = async () => {
        if (!file || (!entityId && !initialId) || !documentType) return

        // If linking to a job explicitly, override the entity type
        const finalEntityType = isJobSelectionRequired ? 'job' : (initialType || entityType)
        const finalEntityId = initialId || entityId

        await uploadMutation.mutateAsync({
            file,
            metadata: {
                entityType: finalEntityType as any, // Cast to avoid TS strictness if 'manifest' passed
                entityId: finalEntityId,
                documentType,
                expiryDate: expiryDate || undefined,
            }
        })

        // Reset and close
        setFile(null)
        if (!initialId) setEntityId('')
        setDocumentType('other')
        setExpiryDate('')
        setOpen(false)
        onSuccess?.()
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files?.[0]
        if (droppedFile) {
            setFile(droppedFile)
        }
    }

    const isFixedEntity = !!initialType && !!initialId

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="gap-2">
                        <Upload className="h-4 w-4" />
                        Upload Document
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>
                        Select a file and specify the document type and entity.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    {/* Drop Zone */}
                    <div
                        className={cn(
                            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                            file ? "border-status-success bg-status-success-muted/20" :
                                "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
                        )}
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        {file ? (
                            <div className="flex items-center justify-center gap-2">
                                <FileText className="h-6 w-6 text-status-success" />
                                <span className="text-sm font-medium">{file.name}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setFile(null)
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <>
                                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">
                                    Click or drag file to upload
                                </p>
                                <p className="text-xs text-muted-foreground/60 mt-1">
                                    PDF, JPG, PNG up to 10MB
                                </p>
                            </>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    {/* Entity Selection (Hide if fixed) */}
                    {!isFixedEntity && !isJobSelectionRequired && (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <Button
                                    type="button"
                                    variant={entityType === 'vehicle' ? 'default' : 'outline'}
                                    className="w-full"
                                    onClick={() => {
                                        setEntityType('vehicle')
                                        setEntityId('')
                                    }}
                                >
                                    Vehicle
                                </Button>
                                <Button
                                    type="button"
                                    variant={entityType === 'driver' ? 'default' : 'outline'}
                                    className="w-full"
                                    onClick={() => {
                                        setEntityType('driver')
                                        setEntityId('')
                                    }}
                                >
                                    Driver
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">Select {entityType === 'vehicle' ? 'Vehicle' : 'Driver'} *</Label>
                                <Select value={entityId} onValueChange={setEntityId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={`Select a ${entityType}...`} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {entityType === 'vehicle' ? (
                                            vehicles.map((v) => (
                                                <SelectItem key={v.id} value={v.id}>
                                                    {v.make} {v.model} - {v.license_plate}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            drivers.map((d) => (
                                                <SelectItem key={d.id} value={d.id}>
                                                    {d.profiles?.full_name || 'Unknown'}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    {/* Job Selection (For Manifest Page) */}
                    {isJobSelectionRequired && (
                        <div className="space-y-2">
                            <Label className="text-sm">Select Job *</Label>
                            <Select value={entityId} onValueChange={setEntityId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a job to attach to..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {relatedJobs?.map((job) => (
                                        <SelectItem key={job.id} value={job.id}>
                                            Job #{job.job_number} - {job.customer_name || 'Unknown'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-muted-foreground">
                                Document will be saved to the selected job.
                            </p>
                        </div>
                    )}

                    {/* Document Type with Search */}
                    <div className="space-y-2">
                        <Label className="text-sm">Document Type *</Label>
                        <div className="relative" ref={typeDropdownRef}>
                            <button
                                type="button"
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                            >
                                <span className={documentType ? '' : 'text-muted-foreground'}>
                                    {documentTypes.find(t => t.value === documentType)?.label || 'Select type...'}
                                </span>
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </button>
                            {typeDropdownOpen && (
                                <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
                                    <div className="flex items-center border-b px-3 py-2">
                                        <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                                        <input
                                            type="text"
                                            placeholder="Search document types..."
                                            value={typeSearch}
                                            onChange={(e) => setTypeSearch(e.target.value)}
                                            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-48 overflow-y-auto p-1">
                                        {filteredDocTypes.length === 0 ? (
                                            <p className="py-3 px-2 text-sm text-muted-foreground text-center">No types found</p>
                                        ) : (
                                            filteredDocTypes.map((type) => (
                                                <button
                                                    key={type.value}
                                                    type="button"
                                                    className={cn(
                                                        "w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer transition-colors",
                                                        documentType === type.value
                                                            ? 'bg-primary/10 text-primary font-medium'
                                                            : 'hover:bg-accent'
                                                    )}
                                                    onClick={() => {
                                                        setDocumentType(type.value)
                                                        setTypeDropdownOpen(false)
                                                        setTypeSearch('')
                                                    }}
                                                >
                                                    <Check className={cn(
                                                        "h-3.5 w-3.5 shrink-0",
                                                        documentType === type.value ? 'opacity-100' : 'opacity-0'
                                                    )} />
                                                    {type.label}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Expiry Date */}
                    <div className="space-y-2">
                        <Label className="text-sm">Expiry Date (optional)</Label>
                        <Input
                            type="date"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                        />
                    </div>

                    {/* Submit */}
                    <Button
                        className="w-full gap-2"
                        onClick={handleSubmit}
                        disabled={!file || (!isFixedEntity && !entityId) || uploadMutation.isPending}
                    >
                        {uploadMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <Upload className="h-4 w-4 hidden" />
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4" />
                                Upload Document
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
