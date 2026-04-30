'use client'

import { FileText, Calendar, AlertTriangle, ExternalLink, Trash2, CheckSquare, Square } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DocumentWithRelations } from '@/lib/data'
import { getDocumentTypeLabel, getDaysUntilExpiry } from '@/hooks/useDocuments'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface DocumentCardProps {
    document: DocumentWithRelations
    isSelected?: boolean
    onToggleSelect?: () => void
    onDelete?: () => void
    onView?: () => void
}

export function DocumentCard({ document, isSelected, onToggleSelect, onDelete, onView }: DocumentCardProps) {
    const daysUntilExpiry = getDaysUntilExpiry(document.expiry_date)
    const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0
    const isExpiringSoon = daysUntilExpiry !== null && !isExpired && daysUntilExpiry <= 30

    const getExpiryBadge = () => {
        if (!document.expiry_date) {
            return null; // hide "no expiry" in dense card
        }
        if (isExpired) {
            return <Badge className="bg-status-error hover:bg-status-error text-white gap-1 text-[10px] px-1.5 py-0 h-4"><AlertTriangle className="h-3 w-3" />Expired</Badge>
        }
        if (isExpiringSoon) {
            return <Badge className="bg-status-warning hover:bg-status-warning text-white gap-1 text-[10px] px-1.5 py-0 h-4"><Calendar className="h-3 w-3" />Expiring Soon</Badge>
        }
        return <Badge className="bg-status-success hover:bg-status-success text-white gap-1 text-[10px] px-1.5 py-0 h-4"><Calendar className="h-3 w-3" />Valid</Badge>
    }

    const getEntityBadge = () => {
        switch (document.entity_type) {
            case 'vehicle':
                return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-accent-purple-muted/50 text-accent-purple border-accent-purple/20">Vehicle</Badge>
            case 'driver':
                return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-status-info-muted/50 text-status-info border-status-info/20">Driver</Badge>
            case 'job':
                return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-status-success-muted/50 text-status-success border-status-success/20">Job</Badge>
            case 'maintenance':
                return <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100/50 border-amber-300 text-amber-700">Maintenance</Badge>
            default:
                return null
        }
    }

    const getFileIcon = () => {
        const url = document.file_url?.toLowerCase() || ''
        if (url.includes('.pdf')) return <FileText className="w-12 h-12 text-red-500/80" />
        if (url.includes('.doc')) return <FileText className="w-12 h-12 text-blue-500/80" />
        return <FileText className="w-12 h-12 text-muted-foreground/50" />
    }

    const isImage = document.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(document.file_url)
    const isPDF = document.file_url && /\.pdf$/i.test(document.file_url)

    return (
        <Card className={cn(
            "hover:shadow-md transition-all relative border flex flex-col overflow-hidden group",
            isSelected ? "border-primary ring-1 ring-primary" : "",
            isExpired && !isSelected && "border-status-error/50",
            isExpiringSoon && !isExpired && !isSelected && "border-status-warning/50"
        )}>
            {/* Selection Overlay Checkbox */}
            {onToggleSelect && (
                <div 
                    className={cn(
                        "absolute top-2 left-2 z-20 cursor-pointer p-1 rounded hover:bg-background/80 transition-opacity",
                        isSelected ? "opacity-100 bg-background/80" : "opacity-0 group-hover:opacity-100 bg-background/50 text-muted-foreground"
                    )}
                    onClick={(e) => {
                        e.stopPropagation()
                        onToggleSelect()
                    }}
                >
                    {isSelected ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5" />}
                </div>
            )}
            
            {/* Action Buttons Top Right */}
            <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {document.file_url && (
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-background/80 hover:bg-background shadow-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(document.file_url!, '_blank');
                        }}
                        title="View Document"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                )}
                {onDelete && (
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7 bg-background/80 hover:bg-status-error-muted hover:text-status-error shadow-sm text-status-error/80"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        title="Delete"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>

            {/* Large Preview Area */}
            <div 
                className="w-full aspect-video bg-muted/30 relative flex items-center justify-center border-b overflow-hidden cursor-pointer group-hover:bg-muted/50 transition-colors"
                onClick={() => document.file_url && window.open(document.file_url, '_blank')}
            >
                {isImage ? (
                    <Image src={document.file_url!} alt="Document Thumbnail" fill className="object-cover transition-transform group-hover:scale-105" />
                ) : isPDF ? (
                    <iframe src={`${document.file_url}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} className="w-full h-full pointer-events-none opacity-90 object-cover" title="PDF Preview" scrolling="no" />
                ) : (
                    getFileIcon()
                )}
            </div>

            <CardContent className="p-3 flex flex-col flex-1">
                {/* Basic Info */}
                <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                    {getEntityBadge()}
                    {getExpiryBadge()}
                </div>
                <h3 className="font-semibold text-sm leading-tight truncate" title={getDocumentTypeLabel(document.document_type || 'other')}>
                    {getDocumentTypeLabel(document.document_type || 'other')}
                </h3>

                {/* Relational Metadata Text */}
                <div className="mt-2 text-xs flex-1">
                    {document.job ? (
                        <div className="text-muted-foreground truncate">
                            <span className="font-medium text-foreground">Job {document.job.job_number}</span> &bull; {document.job.customer_name || 'N/A'}
                        </div>
                    ) : document.driver ? (
                        <div className="text-muted-foreground truncate">
                            <span className="font-medium text-foreground">Driver:</span> {document.driver.full_name}
                        </div>
                    ) : document.vehicle ? (
                        <div className="text-muted-foreground truncate">
                            <span className="font-medium text-foreground">Vehicle:</span> {document.vehicle.license_plate}
                        </div>
                    ) : document.maintenance ? (
                        <div className="text-muted-foreground truncate">
                            <span className="font-medium text-foreground">Maint:</span> {document.maintenance.description}
                        </div>
                    ) : (
                        <div className="text-muted-foreground italic">No extra metadata.</div>
                    )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <p className="text-[10px] text-muted-foreground/80">
                        Added {new Date(document.created_at).toLocaleDateString()}
                    </p>
                    {document.expiry_date && (
                        <p className={cn(
                            "text-[10px] font-medium",
                            isExpired ? "text-status-error" :
                            isExpiringSoon ? "text-status-warning" :
                            "text-muted-foreground"
                        )}>
                            Exp: {new Date(document.expiry_date).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
