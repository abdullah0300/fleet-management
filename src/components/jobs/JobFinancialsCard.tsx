import { useJobCostEstimate, useJobPayAdjustments } from "@/hooks/useCostEstimates"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { DollarSign, Edit, TrendingUp, TrendingDown, Receipt } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { JobWithRelations } from "@/hooks/useJobs"
import { JobCostEditor } from "./JobCostEditor"
import { useState } from "react"

export function JobFinancialsCard({ job }: { job: JobWithRelations }) {
    const { data: estimate, isLoading } = useJobCostEstimate(job.id)
    const { data: adjustments, isLoading: loadingAdjustments } = useJobPayAdjustments(job.id)
    const [isEditorOpen, setIsEditorOpen] = useState(false)

    if (isLoading || loadingAdjustments) {
        return <Skeleton className="h-[300px] w-full rounded-xl" />
    }

    // Only show if job is completed or if an estimate already exists
    if (job.status !== 'completed' && !estimate) {
        return null
    }

    const revenue = job.revenue || 0

    if (!estimate) {
        return (
            <Card className="border-slate-200">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            Job Financials • {(Array.isArray(job.customers) ? job.customers[0]?.name : job.customers?.name) || job.customer_name || 'No Customer'}
                        </CardTitle>
                        <CardDescription className="text-xs">No cost data available</CardDescription>
                    </div>
                </CardHeader>
            </Card>
        )
    }

    // Calculate totals including adjustments
    const totalAdjustments = (adjustments || []).reduce((sum, adj) => sum + adj.amount, 0)
    const finalCost = estimate.total_cost + totalAdjustments
    const netProfit = revenue - finalCost
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0
    const costPerMile = estimate.distance_km > 0
        // Note: distance_km actually stores distance in miles per our calculation logic
        ? finalCost / estimate.distance_km
        : 0

    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

    return (
        <Card className="border-slate-200 shadow-sm relative overflow-hidden bg-white">
            <div className={`absolute top-0 left-0 w-1.5 h-full ${netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'}`} />
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
                <div className="pl-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-slate-500" />
                        Job Financials • {(Array.isArray(job.customers) ? job.customers[0]?.name : job.customers?.name) || job.customer_name || 'No Customer'}
                    </CardTitle>
                    <CardDescription className="text-xs">Revenue, Costs & Profitability</CardDescription>
                </div>
                {/* We'll implement JobCostEditor in the next phase */}
                <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-600" onClick={() => setIsEditorOpen(true)}>
                    <Edit className="h-3 w-3 mr-1" /> Edit Costs
                </Button>
            </CardHeader>
            <CardContent className="space-y-5 pl-8">
                {/* Revenue Row */}
                <div className="flex justify-between items-center text-sm pb-3 border-b border-slate-100">
                    <span className="font-medium text-slate-700">Total Revenue</span>
                    <span className="font-semibold text-lg">{formatCurrency(revenue)}</span>
                </div>

                {/* Costs Breakdown */}
                <div className="space-y-3">
                    <div className="flex items-center text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        Cost Breakdown
                    </div>

                    <CostRow label="Fuel Cost" amount={estimate.fuel_cost} total={finalCost} />
                    <CostRow label={`Driver Pay (${estimate.driver_payment_type})`} amount={estimate.driver_cost} total={finalCost} />
                    <CostRow label="Toll Cost" amount={estimate.toll_cost} total={finalCost} />
                    {estimate.other_costs ? <CostRow label="Other Costs" amount={estimate.other_costs} total={finalCost} /> : null}

                    {adjustments && adjustments.length > 0 && (
                        <div className="pt-2 mt-2 border-t border-slate-100 space-y-2">
                            {adjustments.map(adj => (
                                <div key={adj.id} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-600 pl-2 border-l-2 border-slate-300">
                                        {adj.label}
                                    </span>
                                    <span className={adj.amount < 0 ? 'text-green-600' : 'text-red-600'}>
                                        {formatCurrency(adj.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between items-center text-sm font-semibold pt-2 border-t border-slate-200">
                        <span>Total Cost</span>
                        <span className="text-red-600">{formatCurrency(finalCost)}</span>
                    </div>
                </div>

                {/* Profitability summary */}
                <div className={`p-4 rounded-lg flex flex-col gap-2 ${netProfit >= 0 ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-700">Net Profit</span>
                        <div className="flex items-center gap-2">
                            {netProfit >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
                            <span className={`text-xl font-bold ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                {formatCurrency(netProfit)}
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Margin</span>
                        <span className={`font-medium ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {profitMargin.toFixed(1)}%
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500">Cost per Mile</span>
                        <span className="font-medium text-slate-700">
                            {formatCurrency(costPerMile)}/mi
                        </span>
                    </div>
                </div>
            </CardContent>

            {isEditorOpen && (
                <JobCostEditor
                    open={isEditorOpen}
                    onOpenChange={setIsEditorOpen}
                    job={job}
                    estimate={estimate}
                    adjustments={adjustments || []}
                />
            )}
        </Card>
    )
}

function CostRow({ label, amount, total }: { label: string, amount: number, total: number }) {
    if (amount === 0) return null
    const percent = total > 0 ? (amount / total) * 100 : 0
    return (
        <div className="group">
            <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-slate-600">{label}</span>
                <span className="font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className="h-full bg-slate-300 rounded-full group-hover:bg-blue-400 transition-colors"
                    style={{ width: `${Math.min(100, percent)}%` }}
                />
            </div>
        </div>
    )
}
