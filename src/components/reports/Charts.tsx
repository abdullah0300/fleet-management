'use client'

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    AreaChart,
    Area,
    Legend
} from 'recharts'
import { format } from 'date-fns'

// Color palette matching design system
const COLORS = {
    revenue: 'hsl(142, 76%, 36%)', // Green
    profit: 'hsl(217, 91%, 60%)',  // Blue
    cost: 'hsl(0, 84%, 60%)',      // Red
    completed: 'hsl(142, 76%, 36%)',
    pending: 'hsl(48, 96%, 53%)',
    fuel: 'hsl(217, 91%, 60%)',
    tolls: 'hsl(265, 89%, 66%)',
    pay: 'hsl(142, 76%, 36%)',
    maintenance: 'hsl(24, 95%, 53%)',
    gray: 'hsl(215, 14%, 34%)',
    muted: 'hsl(var(--muted))'
}

type ChartData = any[]

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-3 text-sm">
                <p className="font-medium mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex flex-col gap-1">
                        <span style={{ color: entry.color }} className="font-semibold">
                            {entry.name}: {entry.name.toLowerCase().includes('rate') || entry.name.toLowerCase().includes('count')
                                ? entry.value
                                : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(entry.value)}
                        </span>
                    </div>
                ))}
            </div>
        )
    }
    return null
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-popover text-popover-foreground border border-border rounded-lg shadow-lg p-3 text-sm">
                <p className="font-medium mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex flex-col gap-1">
                        <span style={{ color: entry.color }} className="font-semibold">
                            {entry.name}: {entry.value} jobs
                        </span>
                    </div>
                ))}
            </div>
        )
    }
    return null
}

export function RevenueChart({ data }: { data: ChartData }) {
    const formattedData = data.map(d => ({
        ...d,
        displayDate: format(new Date(d.date), 'MMM dd')
    }))

    return (
        <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.revenue} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.revenue} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.cost} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.cost} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="displayDate" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(value) => `$${value}`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke={COLORS.revenue} strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="cost" name="Cost" stroke={COLORS.cost} strokeWidth={2} fillOpacity={1} fill="url(#colorCost)" />
            </AreaChart>
        </ResponsiveContainer>
    )
}

export function JobCompletionChart({ data }: { data: ChartData }) {
    const formattedData = data.map(d => ({
        ...d,
        displayDate: format(new Date(d.date), 'MMM dd')
    }))

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis dataKey="displayDate" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} dy={10} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<CustomBarTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="completed" name="Completed" stackId="a" fill={COLORS.completed} radius={[0, 0, 4, 4]} />
                <Bar dataKey="pending" name="Pending/Active" stackId="a" fill={COLORS.pending} radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}

export function CostBreakdownChart({ data }: { data: ChartData }) {
    const PIE_COLORS = [COLORS.fuel, COLORS.pay, COLORS.maintenance, COLORS.tolls, COLORS.gray]

    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                No cost data available for this period.
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" />
            </PieChart>
        </ResponsiveContainer>
    )
}

export function VehicleUtilizationChart({ utilizationRate }: { utilizationRate: number }) {
    const data = [
        { name: 'In Use', value: utilizationRate },
        { name: 'Available/Maintenance', value: 100 - utilizationRate }
    ]

    return (
        <div className="relative">
            <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                    >
                        <Cell fill={COLORS.profit} />
                        <Cell fill={COLORS.muted} />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '20px' }}>
                <span className="text-4xl font-bold">{utilizationRate.toFixed(1)}%</span>
                <span className="text-sm text-muted-foreground mt-1">Active Fleet</span>
            </div>
        </div>
    )
}

export function StatusChart({ data, type = 'pie', height = 200 }: any) {
    const chartData = Object.entries(data).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value,
        fill: COLORS.gray
    })).filter(d => Number(d.value) > 0)

    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name }) => `${name}`}
                    labelLine={false}
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={[COLORS.completed, COLORS.pending, COLORS.revenue, COLORS.cost][index % 4]} />
                    ))}
                </Pie>
                <Tooltip />
            </PieChart>
        </ResponsiveContainer>
    )
}
