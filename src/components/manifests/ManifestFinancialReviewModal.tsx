'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Copy, ArrowRight, ChevronLeft } from 'lucide-react'
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
        if (!currentJob || isAlreadyAuthorized) return

        let distance = currentJob.routes?.distance_km || 0
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
    }, [currentJob, isAlreadyAuthorized])

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

    const handleNext = () => {
        if (isLastJob) {
            toast.success('All jobs in manifest have been reviewed!')
            onClose()
        } else {
            setCurrentIndex(prev => prev + 1)
        }
    }

    const totalCost = Number(formValues.fuel_cost) + Number(formValues.toll_cost) +
        Number(formValues.driver_cost) + Number(formValues.other_costs)
    const profit = Number(formValues.revenue) - totalCost

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
                    /* ──── EDITABLE FORM for pending jobs ──── */
                    <div className="flex-1 overflow-y-auto py-4 px-1 space-y-6">
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
                            <h3 className="font-semibold text-sm text-red-700 border-b border-red-100 pb-2">Verified Job Costs</h3>

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

                        {/* Summary */}
                        <div className="bg-slate-100 p-3 rounded-lg flex justify-between items-center text-sm font-semibold">
                            <span>Total Cost:</span>
                            <span className="text-red-700">{formatCurrency(totalCost)}</span>
                        </div>
                        <div className={`p-3 rounded-lg flex justify-between items-center text-sm font-semibold ${profit >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            <span>Net Profit:</span>
                            <span>{formatCurrency(profit)}</span>
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
