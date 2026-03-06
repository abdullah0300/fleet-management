'use client'

import { useState } from 'react'
import { TrackingLoadsWidget } from './TrackingLoadsWidget'
import { RouteMapOverlay } from './RouteMapOverlay'

export function TrackingSection() {
    const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

    return (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr] min-h-[450px] h-[500px] max-h-[700px]">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col h-full overflow-hidden">
                <TrackingLoadsWidget
                    selectedJobId={selectedJobId}
                    onSelectJob={(id) => setSelectedJobId(id === selectedJobId ? null : id)}
                />
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-1.5 h-full flex flex-col">
                <RouteMapOverlay
                    selectedJobId={selectedJobId}
                    onCloseDetails={() => setSelectedJobId(null)}
                    onSelectJob={(id) => setSelectedJobId(id === selectedJobId ? null : id)}
                />
            </div>
        </div>
    )
}
