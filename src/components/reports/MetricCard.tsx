import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MetricCardProps {
    title: string
    value: string | number
    icon: React.ReactNode
    trend?: number
    trendLabel?: string
    description?: string
    className?: string
}

export function MetricCard({
    title,
    value,
    icon,
    trend,
    trendLabel,
    description,
    className
}: MetricCardProps) {
    const isPositive = trend && trend >= 0

    return (
        <Card className={cn("overflow-hidden", className)}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className="h-4 w-4 text-muted-foreground opacity-70">
                        {icon}
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <div className="text-2xl font-bold">{value}</div>

                    {trend !== undefined && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className={cn(
                                "font-medium",
                                isPositive ? "text-emerald-500" : "text-red-500"
                            )}>
                                {isPositive ? '+' : ''}{trend.toFixed(1)}%
                            </span>
                            {trendLabel && <span>{trendLabel}</span>}
                        </p>
                    )}

                    {description && !trend && (
                        <p className="text-xs text-muted-foreground">{description}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
