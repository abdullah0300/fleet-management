'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    CheckCircle2, Copy, ArrowRight, ChevronLeft, FileText,
    Image as ImageIcon, DollarSign, PieChart, TrendingUp
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { JobWithRelations, useUpdateJob } from '@/hooks/useJobs'
import { calculateJobCosts, useSaveCostEstimate, useJobCostEstimate } from '@/hooks/useCostEstimates'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

interface ManifestFinancialReviewModalProps {
    isOpen: boolean
    onClose: () => void
    manifestId: string
    jobs: JobWithRelations[]
}

export function ManifestFinancialReviewModal({ isOpen, onClose, manifestId, jobs }: ManifestFinancialReviewModalProps) {
    // Show ALL completed jobs (not filtering out approved ones)
    const allJobs = useMemo(() =>
        (jobs || []).filter((j: JobWithRelations) => j.status === 'completed'),
        [jobs]
    )

    const [currentIndex, setCurrentIndex] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form values for the CURRENT job being edited
    const [formValues, setFormValues] = useState({
        revenue: '0',
        fuel_cost: '0',
        toll_cost: '0',
        driver_cost: '0',
        other_costs: '0'
    })
    const [estimatedCosts, setEstimatedCosts] = useState({
        fuel_cost: 0,
        toll_cost: 0,
        driver_cost: 0,
        other_costs: 0
    })

    const [showSummary, setShowSummary] = useState(false)
    const [summaryData, setSummaryData] = useState({
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        jobCount: 0
    })

    const updateJob = useUpdateJob()
    const saveCostEstimate = useSaveCostEstimate()

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(0)
        }
    }, [isOpen])

    // Recalculate estimates when current job changes
    const currentJob = allJobs[currentIndex]
    const isAlreadyAuthorized = currentJob?.financial_status === 'approved'
    const isLastJob = currentIndex === allJobs.length - 1

    useEffect(() => {
        if (!currentJob || isAlreadyAuthorized || showSummary) return

        // Calculate actual distance if odometer data exists, otherwise use planned
        let distance = currentJob.routes?.distance_km || 0
        if (currentJob.trips && currentJob.trips.length > 0) {
            const trip = currentJob.trips[0]
            if (trip.start_odometer && trip.end_odometer) {
                distance = Math.max(0, trip.end_odometer - trip.start_odometer)
            }
        }

        const estimates = calculateJobCosts(
            currentJob, currentJob.vehicles, currentJob.drivers,
            currentJob.routes, distance, 0
        )

        setEstimatedCosts({
            fuel_cost: estimates.fuel_cost || 0,
            toll_cost: estimates.toll_cost || 0,
            driver_cost: estimates.driver_cost || 0,
            other_costs: estimates.other_costs || 0
        })

        setFormValues({
            revenue: (currentJob.revenue || 0).toString(),
            fuel_cost: (estimates.fuel_cost || 0).toFixed(2),
            toll_cost: (estimates.toll_cost || 0).toFixed(2),
            driver_cost: (estimates.driver_cost || 0).toFixed(2),
            other_costs: (estimates.other_costs || 0).toFixed(2)
        })
    }, [currentJob, isAlreadyAuthorized, showSummary])

    if (!isOpen || allJobs.length === 0) {
        if (isOpen && (jobs || []).length > 0) {
            // No completed jobs
            setTimeout(() => {
                toast.info('No completed jobs to review.')
                onClose()
            }, 0)
        }
        return null
    }

    const handleApplyEstimate = (field: keyof typeof estimatedCosts) => {
        setFormValues(prev => ({ ...prev, [field]: estimatedCosts[field].toFixed(2) }))
    }

    const handleAuthorizeAndNext = async () => {
        if (!currentJob) return
        setIsSubmitting(true)
        try {
            // 1. Update job with revenue and financial_status
            await updateJob.mutateAsync({
                id: currentJob.id,
                updates: {
                    revenue: Number(formValues.revenue),
                    financial_status: 'approved'
                }
            })

            // 2. Save verified cost estimate
            // Check if a cost estimate already exists for this job
            const { data: existingEst } = await supabase
                .from('cost_estimates')
                .select('id')
                .eq('job_id', currentJob.id)
                .maybeSingle()

            const costPayload: any = {
                job_id: currentJob.id,
                driver_id: currentJob.driver_id,
                vehicle_id: currentJob.vehicle_id,
                fuel_cost: Number(formValues.fuel_cost),
                toll_cost: Number(formValues.toll_cost),
                driver_cost: Number(formValues.driver_cost),
                other_costs: Number(formValues.other_costs),
                total_cost: Number(formValues.fuel_cost) + Number(formValues.toll_cost) +
                    Number(formValues.driver_cost) + Number(formValues.other_costs),
                status: 'final'
            }

            if (existingEst?.id) {
                costPayload.id = existingEst.id
            }

            await saveCostEstimate.mutateAsync(costPayload)

            toast.success(`Job ${currentJob.job_number} authorized!`)

            // Move to next or close
            if (isLastJob) {
                toast.success('All jobs in manifest have been reviewed!')
                onClose()
            } else {
                setCurrentIndex(prev => prev + 1)
            }
        } catch (err: any) {
            toast.error('Failed to authorize: ' + err.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleNext = async () => {
        if (isLastJob) {
            // Fetch final manifest stats before showing summary
            const { data: finalJobs } = await supabase
                .from('jobs')
                .select(`
                    revenue,
                    cost_estimates (total_cost)
                `)
                .eq('manifest_id', manifestId)
                .eq('financial_status', 'approved')

            if (finalJobs) {
                const rev = finalJobs.reduce((acc, j) => acc + Number(j.revenue || 0), 0)
                const cost = finalJobs.reduce((acc, j) => {
                    const est = (j as any).cost_estimates?.[0] || (j as any).cost_estimates
                    return acc + Number(est?.total_cost || 0)
                }, 0)

                setSummaryData({
                    totalRevenue: rev,
                    totalCost: cost,
                    totalProfit: rev - cost,
                    jobCount: finalJobs.length
                })
            }
            setShowSummary(true)
        } else {
            setCurrentIndex(prev => prev + 1)
        }
    }

    const totalCost = Number(formValues.fuel_cost) + Number(formValues.toll_cost) +
        Number(formValues.driver_cost) + Number(formValues.other_costs)
    const profit = Number(formValues.revenue) - totalCost

    if (showSummary) {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl flex items-center gap-2">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                            Manifest Financial Summary
                        </DialogTitle>
                        <DialogDescription>
                            All {summaryData.jobCount} jobs have been processed and authorized.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                                <p className="text-xs text-green-600 uppercase font-bold tracking-wider mb-1">Total Revenue</p>
                                <p className="text-2xl font-bold text-green-700">{formatCurrency(summaryData.totalRevenue)}</p>
                            </div>
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100">
                                <p className="text-xs text-red-600 uppercase font-bold tracking-wider mb-1">Total Operating Cost</p>
                                <p className="text-2xl font-bold text-red-700">{formatCurrency(summaryData.totalCost)}</p>
                            </div>
                        </div>

                        <div className="p-6 rounded-xl bg-slate-900 text-white shadow-xl flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Net Manifest Profit</p>
                                <p className="text-3xl font-bold">{formatCurrency(summaryData.totalProfit)}</p>
                            </div>
                            <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center">
                                <PieChart className="h-7 w-7 text-green-400" />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-2">
                        <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                            Finish & Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="px-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-xl">
                                Manifest Review: Job {currentIndex + 1} of {allJobs.length}
                            </DialogTitle>
                            <DialogDescription>
                                {currentJob?.job_number} • {currentJob?.customer_name || 'No Customer'}
                                {!isLastJob && ` • Next: Job ${currentIndex + 2}`}
                            </DialogDescription>
                        </div>
                        {isAlreadyAuthorized && (
                            <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Already Authorized
                            </Badge>
                        )}
                    </div>
                    {/* Progress dots */}
                    <div className="flex gap-1.5 pt-3">
                        {allJobs.map((j, idx) => (
                            <div
                                key={j.id}
                                className={`h-2 flex-1 rounded-full transition-colors ${idx === currentIndex
                                    ? 'bg-blue-600'
                                    : idx < currentIndex
                                        ? 'bg-green-500'
                                        : j.financial_status === 'approved'
                                            ? 'bg-green-300'
                                            : 'bg-slate-200'
                                    }`}
                            />
                        ))}
                    </div>
                </DialogHeader>

                {isAlreadyAuthorized ? (
                    /* ──── READ-ONLY VIEW for already-authorized jobs ──── */
                    <div className="flex-1 overflow-y-auto py-6 px-1">
                        <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-4">
                            <div className="flex items-center gap-2 text-green-700 font-semibold">
                                <CheckCircle2 className="h-5 w-5" />
                                This job has already been financially authorized
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="bg-white rounded-lg p-4 border border-green-100">
                                    <div className="text-xs text-muted-foreground mb-1">Revenue</div>
                                    <div className="text-lg font-bold text-green-700">
                                        {formatCurrency(currentJob.revenue || 0)}
                                    </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-green-100">
                                    <div className="text-xs text-muted-foreground mb-1">Status</div>
                                    <div className="text-lg font-bold text-green-700">Approved ✓</div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ──── EDITABLE FORM with Two-Column Proof View ──── */
                    <div className="flex-1 overflow-y-auto py-4 px-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left: Driver Proofs/Receipts */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm text-muted-foreground border-b pb-2">Driver Proofs & Receipts</h3>
                            <div className="space-y-3">
                                {currentJob.proof_of_delivery && currentJob.proof_of_delivery.length > 0 ? (
                                    currentJob.proof_of_delivery.map((pod: any, i: number) => (
                                        <div key={i} className="flex flex-col gap-2 p-3 border rounded-lg bg-slate-50">
                                            <div className="text-sm font-medium capitalize flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-slate-500" />
                                                {pod.type} Support
                                            </div>
                                            {pod.photo_url || pod.signature_url ? (
                                                <div className="flex gap-2 flex-wrap">
                                                    {pod.photo_url && (
                                                        <a href={pod.photo_url} target="_blank" rel="noreferrer" className="block relative w-20 h-20 border rounded overflow-hidden hover:opacity-80 transition-opacity">
                                                            <img src={pod.photo_url} alt="Proof" className="object-cover w-full h-full" />
                                                        </a>
                                                    )}
                                                    {pod.signature_url && (
                                                        <div className="w-20 h-20 border rounded bg-white p-1">
                                                            <img src={pod.signature_url} alt="Signature" className="object-contain w-full h-full grayscale" />
                                                        </div>
                                                    )}
                                                </div>
                                            ) : pod.photos && pod.photos.length > 0 ? (
                                                <div className="flex gap-2 flex-wrap">
                                                    {pod.photos.map((p: string, idx: number) => (
                                                        <a key={idx} href={p} target="_blank" rel="noreferrer" className="block relative w-20 h-20 border rounded overflow-hidden hover:opacity-80 transition-opacity">
                                                            <img src={p} alt="Receipt" className="object-cover w-full h-full" />
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-xs text-muted-foreground italic flex items-center gap-1">
                                                    <ImageIcon className="h-3 w-3" /> No images attached
                                                </div>
                                            )}
                                            {pod.notes && (
                                                <p className="text-xs bg-white p-2 border rounded border-slate-100 text-slate-600">
                                                    <span className="font-bold">Driver Note:</span> {pod.notes}
                                                </p>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-sm text-muted-foreground flex items-center gap-2 p-6 border border-dashed rounded-lg justify-center bg-slate-50/50">
                                        <ImageIcon className="h-5 w-5 opacity-30" />
                                        No POD data yet
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Financial Form */}
                        <div className="space-y-6">
                            {/* Revenue */}
                            <div className="space-y-2">
                                <h3 className="font-semibold text-sm text-green-700 border-b border-green-100 pb-2">Job Revenue</h3>
                                <Label htmlFor="revenue">Confirmed Invoice Amount ($)</Label>
                                <Input
                                    id="revenue"
                                    type="number"
                                    className="font-bold text-lg text-green-700 bg-green-50/50"
                                    value={formValues.revenue}
                                    onChange={(e) => setFormValues(prev => ({ ...prev, revenue: e.target.value }))}
                                />
                            </div>

                            {/* Costs */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-sm text-red-700 border-b border-red-100 pb-2">Verified Costs</h3>

                                {/* Fuel */}
                                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                                    <div className="space-y-2">
                                        <Label className="flex justify-between">
                                            Fuel Cost ($)
                                            <span className="text-xs text-muted-foreground font-normal">Est: {formatCurrency(estimatedCosts.fuel_cost)}</span>
                                        </Label>
                                        <Input type="number" value={formValues.fuel_cost}
                                            onChange={(e) => setFormValues(prev => ({ ...prev, fuel_cost: e.target.value }))} />
                                    </div>
                                    <Button variant="outline" size="icon" onClick={() => handleApplyEstimate('fuel_cost')}>
                                        <Copy className="h-4 w-4 text-slate-400" />
                                    </Button>
                                </div>

                                {/* Tolls */}
                                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                                    <div className="space-y-2">
                                        <Label className="flex justify-between">
                                            Tolls & Fees ($)
                                            <span className="text-xs text-muted-foreground font-normal">Est: {formatCurrency(estimatedCosts.toll_cost)}</span>
                                        </Label>
                                        <Input type="number" value={formValues.toll_cost}
                                            onChange={(e) => setFormValues(prev => ({ ...prev, toll_cost: e.target.value }))} />
                                    </div>
                                    <Button variant="outline" size="icon" onClick={() => handleApplyEstimate('toll_cost')}>
                                        <Copy className="h-4 w-4 text-slate-400" />
                                    </Button>
                                </div>

                                {/* Driver Pay */}
                                <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                                    <div className="space-y-2">
                                        <Label className="flex justify-between">
                                            Driver Pay ($)
                                            <span className="text-xs text-muted-foreground font-normal">Est: {formatCurrency(estimatedCosts.driver_cost)}</span>
                                        </Label>
                                        <Input type="number" value={formValues.driver_cost}
                                            onChange={(e) => setFormValues(prev => ({ ...prev, driver_cost: e.target.value }))} />
                                    </div>
                                    <Button variant="outline" size="icon" onClick={() => handleApplyEstimate('driver_cost')}>
                                        <Copy className="h-4 w-4 text-slate-400" />
                                    </Button>
                                </div>

                                {/* Other */}
                                <div className="space-y-2">
                                    <Label>Other Costs ($)</Label>
                                    <Input type="number" value={formValues.other_costs} placeholder="0.00"
                                        onChange={(e) => setFormValues(prev => ({ ...prev, other_costs: e.target.value }))} />
                                </div>
                            </div>

                            {/* Summary Totals */}
                            <div className="space-y-2 mt-4 pt-2 border-t">
                                <div className="bg-slate-100 p-3 rounded-lg flex justify-between items-center text-sm font-semibold">
                                    <span>Job Total Cost:</span>
                                    <span className="text-red-700">{formatCurrency(totalCost)}</span>
                                </div>
                                <div className={`p-3 rounded-lg flex justify-between items-center text-sm font-semibold ${profit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    <span>Job Net Profit:</span>
                                    <span>{formatCurrency(profit)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="border-t pt-4 flex justify-between items-center mt-2">
                    <div>
                        {currentIndex > 0 && (
                            <Button variant="ghost" size="sm" onClick={() => setCurrentIndex(prev => prev - 1)}>
                                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                        {isAlreadyAuthorized ? (
                            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {isLastJob ? 'Finish Review' : 'Next Job'} <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                        ) : (
                            <Button onClick={handleAuthorizeAndNext} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                {isSubmitting ? 'Authorizing...' : isLastJob ? 'Authorize & Finish' : 'Authorize & Next'}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
