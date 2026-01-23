'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Wrench, AlertTriangle, Clock, CheckCircle2, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { MaintenanceCard } from '@/components/maintenance/MaintenanceCard'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { MaintenanceRecord } from '@/types/database'

interface MaintenanceListProps {
    initialData: MaintenanceRecord[]
}

export function MaintenanceList({ initialData }: MaintenanceListProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    // Use initialData from server
    const records = initialData

    // Stats
    const today = new Date().toISOString().split('T')[0]
    const stats = {
        total: records.length,
        scheduled: records.filter((m) => m.status === 'scheduled').length,
        inProgress: records.filter((m) => m.status === 'in_progress').length,
        completed: records.filter((m) => m.status === 'completed').length,
        overdue: records.filter((m: any) => m.next_service_date && m.next_service_date < today && m.status !== 'completed').length,
    }

    // Filter records
    const filteredRecords = (records as any[]).filter((record) => {
        const matchesSearch =
            record.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            record.vehicles?.registration_number?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === 'all' || record.status === statusFilter
        return matchesSearch && matchesStatus
    })

    return (
        <div className="flex flex-col gap-4 sm:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Maintenance</h1>
                    <p className="text-muted-foreground text-sm">Track and schedule vehicle maintenance</p>
                </div>
                <Button
                    onClick={() => router.push('/dashboard/maintenance/new')}
                    className="gap-2 w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4" />
                    Schedule Service
                </Button>
            </div>

            {/* Overdue Alert */}
            {stats.overdue > 0 && (
                <Card className="border-status-error/50 bg-status-error-muted/30">
                    <CardContent className="p-3 sm:p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-status-error flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-5 w-5 text-status-error-foreground" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold text-status-error">{stats.overdue} Overdue</p>
                            <p className="text-xs text-muted-foreground">Maintenance past due date</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'all' ? 'bg-accent-purple-muted border-accent-purple/40' : 'hover:bg-accent-purple-muted/50'}`}
                    onClick={() => setStatusFilter('all')}
                >
                    <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-accent-purple" />
                        <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'scheduled' ? 'bg-status-warning-muted border-status-warning/40' : 'hover:bg-status-warning-muted/50'}`}
                    onClick={() => setStatusFilter('scheduled')}
                >
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-status-warning" />
                        <span className="text-xs text-muted-foreground">Scheduled</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.scheduled}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'in_progress' ? 'bg-status-info-muted border-status-info/40' : 'hover:bg-status-info-muted/50'}`}
                    onClick={() => setStatusFilter('in_progress')}
                >
                    <div className="flex items-center gap-2">
                        <Wrench className="h-4 w-4 text-status-info" />
                        <span className="text-xs text-muted-foreground">In Progress</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.inProgress}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'completed' ? 'bg-status-success-muted border-status-success/40' : 'hover:bg-status-success-muted/50'}`}
                    onClick={() => setStatusFilter('completed')}
                >
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-status-success" />
                        <span className="text-xs text-muted-foreground">Completed</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.completed}</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by vehicle or description..."
                        className="pl-9 bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All Records" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Records</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Records List */}
            {filteredRecords.length === 0 ? (
                <div className="text-center py-12">
                    <Wrench className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold">No maintenance records</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Schedule your first maintenance service
                    </p>
                    <Button
                        className="mt-4 gap-2"
                        onClick={() => router.push('/dashboard/maintenance/new')}
                    >
                        <Plus className="h-4 w-4" />
                        Schedule Service
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredRecords.map((record: any) => (
                        <MaintenanceCard key={record.id} record={record} />
                    ))}
                </div>
            )}
        </div>
    )
}
