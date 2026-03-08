'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Copy, FileText, Image as ImageIcon } from 'lucide-react'
import { JobWithRelations } from '@/hooks/useJobs'
import { calculateJobCosts } from '@/hooks/useCostEstimates'
import { formatCurrency } from '@/lib/utils'

interface FinancialReviewModalProps {
    job: JobWithRelations
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    onConfirm?: (finalData: {
        revenue: number,
        fuel_cost: number,
        toll_cost: number,
        driver_cost: number,
        other_costs: number
    }) => void
    isSubmitting?: boolean
    titleOverride?: string
    descriptionOverride?: string
    isNested?: boolean
}

export function FinancialReviewModal({
    job, isOpen, onClose, onSuccess, onConfirm, isSubmitting = false,
    titleOverride, descriptionOverride, isNested = false
}: FinancialReviewModalProps) {
    // We run the estimate algorithm locally to get base line numbers.
    // In a real app we'd trigger calculateJobCosts inside a useEffect or rely on previously saved estimates if we still wanted them generated early.
    // Here we provide the estimated fallback based on the final distance.
    const [estimatedCosts, setEstimatedCosts] = useState({
        fuel_cost: 0,
        toll_cost: 0,
        driver_cost: 0,
        other_costs: 0
    })

    const [formValues, setFormValues] = useState({
        revenue: '0',
        fuel_cost: '0',
        toll_cost: '0',
        driver_cost: '0',
        other_costs: '0'
    })

    useEffect(() => {
        if (isOpen && job) {
            // Distance Calculation Fallback
            let distance = 0;
            if (job.vehicles && 'odometer_reading' in job.vehicles) {
                // If we recorded a start/end we would use it, but since we're just reading existing we use the route fallback or actuals if stored.
                // For this example, we'll rely on the existing route's distance.
                distance = job.routes?.distance_km || 0
            }

            // Estimate calculate
            const estimates = calculateJobCosts(job, job.vehicles, job.drivers, job.routes, distance, 0)

            setEstimatedCosts({
                fuel_cost: estimates.fuel_cost || 0,
                toll_cost: estimates.toll_cost || 0,
                driver_cost: estimates.driver_cost || 0,
                other_costs: estimates.other_costs || 0
            })

            // Populate form
            setFormValues({
                revenue: (job.revenue || 0).toString(),
                fuel_cost: (estimates.fuel_cost || 0).toFixed(2).toString(),
                toll_cost: (estimates.toll_cost || 0).toFixed(2).toString(),
                driver_cost: (estimates.driver_cost || 0).toFixed(2).toString(),
                other_costs: (estimates.other_costs || 0).toFixed(2).toString()
            })
        }
    }, [isOpen, job])

    const handleSubmit = async () => {
        if (onConfirm) {
            onConfirm({
                revenue: Number(formValues.revenue),
                fuel_cost: Number(formValues.fuel_cost),
                toll_cost: Number(formValues.toll_cost),
                driver_cost: Number(formValues.driver_cost),
                other_costs: Number(formValues.other_costs)
            })
        } else if (onSuccess) {
            onSuccess() // Let parent handle successful progression
        }
    }

    const handleApplyEstimate = (field: keyof typeof estimatedCosts) => {
        setFormValues(prev => ({ ...prev, [field]: estimatedCosts[field].toFixed(2).toString() }))
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader className="px-1">
                    <DialogTitle className="text-xl">{titleOverride || `Financial Review: Job ${job.job_number}`}</DialogTitle>
                    <DialogDescription>
                        {descriptionOverride || "Carefully review the driver's uploaded receipts and enter the exact costs to finalize the profitability of this job."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 px-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Driver Uploads */}
                    <div className="space-y-4">
                        <h3 className="font-semibold text-sm text-muted-foreground border-b pb-2">Driver Documents & Receipts</h3>
                        <div className="space-y-3">
                            {job.proof_of_delivery && job.proof_of_delivery.length > 0 ? (
                                job.proof_of_delivery.map((pod, i) => (
                                    <div key={i} className="flex flex-col gap-2 p-3 border rounded-lg bg-slate-50">
                                        <div className="text-sm font-medium capitalize flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-slate-500" />
                                            {pod.type} Documents
                                        </div>
                                        {pod.photos && pod.photos.length > 0 ? (
                                            <div className="flex gap-2 flex-wrap">
                                                {pod.photos.map((photo: string, j: number) => (
                                                    <a key={j} href={photo} target="_blank" rel="noreferrer" className="block relative w-20 h-20 border rounded overflow-hidden hover:opacity-80 transition-opacity">
                                                        <img src={photo} alt="Receipt" className="object-cover w-full h-full" />
                                                    </a>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-muted-foreground italic">No photos attached.</div>
                                        )}
                                        {pod.notes && (
                                            <div className="text-xs bg-white p-2 border rounded mt-1">
                                                <span className="font-semibold">Notes:</span> {pod.notes}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-muted-foreground flex items-center gap-2 p-4 border border-dashed rounded-lg justify-center bg-slate-50/50">
                                    <ImageIcon className="h-4 w-4" />
                                    No documents uploaded by driver.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Financial Finalization */}
                    <div className="space-y-6">
                        <h3 className="font-semibold text-sm text-green-700 border-b border-green-100 pb-2">Job Revenue</h3>
                        <div className="space-y-2">
                            <Label htmlFor="revenue">Confirmed Invoice Amount ($)</Label>
                            <Input
                                id="revenue"
                                type="number"
                                className="font-bold text-lg text-green-700 bg-green-50/50"
                                value={formValues.revenue}
                                onChange={(e) => setFormValues(prev => ({ ...prev, revenue: e.target.value }))}
                            />
                        </div>

                        <h3 className="font-semibold text-sm text-red-700 border-b border-red-100 pb-2 mt-6">Verified Job Costs</h3>

                        <div className="space-y-4">
                            {/* Fuel Cost */}
                            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                                <div className="space-y-2 flex-1">
                                    <Label htmlFor="fuel" className="flex justify-between">
                                        Fuel Cost ($)
                                        <span className="text-xs text-muted-foreground font-normal">Est: {formatCurrency(estimatedCosts.fuel_cost)}</span>
                                    </Label>
                                    <Input
                                        id="fuel"
                                        type="number"
                                        value={formValues.fuel_cost}
                                        onChange={(e) => setFormValues(prev => ({ ...prev, fuel_cost: e.target.value }))}
                                    />
                                </div>
                                <Button variant="outline" size="icon" title="Copy Estimate" onClick={() => handleApplyEstimate('fuel_cost')}>
                                    <Copy className="h-4 w-4 text-slate-400" />
                                </Button>
                            </div>

                            {/* Toll Cost */}
                            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                                <div className="space-y-2 flex-1">
                                    <Label htmlFor="toll" className="flex justify-between">
                                        Tolls & Fees ($)
                                        <span className="text-xs text-muted-foreground font-normal">Est: {formatCurrency(estimatedCosts.toll_cost)}</span>
                                    </Label>
                                    <Input
                                        id="toll"
                                        type="number"
                                        value={formValues.toll_cost}
                                        onChange={(e) => setFormValues(prev => ({ ...prev, toll_cost: e.target.value }))}
                                    />
                                </div>
                                <Button variant="outline" size="icon" title="Copy Estimate" onClick={() => handleApplyEstimate('toll_cost')}>
                                    <Copy className="h-4 w-4 text-slate-400" />
                                </Button>
                            </div>

                            {/* Driver Cost */}
                            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                                <div className="space-y-2 flex-1">
                                    <Label htmlFor="driver" className="flex justify-between">
                                        Driver Pay ($)
                                        <span className="text-xs text-muted-foreground font-normal">Est: {formatCurrency(estimatedCosts.driver_cost)}</span>
                                    </Label>
                                    <Input
                                        id="driver"
                                        type="number"
                                        value={formValues.driver_cost}
                                        onChange={(e) => setFormValues(prev => ({ ...prev, driver_cost: e.target.value }))}
                                    />
                                </div>
                                <Button variant="outline" size="icon" title="Copy Estimate" onClick={() => handleApplyEstimate('driver_cost')}>
                                    <Copy className="h-4 w-4 text-slate-400" />
                                </Button>
                            </div>

                            {/* Other Cost */}
                            <div className="space-y-2 flex-1 pt-1">
                                <Label htmlFor="other">Other Costs ($)</Label>
                                <Input
                                    id="other"
                                    type="number"
                                    value={formValues.other_costs}
                                    onChange={(e) => setFormValues(prev => ({ ...prev, other_costs: e.target.value }))}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-slate-100 p-3 rounded-lg flex justify-between items-center text-sm font-semibold mt-4">
                            <span>Total Verified Cost:</span>
                            <span className="text-red-700">
                                {formatCurrency(
                                    Number(formValues.fuel_cost) +
                                    Number(formValues.toll_cost) +
                                    Number(formValues.driver_cost) +
                                    Number(formValues.other_costs)
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="border-t pt-4 flex justify-end gap-3 mt-4">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Authorizing...' : 'Authorize & Finalize'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
