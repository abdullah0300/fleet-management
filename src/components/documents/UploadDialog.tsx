'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
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
} from '@/components/ui/dialog'
import { useVehicles } from '@/hooks/useVehicles'
import { useDrivers } from '@/hooks/useDrivers'
import { useUploadDocument } from '@/hooks/useDocuments'
import { cn } from '@/lib/utils'

interface UploadDialogProps {
    trigger?: React.ReactNode
    onSuccess?: () => void
}

const documentTypes = [
    { value: 'license', label: 'Driver License' },
    { value: 'registration', label: 'Vehicle Registration' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'inspection', label: 'Inspection Certificate' },
    { value: 'permit', label: 'Permit' },
    { value: 'contract', label: 'Contract' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'other', label: 'Other' },
]

export function UploadDialog({ trigger, onSuccess }: UploadDialogProps) {
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [entityType, setEntityType] = useState<'vehicle' | 'driver'>('vehicle')
    const [entityId, setEntityId] = useState('')
    const [documentType, setDocumentType] = useState('registration')
    const [expiryDate, setExpiryDate] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const { data: vehiclesData } = useVehicles()
    const { data: driversData } = useDrivers()
    const uploadMutation = useUploadDocument()

    const vehicles = vehiclesData?.data || []
    const drivers = driversData?.data || []

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
        }
    }

    const handleSubmit = async () => {
        if (!file || !entityId || !documentType) return

        await uploadMutation.mutateAsync({
            file,
            metadata: {
                entityType,
                entityId,
                documentType,
                expiryDate: expiryDate || undefined,
            }
        })

        // Reset and close
        setFile(null)
        setEntityId('')
        setDocumentType('registration')
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

                    {/* Entity Type */}
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

                    {/* Entity Selection */}
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
                                            {v.make} {v.model} - {v.registration_number}
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

                    {/* Document Type */}
                    <div className="space-y-2">
                        <Label className="text-sm">Document Type *</Label>
                        <Select value={documentType} onValueChange={setDocumentType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {documentTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                        disabled={!file || !entityId || uploadMutation.isPending}
                    >
                        {uploadMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
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
