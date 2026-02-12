'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Clock, CheckCircle2, Truck, Filter, ListChecks, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Manifest } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ManifestListProps {
    initialData: Manifest[]
}

export function ManifestList({ initialData }: ManifestListProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    const manifests = initialData || []

    const stats = {
        total: manifests.length,
        scheduled: manifests.filter((m) => m.status === 'scheduled').length,
        inTransit: manifests.filter((m) => m.status === 'in_transit').length,
        completed: manifests.filter((m) => m.status === 'completed').length,
    }

    const filteredManifests = manifests.filter((manifest) => {
        const matchesSearch =
            manifest.manifest_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (manifest as any).drivers?.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (manifest as any).vehicles?.license_plate?.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === 'all' || manifest.status === statusFilter
        return matchesSearch && matchesStatus
    })

    const getStatusColor = (status: string | null) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800'
            case 'in_transit': return 'bg-blue-100 text-blue-800'
            case 'scheduled': return 'bg-yellow-100 text-yellow-800'
            case 'draft': return 'bg-gray-100 text-gray-800'
            case 'cancelled': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manifests</h1>
                    <p className="text-muted-foreground text-sm">Manage consolidated trips and job groups</p>
                </div>
                <Button
                    onClick={() => router.push('/dashboard/dispatch')}
                    variant="outline"
                    className="gap-2 w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4" />
                    Create in Dispatch
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'all' ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted'}`}
                    onClick={() => setStatusFilter('all')}
                >
                    <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'scheduled' ? 'bg-yellow-50 border-yellow-200' : 'hover:bg-muted'}`}
                    onClick={() => setStatusFilter('scheduled')}
                >
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <span className="text-xs text-muted-foreground">Scheduled</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.scheduled}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'in_transit' ? 'bg-blue-50 border-blue-200' : 'hover:bg-muted'}`}
                    onClick={() => setStatusFilter('in_transit')}
                >
                    <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <span className="text-xs text-muted-foreground">In Transit</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.inTransit}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'completed' ? 'bg-green-50 border-green-200' : 'hover:bg-muted'}`}
                    onClick={() => setStatusFilter('completed')}
                >
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-xs text-muted-foreground">Completed</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.completed}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search manifests..."
                        className="pl-9 bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* List */}
            {filteredManifests.length === 0 ? (
                <div className="text-center py-12 rounded-lg border border-dashed">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold">No manifests found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery ? 'Try a different search term' : 'Create your first manifest to consolidate jobs.'}
                    </p>
                    {!searchQuery && (
                        <Button
                            className="mt-4 gap-2"
                            onClick={() => router.push('/dashboard/manifests/builder')}
                        >
                            <Plus className="h-4 w-4" />
                            Create Manifest
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredManifests.map((manifest: any) => (
                        <Card
                            key={manifest.id}
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => router.push(`/dashboard/manifests/${manifest.id}`)}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {manifest.manifest_number}
                                </CardTitle>
                                <Badge className={getStatusColor(manifest.status)} variant="secondary">
                                    {manifest.status?.replace('_', ' ')}
                                </Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2 text-sm mt-2">
                                    <div className="flex items-center text-muted-foreground mb-1">
                                        <Truck className="mr-2 h-4 w-4" />
                                        {manifest.vehicles ? (
                                            <span>{manifest.vehicles.make} {manifest.vehicles.model} ({manifest.vehicles.license_plate})</span>
                                        ) : (
                                            <span className="text-muted-foreground/60">No vehicle assigned</span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-muted-foreground">
                                        <span className="flex items-center">
                                            <ListChecks className="mr-2 h-4 w-4" />
                                            {manifest.jobs ? manifest.jobs.length : 0} Jobs
                                        </span>
                                        <span className="flex items-center text-xs">
                                            <Clock className="mr-1 h-3 w-3" />
                                            {manifest.created_at ? new Date(manifest.created_at).toLocaleDateString() : '-'}
                                        </span>
                                    </div>

                                    {manifest.drivers && (
                                        <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                                            <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold overflow-hidden">
                                                {manifest.drivers.profiles?.full_name?.[0] || 'D'}
                                            </div>
                                            <span className="text-sm font-medium">{manifest.drivers.profiles?.full_name || 'Unknown Driver'}</span>
                                        </div>
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
