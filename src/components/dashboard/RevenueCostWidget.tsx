'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

// Mock Data - To be replaced with real aggregation later if available
const data = [
    { name: 'Mon', revenue: 4000, costs: 2400 },
    { name: 'Tue', revenue: 3000, costs: 1398 },
    { name: 'Wed', revenue: 2000, costs: 9800 },
    { name: 'Thu', revenue: 2780, costs: 3908 },
    { name: 'Fri', revenue: 1890, costs: 4800 },
    { name: 'Sat', revenue: 2390, costs: 3800 },
    { name: 'Sun', revenue: 3490, costs: 4300 },
]

// Mock today's breakdown
const breakdown = [
    { label: 'Fuel', amount: 1840, percentage: 47, color: 'bg-red-500' },
    { label: 'Driver Pay', amount: 1320, percentage: 34, color: 'bg-red-400' },
    { label: 'Tolls', amount: 520, percentage: 13, color: 'bg-red-600' },
    { label: 'Maint.', amount: 219, percentage: 6, color: 'bg-red-300' },
]

export function RevenueCostWidget() {
    return (
        <Card className="col-span-1 h-[450px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-base font-semibold">Revenue & Costs Overview</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Today's Numbers<br />
                        <span className="font-medium text-foreground">Revenue: $8,450 | Costs: $3,890</span><br />
                        <span className="text-green-600 font-medium">Net Profit: $4,560 (+ 12%)</span>
                    </p>
                </div>
                <Button variant="link" className="text-blue-600 h-auto p-0">View Full Report</Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
                {/* Chart */}
                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#888888' }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#888888' }}
                                tickFormatter={(value) => `${value / 1000}k`}
                            />
                            <Tooltip />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#ef4444"
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line
                                type="monotone"
                                dataKey="costs"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Breakdown */}
                <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Cost Breakdown (Today)</h4>
                    <div className="space-y-2">
                        {breakdown.map((item) => (
                            <div key={item.label} className="flex items-center text-xs">
                                <div className={`w-3 h-3 ${item.color} mr-2 rounded-sm`} />
                                <span className="flex-1 font-medium">{item.label}</span>
                                <span className="text-muted-foreground">${item.amount.toLocaleString()} ({item.percentage}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
