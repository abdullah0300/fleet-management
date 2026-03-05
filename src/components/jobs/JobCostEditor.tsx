import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSaveCostEstimate, useSavePayAdjustment, useDeletePayAdjustment } from "@/hooks/useCostEstimates"
import { JobWithRelations } from "@/hooks/useJobs"
import { CostEstimate, JobPayAdjustment } from "@/types/database"
import { Trash2, Plus, Loader2 } from "lucide-react"

interface JobCostEditorProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    job: JobWithRelations
    estimate: CostEstimate
    adjustments: JobPayAdjustment[]
}

export function JobCostEditor({ open, onOpenChange, job, estimate, adjustments }: JobCostEditorProps) {
    const saveEstimate = useSaveCostEstimate()
    const saveAdjustment = useSavePayAdjustment()
    const deleteAdjustment = useDeletePayAdjustment()

    const [fuelCost, setFuelCost] = useState(estimate.fuel_cost.toString())
    const [driverCost, setDriverCost] = useState(estimate.driver_cost.toString())
    const [tollCost, setTollCost] = useState(estimate.toll_cost.toString())
    const [otherCosts, setOtherCosts] = useState((estimate.other_costs || 0).toString())

    const [newAdjAmount, setNewAdjAmount] = useState('')
    const [newAdjLabel, setNewAdjLabel] = useState('')

    // Reset when opened
    useEffect(() => {
        if (open) {
            setFuelCost(estimate.fuel_cost.toString())
            setDriverCost(estimate.driver_cost.toString())
            setTollCost(estimate.toll_cost.toString())
            setOtherCosts((estimate.other_costs || 0).toString())
        }
    }, [open, estimate])

    const handleSaveCosts = async () => {
        const total = Number(fuelCost) + Number(driverCost) + Number(tollCost) + Number(otherCosts)
        await saveEstimate.mutateAsync({
            id: estimate.id,
            fuel_cost: Number(fuelCost),
            driver_cost: Number(driverCost),
            toll_cost: Number(tollCost),
            other_costs: Number(otherCosts),
            total_cost: total
        })
        onOpenChange(false)
    }

    const handleAddAdjustment = async () => {
        if (!newAdjAmount || !newAdjLabel) return
        await saveAdjustment.mutateAsync({
            job_id: job.id,
            amount: Number(newAdjAmount),
            label: newAdjLabel
        })
        setNewAdjAmount('')
        setNewAdjLabel('')
    }

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Job Costs</DialogTitle>
                    <DialogDescription>
                        Manually override the calculated estimates or add special pay adjustments.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    {/* Base Costs */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-slate-700 border-b pb-1">Base Cost Estimates</h4>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="fuel" className="text-right">Fuel</Label>
                            <div className="col-span-3">
                                <Input id="fuel" type="number" step="0.01" value={fuelCost} onChange={e => setFuelCost(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="driver" className="text-right">Driver</Label>
                            <div className="col-span-3">
                                <Input id="driver" type="number" step="0.01" value={driverCost} onChange={e => setDriverCost(e.target.value)} />
                                <span className="text-[10px] text-muted-foreground ml-1">Rate: {estimate.driver_payment_type}</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="toll" className="text-right">Tolls</Label>
                            <div className="col-span-3">
                                <Input id="toll" type="number" step="0.01" value={tollCost} onChange={e => setTollCost(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="other" className="text-right">Other</Label>
                            <div className="col-span-3">
                                <Input id="other" type="number" step="0.01" value={otherCosts} onChange={e => setOtherCosts(e.target.value)} />
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <Button size="sm" onClick={handleSaveCosts} disabled={saveEstimate.isPending}>
                                {saveEstimate.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Base Costs
                            </Button>
                        </div>
                    </div>

                    {/* Pay Adjustments */}
                    <div className="space-y-3 pt-4 border-t">
                        <h4 className="text-sm font-semibold text-slate-700 border-b pb-1">Driver Pay Adjustments</h4>

                        {adjustments.length > 0 ? (
                            <div className="space-y-2 mb-4">
                                {adjustments.map(adj => (
                                    <div key={adj.id} className="flex justify-between items-center bg-slate-50 p-2 rounded text-sm border">
                                        <span>{adj.label}</span>
                                        <div className="flex items-center gap-3">
                                            <span className={`font-medium ${adj.amount < 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(adj.amount)}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-slate-400 hover:text-red-600"
                                                onClick={() => deleteAdjustment.mutate({ id: adj.id })}
                                                disabled={deleteAdjustment.isPending}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground italic">No adjustments yet.</p>
                        )}

                        <div className="flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs">Adjustment Label</Label>
                                <Input
                                    placeholder="e.g. Detention Pay, Bonus, Toll Reimbursement"
                                    value={newAdjLabel}
                                    onChange={e => setNewAdjLabel(e.target.value)}
                                />
                            </div>
                            <div className="w-24 space-y-1">
                                <Label className="text-xs">Amount ($)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={newAdjAmount}
                                    onChange={e => setNewAdjAmount(e.target.value)}
                                />
                            </div>
                            <Button size="icon" onClick={handleAddAdjustment} disabled={!newAdjLabel || !newAdjAmount || saveAdjustment.isPending}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Tip: Process bonuses as positive numbers and deductions as negative numbers.</p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
