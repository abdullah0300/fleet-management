'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Package, Clock, CheckCircle2, Truck, Filter, CircleDot, AlertCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { JobCard } from '@/components/jobs/JobCard'
import { Card, CardContent } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Job } from '@/types/database'
import { cn } from '@/lib/utils'

interface JobsListProps {
    initialData: Job[]
}

export function JobsList({ initialData }: JobsListProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    // Use initialData from server
    const jobs = initialData

    // Overdue = scheduled_date is in the past AND status is pending or assigned
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isJobOverdue = (job: any) =>
        job.scheduled_date &&
        new Date(job.scheduled_date) < today &&
        ['pending', 'assigned'].includes(job.status)

    // Stats from initial data
    const stats = {
        total: jobs.length,
        pending: jobs.filter((j) => j.status === 'pending').length,
        inProgress: jobs.filter((j) => j.status === 'in_progress').length,
        pendingReview: jobs.filter((j) => j.financial_status === 'pending_review').length,
        completed: jobs.filter((j) => j.status === 'completed' && j.financial_status === 'approved').length,
        overdue: (jobs as any[]).filter(isJobOverdue).length,
    }

    // Filter jobs
    const filteredJobs = (jobs as any[]).filter((job) => {
        const matchesSearch =
            job.job_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (job.customers?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || job.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()))

        let matchesStatus = false;
        if (statusFilter === 'all') {
            matchesStatus = true;
        } else if (statusFilter === 'overdue') {
            matchesStatus = isJobOverdue(job);
        } else if (statusFilter === 'pending_review') {
            matchesStatus = job.financial_status === 'pending_review';
        } else if (statusFilter === 'completed') {
            matchesStatus = job.status === 'completed' && job.financial_status === 'approved';
        } else {
            matchesStatus = job.status === statusFilter;
        }

        return matchesSearch && matchesStatus
    })

    const StatCard = ({
        label,
        value,
        icon: Icon,
        active,
        type
    }: {
        label: string;
        value: number;
        icon: any;
        active: boolean;
        type: 'total' | 'pending' | 'in_progress' | 'pending_review' | 'completed' | 'overdue'
    }) => {
        const styles = {
            total: {
                bg: 'bg-accent-purple-muted',
                border: 'border-accent-purple/40',
                text: 'text-accent-purple',
                hover: 'hover:bg-accent-purple-muted/50'
            },
            pending: {
                bg: 'bg-amber-100',
                border: 'border-amber-200',
                text: 'text-amber-600',
                hover: 'hover:bg-amber-50'
            },
            in_progress: {
                bg: 'bg-blue-100',
                border: 'border-blue-200',
                text: 'text-blue-600',
                hover: 'hover:bg-blue-50'
            },
            pending_review: {
                bg: 'bg-orange-100',
                border: 'border-orange-200',
                text: 'text-orange-600',
                hover: 'hover:bg-orange-50'
            },
            completed: {
                bg: 'bg-green-100',
                border: 'border-green-200',
                text: 'text-green-600',
                hover: 'hover:bg-green-50'
            },
            overdue: {
                bg: 'bg-red-100',
                border: 'border-red-300',
                text: 'text-red-600',
                hover: 'hover:bg-red-50'
            }
        }

        const style = styles[type]

        return (
            <Card
                className={cn(
                    "cursor-pointer transition-all border shadow-sm",
                    active ? cn(style.bg, style.border) : cn("hover:bg-muted/50", style.hover)
                )}
                onClick={() => setStatusFilter(type === 'total' ? 'all' : type)}
            >
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground font-medium">{label}</p>
                        <p className="text-2xl font-bold mt-1">{value}</p>
                    </div>
                    <div className={cn("p-2 rounded-full", active ? "bg-white/50" : "bg-muted")}>
                        <Icon className={cn("h-4 w-4", style.text)} />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] gap-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Jobs</h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span>{stats.total} Total Jobs</span>
                        <span>•</span>
                        <span>{stats.inProgress} Active</span>
                    </div>
                </div>
                <Button
                    onClick={() => router.push('/dashboard/dispatch')}
                    className="gap-2"
                    size="lg"
                >
                    <Plus className="h-4 w-4" />
                    Create in Dispatch
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <StatCard
                    label="Total Jobs"
                    value={stats.total}
                    icon={Package}
                    active={statusFilter === 'all'}
                    type="total"
                />
                <StatCard
                    label="Pending"
                    value={stats.pending}
                    icon={Clock}
                    active={statusFilter === 'pending'}
                    type="pending"
                />
                <StatCard
                    label="In Progress"
                    value={stats.inProgress}
                    icon={Truck}
                    active={statusFilter === 'in_progress'}
                    type="in_progress"
                />
                <StatCard
                    label="Overdue"
                    value={stats.overdue}
                    icon={AlertTriangle}
                    active={statusFilter === 'overdue'}
                    type="overdue"
                />
                <StatCard
                    label="Pending Review"
                    value={stats.pendingReview}
                    icon={AlertCircle}
                    active={statusFilter === 'pending_review'}
                    type="pending_review"
                />
                <StatCard
                    label="Completed"
                    value={stats.completed}
                    icon={CheckCircle2}
                    active={statusFilter === 'completed'}
                    type="completed"
                />
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col gap-4 flex-1 min-h-0">
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search jobs by number or customer..."
                            className="pl-9 bg-background"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[180px] bg-background">
                            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="All Jobs" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Jobs</SelectItem>
                            <SelectItem value="overdue">⚠ Overdue</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="assigned">Assigned</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="pending_review">Pending Review</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Scrollable Grid */}
                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                    {filteredJobs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg bg-muted/30">
                            <div className="bg-muted p-4 rounded-full mb-4">
                                <Search className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold">No jobs found</h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                                {searchQuery
                                    ? `No jobs found matching "${searchQuery}"`
                                    : statusFilter !== 'all'
                                        ? `No ${statusFilter.replace('_', ' ')} jobs found`
                                        : "Get started by creating your first job"}
                            </p>
                            {!searchQuery && statusFilter === 'all' && (
                                <Button
                                    className="mt-4 gap-2"
                                    onClick={() => router.push('/dashboard/dispatch')}
                                    variant="outline"
                                >
                                    <Plus className="h-4 w-4" />
                                    Create in Dispatch
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
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
            </div>
        </div>
    )
}
