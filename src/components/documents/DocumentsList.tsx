'use client'

import { useState, useMemo } from 'react'
import { Search, FileText, AlertTriangle, Filter, Download, CheckSquare, Square, LayoutGrid, List, ExternalLink, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { DocumentCard } from '@/components/documents/DocumentCard'
import { UploadDialog } from '@/components/documents/UploadDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import { DateRange } from 'react-day-picker'
import { DocumentWithRelations } from '@/lib/data'

interface DocumentsListProps {
    initialData: DocumentWithRelations[]
}

export function DocumentsList({ initialData }: DocumentsListProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [entityFilter, setEntityFilter] = useState<string>('all')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set())
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [showAdvanced, setShowAdvanced] = useState(false)
    const [dateRange, setDateRange] = useState<DateRange | undefined>()
    const [dateFilterType, setDateFilterType] = useState<'created' | 'expiry'>('created')

    const documents = initialData

    // Stats
    const thirtyDays = new Date()
    thirtyDays.setDate(thirtyDays.getDate() + 30)
    const today = new Date()

    const stats = {
        total: documents.length,
        vehicles: documents.filter(d => d.entity_type === 'vehicle').length,
        drivers: documents.filter(d => d.entity_type === 'driver').length,
        jobs: documents.filter(d => d.entity_type === 'job').length,
        maintenance: documents.filter(d => d.entity_type === 'maintenance').length,
        expiring: documents.filter(d => d.expiry_date && new Date(d.expiry_date) <= thirtyDays && new Date(d.expiry_date) > today).length,
        expired: documents.filter(d => d.expiry_date && new Date(d.expiry_date) < today).length,
    }

    // Filter
    const filteredDocuments = useMemo(() => {
        return documents.filter((doc) => {
            // Omni-search
            const searchLower = searchQuery.toLowerCase()
            const matchesSearch = !searchQuery || [
                doc.document_type,
                doc.vehicle?.license_plate,
                doc.vehicle?.make,
                doc.vehicle?.model,
                doc.vehicle?.vin_number,
                doc.driver?.full_name,
                doc.job?.job_number,
                doc.job?.notes,
                doc.job?.external_job_ref,
                doc.job?.customer_name,
                doc.job?.manifest_number,
                doc.maintenance?.description,
                doc.maintenance?.mechanic_notes,
                new Date(doc.created_at).toLocaleDateString(),
                doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString() : ''
            ].some(val => val?.toLowerCase().includes(searchLower))

            const matchesEntity = entityFilter === 'all' || doc.entity_type === entityFilter
            const matchesType = typeFilter === 'all' || doc.document_type?.toLowerCase() === typeFilter

            // Date Range Intersection
            let matchesDate = true
            if (dateRange?.from || dateRange?.to) {
                const docDateRaw = dateFilterType === 'created' ? doc.created_at : doc.expiry_date
                if (!docDateRaw) {
                    matchesDate = false // if filtering by expiry and no expiry date exists, exclude
                } else {
                    const docDate = new Date(docDateRaw).getTime()
                    if (dateRange.from) {
                        const start = new Date(dateRange.from).getTime()
                        if (docDate < start) matchesDate = false
                    }
                    if (dateRange.to) {
                        const end = new Date(dateRange.to)
                        end.setHours(23, 59, 59, 999)
                        if (docDate > end.getTime()) matchesDate = false
                    }
                }
            }

            return matchesSearch && matchesEntity && matchesType && matchesDate
        })
    }, [documents, searchQuery, entityFilter, typeFilter, dateRange, dateFilterType])

    const handleSelectAll = () => {
        if (selectedDocs.size === filteredDocuments.length) {
            setSelectedDocs(new Set())
        } else {
            setSelectedDocs(new Set(filteredDocuments.map(d => d.id)))
        }
    }

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedDocs)
        if (newSelected.has(id)) newSelected.delete(id)
        else newSelected.add(id)
        setSelectedDocs(newSelected)
    }

    const handleBulkDownload = () => {
        const docsToDownload = documents.filter(d => selectedDocs.has(d.id) && d.file_url)
        docsToDownload.forEach(doc => {
            if (doc.file_url) {
                // Simulated bulk download - opens links in new tabs
                window.open(doc.file_url, '_blank')
            }
        })
        setSelectedDocs(new Set())
    }

    const quickTypes = ['bol', 'pod', 'insurance', 'license', 'receipt']

    const activeFilterCount = (typeFilter !== 'all' ? 1 : 0) + (dateRange?.from || dateRange?.to ? 1 : 0)

    return (
        <div className="flex flex-col gap-4 sm:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Document Library</h1>
                    <p className="text-muted-foreground text-sm">Centralized hub for all your fleet paperwork</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedDocs.size > 0 && (
                        <Button variant="outline" onClick={handleBulkDownload} className="gap-2">
                            <Download className="w-4 h-4" />
                            Download ({selectedDocs.size})
                        </Button>
                    )}
                    <UploadDialog />
                </div>
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

            {/* Search and Advanced Filters */}
            <div className="flex flex-col gap-3 z-10">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                            placeholder="Search by manifest, job number, driver name, notes, date..."
                            className="pl-10 py-6 text-lg bg-background shadow-sm rounded-xl"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
                        <PopoverTrigger asChild>
                            <Button 
                                variant={activeFilterCount > 0 ? 'default' : 'outline'} 
                                className="h-auto px-4 py-2 rounded-xl shadow-sm gap-2 relative"
                            >
                                <SlidersHorizontal className="h-5 w-5" />
                                <span className="hidden sm:inline">Filters</span>
                                {activeFilterCount > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold border-2 border-background shadow-sm">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-[340px] p-5 space-y-5 rounded-xl shadow-lg mt-2">
                            <div className="space-y-1.5">
                                <h4 className="font-semibold leading-none">Advanced Filters</h4>
                                <p className="text-sm text-muted-foreground">Refine your document search.</p>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Document Type</label>
                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                    <SelectTrigger className="w-full">
                                        <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                                        <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        {quickTypes.map(t => (
                                            <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date Range</label>
                                    <Select value={dateFilterType} onValueChange={(v: any) => setDateFilterType(v)}>
                                        <SelectTrigger className="w-[110px] h-6 text-[10px] bg-muted border-none shadow-none focus:ring-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="created">Upload Date</SelectItem>
                                            <SelectItem value="expiry">Expiry Date</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <DatePickerWithRange date={dateRange} setDate={setDateRange} className="w-full [&>button]:w-full" />
                            </div>

                            <div className="pt-2">
                                <Button 
                                    variant="outline" 
                                    className="w-full text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        setTypeFilter('all');
                                        setDateRange(undefined);
                                        setEntityFilter('all');
                                        setSearchQuery('');
                                    }}
                                >
                                    <X className="h-4 w-4 mr-2" /> Clear All Filters
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {/* Quick Entity Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 w-full mt-[-8px]">
                <Badge 
                    variant={entityFilter === 'all' ? 'default' : 'outline'} 
                    className="cursor-pointer whitespace-nowrap text-sm px-3 py-1"
                    onClick={() => setEntityFilter('all')}
                >All ({stats.total})</Badge>
                <Badge 
                    variant={entityFilter === 'job' ? 'default' : 'outline'} 
                    className="cursor-pointer whitespace-nowrap hover:opacity-80 text-sm px-3 py-1"
                    style={{ backgroundColor: entityFilter === 'job' ? 'hsl(var(--status-success))' : 'transparent', color: entityFilter === 'job' ? 'white' : 'inherit', borderColor: 'hsl(var(--status-success))' }}
                    onClick={() => setEntityFilter('job')}
                >Jobs ({stats.jobs})</Badge>
                <Badge 
                    variant={entityFilter === 'driver' ? 'default' : 'outline'} 
                    className="cursor-pointer whitespace-nowrap hover:opacity-80 text-sm px-3 py-1"
                    style={{ backgroundColor: entityFilter === 'driver' ? 'hsl(var(--status-info))' : 'transparent', color: entityFilter === 'driver' ? 'white' : 'inherit', borderColor: 'hsl(var(--status-info))' }}
                    onClick={() => setEntityFilter('driver')}
                >Drivers ({stats.drivers})</Badge>
                <Badge 
                    variant={entityFilter === 'vehicle' ? 'default' : 'outline'} 
                    className="cursor-pointer whitespace-nowrap hover:opacity-80 text-sm px-3 py-1"
                    style={{ backgroundColor: entityFilter === 'vehicle' ? 'hsl(var(--accent-purple))' : 'transparent', color: entityFilter === 'vehicle' ? 'white' : 'inherit', borderColor: 'hsl(var(--accent-purple))' }}
                    onClick={() => setEntityFilter('vehicle')}
                >Vehicles ({stats.vehicles})</Badge>
                <Badge 
                    variant={entityFilter === 'maintenance' ? 'default' : 'outline'} 
                    className="cursor-pointer whitespace-nowrap hover:opacity-80 text-sm px-3 py-1"
                    style={{ backgroundColor: entityFilter === 'maintenance' ? '#f59e0b' : 'transparent', color: entityFilter === 'maintenance' ? 'white' : '#b45309', borderColor: '#fcd34d' }}
                    onClick={() => setEntityFilter('maintenance')}
                >Maintenance ({stats.maintenance})</Badge>
            </div>

            {/* Documents List Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-8 px-2 text-muted-foreground border">
                        {selectedDocs.size === filteredDocuments.length && filteredDocuments.length > 0 ? (
                            <CheckSquare className="w-4 h-4 mr-2 text-primary" />
                        ) : (
                            <Square className="w-4 h-4 mr-2" />
                        )}
                        Select All
                    </Button>
                    <span className="text-sm text-muted-foreground font-medium">{filteredDocuments.length} documents found</span>
                </div>
                
                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md border">
                    <Button 
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={cn("h-7 px-2", viewMode === 'grid' ? "bg-background shadow-sm" : "")} 
                        onClick={() => setViewMode('grid')}
                    >
                        <LayoutGrid className="h-4 w-4 mr-1.5" /> Grid
                    </Button>
                    <Button 
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                        size="sm" 
                        className={cn("h-7 px-2", viewMode === 'list' ? "bg-background shadow-sm" : "")} 
                        onClick={() => setViewMode('list')}
                    >
                        <List className="h-4 w-4 mr-1.5" /> List
                    </Button>
                </div>
            </div>

            {filteredDocuments.length === 0 ? (
                <Card className="p-8 sm:p-12 text-center border-dashed">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <h3 className="text-lg font-semibold">No documents found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Try adjusting your search terms or filters.
                    </p>
                </Card>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-10">
                    {filteredDocuments.map((doc) => (
                        <DocumentCard 
                            key={doc.id} 
                            document={doc} 
                            isSelected={selectedDocs.has(doc.id)}
                            onToggleSelect={() => toggleSelect(doc.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="border rounded-xl overflow-hidden bg-card shadow-sm pb-10">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase border-b">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                    </th>
                                    <th className="px-4 py-3 font-medium">Document</th>
                                    <th className="px-4 py-3 font-medium">Related Entity</th>
                                    <th className="px-4 py-3 font-medium">Date Added</th>
                                    <th className="px-4 py-3 font-medium">Expiry</th>
                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredDocuments.map(doc => {
                                    const isExpired = doc.expiry_date && new Date(doc.expiry_date) < today;
                                    const isExpiringSoon = doc.expiry_date && !isExpired && new Date(doc.expiry_date) <= thirtyDays;
                                    const isImage = doc.file_url && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_url);

                                    return (
                                        <tr key={doc.id} className={cn("hover:bg-muted/30 transition-colors cursor-pointer group", selectedDocs.has(doc.id) ? "bg-primary/5" : "")} onClick={() => toggleSelect(doc.id)}>
                                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                <div className="cursor-pointer" onClick={() => toggleSelect(doc.id)}>
                                                    {selectedDocs.has(doc.id) ? <CheckSquare className="w-5 h-5 text-primary" /> : <Square className="w-5 h-5 text-muted-foreground/50 group-hover:text-muted-foreground" />}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                <div className="flex items-center gap-3">
                                                    {isImage ? (
                                                        <div className="w-10 h-10 rounded shrink-0 relative overflow-hidden bg-muted border shadow-sm">
                                                            <Image src={doc.file_url!} alt="" fill className="object-cover" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-10 h-10 rounded flex items-center justify-center shrink-0 bg-muted border shadow-sm">
                                                            <FileText className="w-5 h-5 text-muted-foreground/70" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold text-foreground truncate max-w-[200px]">{doc.document_type || 'Unknown'}</p>
                                                        {isExpired && <span className="text-[10px] text-status-error font-medium">Expired</span>}
                                                        {isExpiringSoon && <span className="text-[10px] text-status-warning font-medium">Expiring Soon</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {doc.job ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-status-success-muted text-status-success">Job {doc.job.job_number}</span>
                                                ) : doc.driver ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-status-info-muted text-status-info">Driver: {doc.driver.full_name}</span>
                                                ) : doc.vehicle ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-accent-purple-muted text-accent-purple">Vehicle: {doc.vehicle.license_plate}</span>
                                                ) : doc.maintenance ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Maint</span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(doc.created_at).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {doc.expiry_date ? (
                                                    <span className={cn(isExpired ? "text-status-error font-medium" : isExpiringSoon ? "text-status-warning font-medium" : "text-muted-foreground")}>
                                                        {new Date(doc.expiry_date).toLocaleDateString()}
                                                    </span>
                                                ) : <span className="text-muted-foreground/50">-</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                                                {doc.file_url && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => window.open(doc.file_url!, '_blank')} title="View Document">
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
