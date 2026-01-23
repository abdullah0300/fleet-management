'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Package, Clock, CheckCircle2, Truck, XCircle, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { JobCard } from '@/components/jobs/JobCard'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Job } from '@/types/database'

interface JobsListProps {
    initialData: Job[]
}

export function JobsList({ initialData }: JobsListProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    // Use initialData from server
    const jobs = initialData

    // Stats from initial data
    const stats = {
        total: jobs.length,
        pending: jobs.filter((j) => j.status === 'pending').length,
        inProgress: jobs.filter((j) => j.status === 'in_progress').length,
        completed: jobs.filter((j) => j.status === 'completed').length,
    }

    // Filter jobs
    const filteredJobs = (jobs as any[]).filter((job) => {
        const matchesSearch =
            job.job_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.customer_name?.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = statusFilter === 'all' || job.status === statusFilter
        return matchesSearch && matchesStatus
    })

    return (
        <div className="flex flex-col gap-4 sm:gap-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Jobs</h1>
                    <p className="text-muted-foreground text-sm">Manage delivery jobs</p>
                </div>
                <Button
                    onClick={() => router.push('/dashboard/jobs/new')}
                    className="gap-2 w-full sm:w-auto"
                >
                    <Plus className="h-4 w-4" />
                    Create Job
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'all' ? 'bg-accent-purple-muted border-accent-purple/40' : 'hover:bg-accent-purple-muted/50'}`}
                    onClick={() => setStatusFilter('all')}
                >
                    <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-accent-purple" />
                        <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.total}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'pending' ? 'bg-status-warning-muted border-status-warning/40' : 'hover:bg-status-warning-muted/50'}`}
                    onClick={() => setStatusFilter('pending')}
                >
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-status-warning" />
                        <span className="text-xs text-muted-foreground">Pending</span>
                    </div>
                    <p className="text-2xl font-bold mt-1">{stats.pending}</p>
                </div>
                <div
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${statusFilter === 'in_progress' ? 'bg-status-info-muted border-status-info/40' : 'hover:bg-status-info-muted/50'}`}
                    onClick={() => setStatusFilter('in_progress')}
                >
                    <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-status-info" />
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
                        placeholder="Search jobs..."
                        className="pl-9 bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All Jobs" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Jobs</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Jobs List */}
            {filteredJobs.length === 0 ? (
                <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold">No jobs found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        {searchQuery ? 'Try a different search term' : 'Create your first job'}
                    </p>
                    {!searchQuery && (
                        <Button
                            className="mt-4 gap-2"
                            onClick={() => router.push('/dashboard/jobs/new')}
                        >
                            <Plus className="h-4 w-4" />
                            Create Job
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredJobs.map((job: any) => (
                        <JobCard
                            key={job.id}
                            job={job}
                            onViewDetails={() => router.push(`/dashboard/jobs/${job.id}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
