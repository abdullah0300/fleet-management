import { useState, useCallback } from 'react'
import { Job, ManifestInsert } from '@/types/database'
import { arrayMove } from '@dnd-kit/sortable'
import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'

export type DispatchView = 'manifest' | 'pool'

export interface DispatchState {
    // Current Manifest (Draft)
    manifestDate: string
    selectedDriverId: string | null
    selectedVehiclId: string | null

    // Jobs
    manifestJobs: Job[]
    poolJobs: Job[]

    // UI State
    activeDragId: string | null
}

export function useDispatchState(initialJobs: Job[]) {
    const [state, setState] = useState<DispatchState>({
        manifestDate: new Date().toISOString().split('T')[0],
        selectedDriverId: null,
        selectedVehiclId: null,
        manifestJobs: [], // Start empty for now, or load draft
        poolJobs: initialJobs,
        activeDragId: null
    })

    // --- ACTIONS ---

    const setManifestDate = (date: string) => setState(prev => ({ ...prev, manifestDate: date }))
    const setDriver = (id: string) => setState(prev => ({ ...prev, selectedDriverId: id }))
    const setVehicle = (id: string) => setState(prev => ({ ...prev, selectedVehiclId: id }))

    const addPoolJob = (job: Job) => setState(prev => ({ ...prev, poolJobs: [job, ...prev.poolJobs] }))

    // Remove job from manifest back to pool
    const removeFromManifest = useCallback((jobId: string) => {
        setState(prev => {
            const job = prev.manifestJobs.find(j => j.id === jobId)
            if (!job) return prev
            return {
                ...prev,
                manifestJobs: prev.manifestJobs.filter(j => j.id !== jobId),
                poolJobs: [job, ...prev.poolJobs]
            }
        })
    }, [])

    // --- DND HANDLERS ---

    const handleDragStart = (event: DragStartEvent) => {
        setState(prev => ({ ...prev, activeDragId: event.active.id as string }))
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        // Find containers
        const isOwnerManifest = state.manifestJobs.find(j => j.id === activeId)
        const isOwnerPool = state.poolJobs.find(j => j.id === activeId)

        const isOverManifest = over.id === 'manifest-container' || state.manifestJobs.find(j => j.id === overId)
        const isOverPool = over.id === 'pool-container' || state.poolJobs.find(j => j.id === overId)

        if (isOwnerPool && isOverManifest) {
            // Moving from Pool -> Manifest (Optimistic)
            const job = state.poolJobs.find(j => j.id === activeId)
            if (!job) return

            setState(prev => ({
                ...prev,
                poolJobs: prev.poolJobs.filter(j => j.id !== activeId),
                manifestJobs: [...prev.manifestJobs, job]
            }))
        }

        if (isOwnerManifest && isOverPool) {
            // Moving from Manifest -> Pool
            const job = state.manifestJobs.find(j => j.id === activeId)
            if (!job) return

            setState(prev => ({
                ...prev,
                manifestJobs: prev.manifestJobs.filter(j => j.id !== activeId),
                poolJobs: [...prev.poolJobs, job]
            }))
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setState(prev => ({ ...prev, activeDragId: null }))

        if (!over) return

        const activeId = active.id as string
        const overId = over.id as string

        // Reordering within Manifest
        const oldIndex = state.manifestJobs.findIndex(j => j.id === activeId)
        const newIndex = state.manifestJobs.findIndex(j => j.id === overId)

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            setState(prev => ({
                ...prev,
                manifestJobs: arrayMove(prev.manifestJobs, oldIndex, newIndex)
            }))
        }
    }

    return {
        state,
        setManifestDate,
        setDriver,
        setVehicle,
        addPoolJob,
        removeFromManifest,
        handleDragStart,
        handleDragOver,
        handleDragEnd
    }
}

