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
    LineChart,
    Line,
    Legend,
    AreaChart,
    Area
} from 'recharts'

// Color palette matching our design system
const COLORS = {
    purple: 'hsl(265, 89%, 66%)',
    blue: 'hsl(217, 91%, 60%)',
    green: 'hsl(142, 76%, 36%)',
    yellow: 'hsl(48, 96%, 53%)',
    red: 'hsl(0, 84%, 60%)',
    teal: 'hsl(172, 66%, 50%)',
    orange: 'hsl(24, 95%, 53%)',
    gray: 'hsl(215, 14%, 34%)'
}

const STATUS_COLORS: Record<string, string> = {
    available: COLORS.green,
    in_use: COLORS.purple,
    maintenance: COLORS.yellow,
    inactive: COLORS.gray,
    completed: COLORS.green,
    in_progress: COLORS.purple,
    pending: COLORS.yellow,
    assigned: COLORS.blue,
    cancelled: COLORS.red,
    on_trip: COLORS.purple,
    off_duty: COLORS.gray
}

interface StatusChartProps {
    data: Record<string, number>
    type?: 'bar' | 'pie'
    height?: number
}

// Status Distribution Chart (Bar or Pie)
export function StatusChart({ data, type = 'pie', height = 200 }: StatusChartProps) {
    const chartData = Object.entries(data).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value,
        fill: STATUS_COLORS[name] || COLORS.gray
    }))

    if (type === 'bar') {
        return (
            <ResponsiveContainer width="100%" height={height}>
                <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis type="number" />
                    <YAxis
                        type="category"
                        dataKey="name"
                        width={80}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => String(value).charAt(0).toUpperCase() + String(value).slice(1)}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                        }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    )
}

interface ProgressGaugeProps {
    value: number
    label: string
    color?: string
}

// Circular Progress Gauge
export function ProgressGauge({ value, label, color = COLORS.purple }: ProgressGaugeProps) {
    const data = [
        { name: 'value', value },
        { name: 'remaining', value: 100 - value }
    ]

    return (
        <div className="relative">
            <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={40}
                        outerRadius={55}
                        paddingAngle={0}
                        dataKey="value"
                    >
                        <Cell fill={color} />
                        <Cell fill="hsl(var(--muted))" />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '10px' }}>
                <span className="text-2xl font-bold">{value}%</span>
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
        </div>
    )
}

interface TrendChartProps {
    data: { name: string; value: number }[]
    color?: string
    height?: number
}

// Area Chart for Trends
export function TrendChart({ data, color = COLORS.purple, height = 150 }: TrendChartProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <defs>
                    <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#gradient-${color.replace('#', '')})`}
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}

interface ComparisonBarProps {
    data: { name: string; current: number; previous: number }[]
    height?: number
}

// Comparison Bar Chart
export function ComparisonBarChart({ data, height = 200 }: ComparisonBarProps) {
    return (
        <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                    contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                    }}
                />
                <Legend />
                <Bar dataKey="previous" name="Last Month" fill={COLORS.gray} radius={[4, 4, 0, 0]} />
                <Bar dataKey="current" name="This Month" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    )
}
