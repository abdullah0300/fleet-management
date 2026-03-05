import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { CostEstimate, JobPayAdjustment } from '@/types/database'
import { format, subDays, isAfter, startOfDay } from 'date-fns'

const supabase = createClient()

export type FinancialTransaction = {
    id: string
    type: 'job' | 'maintenance'
    date: string
    title: string
    subtitle: string
    amount: number
    isPositive: boolean
    details?: string
}

export type DailyFinancialData = {
    date: string
    dateObj: Date
    revenue: number
    costs: number
    maintenance: number
}

export function useFinancials(days: number = 30) {
    return useQuery({
        queryKey: ['financials', 'aggregated', days],
        queryFn: async () => {
            const startDate = subDays(new Date(), days)

            // 1. Fetch completed jobs
            const { data: jobs, error: errJobs } = await supabase
                .from('jobs')
                .select('*')
                .eq('status', 'completed')
                .eq('financial_status', 'approved')
                .gte('updated_at', startDate.toISOString())
                .order('updated_at', { ascending: false })

            if (errJobs) throw errJobs

            // 2. Fetch cost estimates
            const { data: estimates, error: errEst } = await supabase
                .from('cost_estimates')
                .select('*')
                .gte('created_at', startDate.toISOString())

            if (errEst) throw errEst

            // 3. Fetch adjustments
            const { data: adjustments, error: errAdj } = await supabase
                .from('job_pay_adjustments')
                .select('*')
                .gte('created_at', startDate.toISOString())

            if (errAdj) throw errAdj

            // 4. Fetch completed maintenance
            const { data: maintenance, error: errMaint } = await supabase
                .from('maintenance_records')
                .select('*, vehicles(license_plate, make, model)')
                .eq('status', 'completed')
                .gte('service_date', startDate.toISOString())
                .order('service_date', { ascending: false })

            if (errMaint) throw errMaint

            // --- Aggregation ---
            let totalRevenue = 0
            let totalJobCosts = 0
            let fuelTotal = 0
            let driverTotal = 0
            let tollTotal = 0
            let otherTotal = 0

            let totalMaintenanceCosts = 0
            let partsTotal = 0
            let laborTotal = 0

            const transactions: FinancialTransaction[] = []
            const dailyDataMap: Record<string, DailyFinancialData> = {}

            // Pre-fill daily map
            for (let i = 0; i <= days; i++) {
                const dateObj = subDays(new Date(), i)
                const dateKey = format(dateObj, 'yyyy-MM-dd')
                dailyDataMap[dateKey] = {
                    date: format(dateObj, 'MMM d'),
                    dateObj,
                    revenue: 0,
                    costs: 0,
                    maintenance: 0
                }
            }

            // Combine costs and adjustments for jobs
            const adjByJob = (adjustments || []).reduce((acc, adj) => {
                if (!acc[adj.job_id]) acc[adj.job_id] = 0
                acc[adj.job_id] += adj.amount
                return acc
            }, {} as Record<string, number>)

            const estByJob = (estimates || []).reduce((acc, est) => {
                acc[est.job_id!] = est
                return acc
            }, {} as Record<string, CostEstimate>)

            // Process Jobs
            jobs?.forEach(job => {
                const jobRev = Number(job.revenue || 0)
                totalRevenue += jobRev

                const est = estByJob[job.id]
                let jobCost = 0

                if (est) {
                    const jobAdj = adjByJob[job.id] || 0
                    const jobDriverTotal = Number(est.driver_cost) + jobAdj

                    fuelTotal += Number(est.fuel_cost)
                    driverTotal += jobDriverTotal
                    tollTotal += Number(est.toll_cost)
                    otherTotal += Number(est.other_costs || 0)

                    jobCost = Number(est.total_cost) + jobAdj
                    totalJobCosts += jobCost
                }

                // Add to daily map
                const dateKey = format(new Date(job.updated_at), 'yyyy-MM-dd')
                if (dailyDataMap[dateKey]) {
                    dailyDataMap[dateKey].revenue += jobRev
                    dailyDataMap[dateKey].costs += jobCost
                }

                // Add Transaction
                const netProfit = jobRev - jobCost
                transactions.push({
                    id: job.id,
                    type: 'job',
                    date: job.updated_at,
                    title: `Job ${job.job_number || 'Unknown'}`,
                    subtitle: job.customer_name || 'No Customer',
                    amount: netProfit,
                    isPositive: netProfit >= 0,
                    details: `Rev: $${jobRev.toFixed(0)} | Cost: $${jobCost.toFixed(0)}`
                })
            })

            // Process Maintenance
            maintenance?.forEach(m => {
                const cost = Number(m.cost || 0)
                const parts = Number(m.parts_cost || 0)
                const labor = Number(m.labor_cost || 0)
                // If totally missing parts/labor but has overall cost
                const actualCost = cost > 0 ? cost : (parts + labor)

                totalMaintenanceCosts += actualCost
                partsTotal += parts
                laborTotal += labor

                // Add to daily map
                const dateObj = m.service_date ? new Date(m.service_date) : new Date(m.created_at)
                const dateKey = format(dateObj, 'yyyy-MM-dd')
                if (dailyDataMap[dateKey]) {
                    dailyDataMap[dateKey].maintenance += actualCost
                }

                // Add Transaction
                transactions.push({
                    id: m.id,
                    type: 'maintenance',
                    date: dateObj.toISOString(),
                    title: `Maintenance: ${m.type}`,
                    subtitle: (m.vehicles as any)?.license_plate || 'Unknown Vehicle',
                    amount: actualCost,
                    isPositive: false,
                    details: m.description || 'Routine service'
                })
            })

            // Sort transactions newest first
            transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

            // Prepare Chart Data
            const chartData = Object.values(dailyDataMap)
                .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
                .map(({ date, revenue, costs, maintenance }) => ({
                    name: date,
                    revenue,
                    costs: costs + maintenance // Combined costs for simple linear chart
                }))

            const netProfit = totalRevenue - (totalJobCosts + totalMaintenanceCosts)
            const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

            return {
                summary: {
                    totalRevenue,
                    totalJobCosts,
                    totalMaintenanceCosts,
                    netProfit,
                    margin
                },
                breakdown: {
                    fuel: fuelTotal,
                    driver: driverTotal,
                    tolls: tollTotal,
                    other: otherTotal,
                    parts: partsTotal,
                    labor: laborTotal
                },
                chartData,
                transactions
            }
        }
    })
}
