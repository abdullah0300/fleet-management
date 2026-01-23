'use client'

import { FileText, Calendar, AlertTriangle, ExternalLink, Trash2, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Document } from '@/types/database'
import { getDocumentTypeLabel, getDaysUntilExpiry } from '@/hooks/useDocuments'
import { cn } from '@/lib/utils'

interface DocumentCardProps {
    document: Document
    onDelete?: () => void
    onView?: () => void
}

export function DocumentCard({ document, onDelete, onView }: DocumentCardProps) {
    const daysUntilExpiry = getDaysUntilExpiry(document.expiry_date)
    const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0
    const isExpiringSoon = daysUntilExpiry !== null && !isExpired && daysUntilExpiry <= 30

    const getExpiryBadge = () => {
        if (!document.expiry_date) {
            return <Badge variant="outline" className="text-xs">No Expiry</Badge>
        }
        if (isExpired) {
            return <Badge className="badge-error gap-1 text-xs"><AlertTriangle className="h-3 w-3" />Expired</Badge>
        }
        if (isExpiringSoon) {
            return <Badge className="badge-warning gap-1 text-xs"><Calendar className="h-3 w-3" />Expiring Soon</Badge>
        }
        return <Badge className="badge-success gap-1 text-xs"><Calendar className="h-3 w-3" />Valid</Badge>
    }

    const getEntityBadge = () => {
        switch (document.entity_type) {
            case 'vehicle':
                return <Badge variant="outline" className="text-xs bg-accent-purple-muted/50">Vehicle</Badge>
            case 'driver':
                return <Badge variant="outline" className="text-xs bg-status-info-muted/50">Driver</Badge>
            case 'job':
                return <Badge variant="outline" className="text-xs bg-status-success-muted/50">Job</Badge>
            default:
                return null
        }
    }

    const getFileIcon = () => {
        const url = document.file_url?.toLowerCase() || ''
        if (url.includes('.pdf')) return '📄'
        if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png')) return '🖼️'
        if (url.includes('.doc')) return '📝'
        return '📁'
    }

    return (
        <Card className={cn(
            "hover:shadow-md transition-shadow",
            isExpired && "border-status-error/50",
            isExpiringSoon && !isExpired && "border-status-warning/50"
        )}>
            <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0 text-xl sm:text-2xl",
                        isExpired ? "bg-status-error-muted" :
                            isExpiringSoon ? "bg-status-warning-muted" :
                                "bg-muted"
                    )}>
                        {getFileIcon()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            {getExpiryBadge()}
                            {getEntityBadge()}
                        </div>
                        <h3 className="font-semibold mt-1 text-sm sm:text-base">
                            {getDocumentTypeLabel(document.document_type || 'other')}
                        </h3>
                        {document.expiry_date && (
                            <p className={cn(
                                "text-xs mt-0.5",
                                isExpired ? "text-status-error" :
                                    isExpiringSoon ? "text-status-warning" :
                                        "text-muted-foreground"
                            )}>
                                {isExpired
                                    ? `Expired ${Math.abs(daysUntilExpiry!)} days ago`
                                    : daysUntilExpiry === 0
                                        ? 'Expires today'
                                        : `Expires in ${daysUntilExpiry} days`
                                }
                                <span className="text-muted-foreground/60 ml-1">
                                    ({new Date(document.expiry_date).toLocaleDateString()})
                                </span>
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Added {new Date(document.created_at).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                        {document.file_url && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => document.file_url && window.open(document.file_url, '_blank')}
                            >
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                        )}
                        {onDelete && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-status-error hover:text-status-error hover:bg-status-error-muted"
                                onClick={onDelete}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
