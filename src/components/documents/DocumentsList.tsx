'use client'

import { useState } from 'react'
import { Upload, Search, FileText, Truck, User, AlertTriangle, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { DocumentCard } from '@/components/documents/DocumentCard'
import { UploadDialog } from '@/components/documents/UploadDialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Document } from '@/types/database'

interface DocumentsListProps {
    initialData: Document[]
}

export function DocumentsList({ initialData }: DocumentsListProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [entityFilter, setEntityFilter] = useState<string>('all')

    // Use initialData from server
    const documents = initialData

    // Stats
    const thirtyDays = new Date()
    thirtyDays.setDate(thirtyDays.getDate() + 30)
    const today = new Date()

    const stats = {
        total: documents.length,
        vehicles: documents.filter(d => d.entity_type === 'vehicle').length,
        drivers: documents.filter(d => d.entity_type === 'driver').length,
        expiring: documents.filter(d => d.expiry_date && new Date(d.expiry_date) <= thirtyDays && new Date(d.expiry_date) > today).length,
        expired: documents.filter(d => d.expiry_date && new Date(d.expiry_date) < today).length,
    }

    // Filter
    const filteredDocuments = documents.filter((doc) => {
        const matchesSearch = doc.document_type?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesEntity = entityFilter === 'all' || doc.entity_type === entityFilter
        return matchesSearch && matchesEntity
    })

    return (
        <div className="flex flex-col gap-4 sm:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Documents</h1>
                    <p className="text-muted-foreground text-sm">Manage and track document expiry</p>
                </div>
                <UploadDialog />
            </div>

            {/* Alert */}
            {(stats.expiring > 0 || stats.expired > 0) && (
                <Card className="border-status-warning/50 bg-status-warning-muted/30">
                    <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-status-warning flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-5 w-5 text-status-warning-foreground" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-status-warning">
                                {stats.expired > 0 && `${stats.expired} expired, `}
                                {stats.expiring} expiring soon
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Documents requiring attention within 30 days
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${entityFilter === 'all' ? 'bg-accent-purple-muted border-accent-purple/40' : 'hover:bg-accent-purple-muted/50'}`}
                    onClick={() => setEntityFilter('all')}
                >
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-accent-purple" />
                        <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${entityFilter === 'vehicle' ? 'bg-status-info-muted border-status-info/40' : 'hover:bg-status-info-muted/50'}`}
                    onClick={() => setEntityFilter('vehicle')}
                >
                    <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-status-info" />
                        <span className="text-xs text-muted-foreground">Vehicles</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.vehicles}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${entityFilter === 'driver' ? 'bg-status-success-muted border-status-success/40' : 'hover:bg-status-success-muted/50'}`}
                    onClick={() => setEntityFilter('driver')}
                >
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-status-success" />
                        <span className="text-xs text-muted-foreground">Drivers</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.drivers}</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search documents..."
                        className="pl-9 bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All Documents" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Documents</SelectItem>
                        <SelectItem value="vehicle">Vehicle Documents</SelectItem>
                        <SelectItem value="driver">Driver Documents</SelectItem>
                        <SelectItem value="job">Job Documents</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Documents List */}
            {filteredDocuments.length === 0 ? (
                <Card className="p-8 sm:p-12 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold">No documents found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Upload your first document to get started.
                    </p>
                    <div className="mt-4">
                        <UploadDialog />
                    </div>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredDocuments.map((doc) => (
                        <DocumentCard key={doc.id} document={doc} />
                    ))}
                </div>
            )}
        </div>
    )
}
