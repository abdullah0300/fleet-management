'use client'

import { VehicleServiceProgram, ServiceProgram } from "@/types/maintenance_extensions"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface VehicleHealthVisualizerProps {
    currentOdometer: number
    programs: (VehicleServiceProgram & { service_programs: ServiceProgram })[]
    mini?: boolean // Mini mode for list views
}

export function VehicleHealthVisualizer({ currentOdometer, programs, mini = false }: VehicleHealthVisualizerProps) {
    if (!programs.length) {
        return mini ? null : (
            <div className="p-4 bg-muted/30 rounded-lg text-center text-sm text-muted-foreground border border-dashed">
                No maintenance programs assigned.
            </div>
        )
    }

    // Find the most critical program (highest usage %)
    const statuses = programs.map(p => {
        const interval = p.service_programs.interval_miles || 5000 // Default
        const used = currentOdometer - (p.last_service_odometer || 0)
        const percent = Math.min(Math.max((used / interval) * 100, 0), 100)

        // Color logic
        let color = 'bg-primary'
        let status = 'ok'
        if (percent >= 90) { color = 'bg-red-500'; status = 'overdue' }
        else if (percent >= 75) { color = 'bg-yellow-500'; status = 'due' }
        else { color = 'bg-emerald-500'; status = 'ok' }

        return { ...p, percent, color, status }
    }).sort((a, b) => b.percent - a.percent) // Sort by most urgent

    const worstStatus = statuses[0]

    // If Mini mode, just show a simple bar or colored dot
    if (mini) {
        return (
            <div className="flex items-center gap-2" title={`${worstStatus.service_programs.name}: ${Math.round(worstStatus.percent)}% Used`}>
                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                        className={`h-full ${worstStatus.color}`}
                        style={{ width: `${worstStatus.percent}%` }}
                    />
                </div>
                {worstStatus.status === 'overdue' && <AlertCircle className="h-3 w-3 text-red-500" />}
            </div>
        )
    }

    // Full Visualizer (The Truck) 🚛
    return (
        <div className="w-full bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="bg-muted/30 p-4 border-b">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                    <span className="text-xl">🚛</span> Vehicle Health Monitor
                </h3>
            </div>

            <div className="p-6 flex flex-col items-center">
                {/* TRUCK SVG -- Simple representation */}
                <div className="relative w-full max-w-sm h-32 mb-6">
                    {/* Truck Cab (Static) */}
                    <div className="absolute right-0 bottom-0 w-24 h-24 bg-slate-800 rounded-lg rounded-tr-[2rem] z-10">
                        <div className="absolute top-4 right-0 w-12 h-10 bg-slate-900/50 rounded-l-md" /> {/* Window */}
                        <div className="absolute bottom-[-10px] right-4 w-10 h-10 bg-black rounded-full border-4 border-slate-600" /> {/* Front Wheel */}
                    </div>

                    {/* Trailer (Dynamic Health Bar!) */}
                    <div className="absolute left-0 bottom-4 right-26 h-20 bg-slate-100 border-2 border-slate-300 rounded-lg overflow-hidden flex items-center justify-center shadow-inner">
                        {/* THE BAR */}
                        <div
                            className={`absolute left-0 top-0 bottom-0 transition-all duration-1000 ${worstStatus.color} opacity-90`}
                            style={{ width: `${worstStatus.percent}%` }}
                        />

                        {/* Text Overlay */}
                        <div className="relative z-10 font-bold text-3xl drop-shadow-md text-white mix-blend-difference">
                            {Math.round(worstStatus.percent)}%
                        </div>
                    </div>
                    <div className="absolute bottom-[-10px] left-8 w-10 h-10 bg-black rounded-full border-4 border-slate-600" /> {/* Rear Wheel 1 */}
                    <div className="absolute bottom-[-10px] left-20 w-10 h-10 bg-black rounded-full border-4 border-slate-600" /> {/* Rear Wheel 2 */}
                </div>

                {/* Details List */}
                <div className="w-full space-y-3">
                    {statuses.map(prog => (
                        <div key={prog.id} className="flex items-center justify-between text-sm p-3 bg-muted/20 rounded-lg border">
                            <div className="flex flex-col">
                                <span className="font-medium">{prog.service_programs.name}</span>
                                <span className="text-xs text-muted-foreground">
                                    {Math.round(prog.last_service_odometer || 0).toLocaleString()} → {Math.round((prog.last_service_odometer || 0) + (prog.service_programs.interval_miles || 0)).toLocaleString()} km
                                </span>
                            </div>
                            <div className="text-right">
                                <div className={`font-bold ${prog.color.replace('bg-', 'text-')}`}>
                                    {Math.round(prog.percent)}%
                                </div>
                                <span className="text-[10px] uppercase font-semibold text-muted-foreground">Used</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
