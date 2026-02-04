'use client'

import { useDocuments, getDocumentTypeLabel, useDeleteDocument } from '@/hooks/useDocuments'
import { UploadDialog } from '@/components/documents/UploadDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, FileText, Trash2, Calendar, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface JobDocumentsProps {
    jobId: string
}

export function JobDocuments({ jobId }: JobDocumentsProps) {
    const { data: documentsResult, isLoading } = useDocuments({
        entityType: 'job',
        entityId: jobId
    })

    // safe access to documents array
    const documents = documentsResult?.data || []

    const deleteMutation = useDeleteDocument()

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return

        try {
            await deleteMutation.mutateAsync(id)
            toast.success('Document deleted')
        } catch (error) {
            toast.error('Failed to delete document')
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    if (isLoading) {
        return <div className="p-8 flex justify-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
    }

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-muted-foreground">Attached Documents</h3>
                <UploadDialog
                    trigger={
                        <Button size="sm" variant="outline" className="h-8 gap-2">
                            <Plus className="h-3.5 w-3.5" />
                            Add Document
                        </Button>
                    }
                    entityType="job"
                    entityId={jobId}
                    onSuccess={() => toast.success('Document uploaded successfully')}
                />
            </div>

            {!documents.length ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-100 rounded-lg text-slate-400">
                    <FileText className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm">No documents attached yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto pr-2 pb-2">
                    {documents.map((doc) => (
                        <Card key={doc.id} className="group relative border-slate-200 hover:border-blue-300 transition-all bg-white shadow-sm hover:shadow-md">
                            <CardContent className="p-3 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="h-8 w-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                            <FileText className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate leading-tight" title={doc.document_type || 'Document'}>
                                                {getDocumentTypeLabel(doc.document_type || 'other')}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {formatDate(doc.created_at)}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => handleDelete(doc.id)}
                                        disabled={deleteMutation.isPending}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>

                                {doc.expiry_date && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-orange-600 bg-orange-50 px-2 py-1 rounded w-fit">
                                        <Calendar className="h-3 w-3" />
                                        Expires: {formatDate(doc.expiry_date)}
                                    </div>
                                )}

                                <div className="pt-2 border-t border-slate-100 flex gap-2">
                                    {doc.file_url && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="w-full h-7 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700"
                                            asChild
                                        >
                                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink className="h-3 w-3 mr-1.5" />
                                                View
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
