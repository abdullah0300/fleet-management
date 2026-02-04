'use client'

import { Job } from '@/types/database'
import { DndContext, DragOverlay, defaultDropAnimationSideEffects, DragOverlayProps } from '@dnd-kit/core'
import { useDispatchState } from '@/hooks/useDispatchState'
import { ResourcePanel } from './ResourcePanel'
import { ManifestCanvas } from './ManifestCanvas'
import { JobPool } from './JobPool'
import { createPortal } from 'react-dom'
import { CSS } from '@dnd-kit/utilities'
import { useState, useCallback } from 'react'
import { useDrivers } from '@/hooks/useDrivers'
import { useVehicles } from '@/hooks/useVehicles'

interface DispatchCommandCenterProps {
    initialDrivers: any[]
    initialVehicles: any[]
    initialJobs: Job[]
}

const dropAnimation: DragOverlayProps['dropAnimation'] = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
}

export function DispatchCommandCenter({ initialDrivers, initialVehicles, initialJobs }: DispatchCommandCenterProps) {
    const {
        state,
        setManifestDate,
        setDriver,
        setVehicle,
        addPoolJob,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        removeFromManifest
    } = useDispatchState(initialJobs)

    // Use React Query for real-time data, with initial data as fallback
    const { data: driversData } = useDrivers()
    const { data: vehiclesData } = useVehicles()

    // Merge: prefer React Query data if available, else use initial
    const drivers = driversData?.data || initialDrivers
    const vehicles = vehiclesData?.data || initialVehicles

    // Find active items for overlay
    const activeJob = state.activeDragId
        ? (state.poolJobs.find(j => j.id === state.activeDragId) || state.manifestJobs.find(j => j.id === state.activeDragId))
        : null

    const activeDriverProfile = state.selectedDriverId
        ? drivers.find((d: any) => d.id === state.selectedDriverId)
        : null

    const activeVehicleProfile = state.selectedVehiclId
        ? vehicles.find((v: any) => v.id === state.selectedVehiclId)
        : null

    // Handle removing job from manifest (back to pool)
    const handleRemoveJob = useCallback((jobId: string) => {
        if (removeFromManifest) {
            removeFromManifest(jobId)
        }
    }, [removeFromManifest])

    return (
        <DndContext
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-12 gap-4 h-full p-4 min-h-0">



                {/* LEFT: RESOURCES (3 Cols) */}
                <div className="col-span-3 h-full overflow-hidden">
                    <ResourcePanel
                        drivers={drivers}
                        vehicles={vehicles}
                        selectedDriverId={state.selectedDriverId}
                        selectedVehicleId={state.selectedVehiclId}
                        onSelectDriver={setDriver}
                        onSelectVehicle={setVehicle}
                    />
                </div>

                {/* MIDDLE: MANIFEST CANVAS (6 Cols) */}
                <div className="col-span-6 h-full overflow-hidden">
                    <ManifestCanvas
                        jobs={state.manifestJobs}
                        drivers={drivers}
                        vehicles={vehicles}
                        activeDriver={activeDriverProfile}
                        activeVehicle={activeVehicleProfile}
                        selectedDriverId={state.selectedDriverId}
                        selectedVehicleId={state.selectedVehiclId}
                        manifestDate={state.manifestDate}
                        onDateChange={setManifestDate}
                        onSelectDriver={setDriver}
                        onSelectVehicle={setVehicle}
                        onRemoveJob={handleRemoveJob}
                    />
                </div>


                {/* RIGHT: JOB POOL (3 Cols) */}
                <div className="col-span-3 h-full overflow-hidden">
                    <JobPool
                        jobs={state.poolJobs}
                        onJobCreated={addPoolJob}
                    />
                </div>

            </div>

            {/* DRAG OVERLAY */}
            {typeof document !== 'undefined' && createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                    {activeJob ? (
                        <div className="bg-white border rounded-md p-3 shadow-xl w-[300px] opacity-90 rotate-2 cursor-grabbing">
                            <div className="font-bold text-sm">{activeJob.job_number}</div>
                            <div className="text-xs">{activeJob.customer_name}</div>
                        </div>
                    ) : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    )
}
