import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Manifest, ManifestInsert, ManifestUpdate, Job } from '@/types/database'

const supabase = createClient()

// Query keys
export const manifestKeys = {
    all: ['manifests'] as const,
    lists: () => [...manifestKeys.all, 'list'] as const,
    list: (filters?: { status?: string }) => [...manifestKeys.lists(), filters] as const,
    details: () => [...manifestKeys.all, 'detail'] as const,
    detail: (id: string) => [...manifestKeys.details(), id] as const,
}

// Types with relations
export type ManifestWithRelations = Manifest & {
    vehicles: { registration_number: string; make: string; model: string } | null
    drivers: { profiles: { full_name: string } | null } | null
    jobs: Job[]
}

// --- FETCHERS ---

async function fetchManifests(filters?: { status?: string }): Promise<ManifestWithRelations[]> {
    let query = supabase
        .from('manifests')
        .select(`
            *,
            vehicles (registration_number, make, model),
            drivers (profiles (full_name)),
            jobs (*)
        `)
        .order('created_at', { ascending: false })

    if (filters?.status) {
        query = query.eq('status', filters.status)
    }

    const { data, error } = await query
    if (error) throw error
    return data as ManifestWithRelations[]
}

async function fetchManifest(id: string): Promise<ManifestWithRelations> {
    const { data, error } = await supabase
        .from('manifests')
        .select(`
            *,
            vehicles (registration_number, make, model),
            drivers (profiles (full_name)),
            jobs (*)
        `)
        .eq('id', id)
        .single()

    if (error) throw error
    // Sort jobs by sequence_order
    if (data.jobs) {
        data.jobs.sort((a: Job, b: Job) => (a.sequence_order || 0) - (b.sequence_order || 0))
    }
    return data as ManifestWithRelations
}

// --- HOOKS ---

export function useManifests(filters?: { status?: string }) {
    return useQuery({
        queryKey: manifestKeys.list(filters),
        queryFn: () => fetchManifests(filters),
    })
}

export function useManifest(id: string) {
    return useQuery({
        queryKey: manifestKeys.detail(id),
        queryFn: () => fetchManifest(id),
        enabled: !!id,
    })
}

export function useCreateManifest() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (manifest: ManifestInsert) => {
            const { data, error } = await supabase
                .from('manifests')
                .insert(manifest)
                .select()
                .single()
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: manifestKeys.lists() })
        }
    })
}

export function useUpdateManifest() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: ManifestUpdate }) => {
            // 1. Update the manifest
            const { data: manifest, error } = await supabase
                .from('manifests')
                .update(updates)
                .eq('id', id)
                .select()
                .single()

            if (error) throw error

            // 2. If driver or vehicle is updated, sync to all linked jobs
            if (updates.driver_id !== undefined || updates.vehicle_id !== undefined) {
                // Prepare job updates
                const jobUpdates: any = {}
                if (updates.driver_id !== undefined) jobUpdates.driver_id = updates.driver_id
                if (updates.vehicle_id !== undefined) jobUpdates.vehicle_id = updates.vehicle_id
                // Also set status to assigned if we have a driver
                if (updates.driver_id) jobUpdates.status = 'assigned'

                // Bulk update all jobs in this manifest
                const { error: jobError } = await supabase
                    .from('jobs')
                    .update(jobUpdates)
                    .eq('manifest_id', id)

                if (jobError) {
                    console.error('Failed to sync manifest updates to jobs:', jobError)
                }

                // If driver assigned, also update driver status
                if (updates.driver_id) {
                    await supabase
                        .from('drivers')
                        .update({
                            status: 'on_trip',
                            assigned_vehicle_id: updates.vehicle_id
                        })
                        .eq('id', updates.driver_id)
                }
            }

            return manifest
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: manifestKeys.lists() })
            queryClient.invalidateQueries({ queryKey: manifestKeys.detail(variables.id) })
            queryClient.invalidateQueries({ queryKey: ['jobs'] })
        }
    })
}

export function useAddJobToManifest() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ manifestId, jobId, sequence }: { manifestId: string; jobId: string; sequence?: number }) => {
            // 1. Get current max sequence if not provided
            let seq = sequence
            if (!seq) {
                const { count } = await supabase
                    .from('jobs')
                    .select('id', { count: 'exact', head: true })
                    .eq('manifest_id', manifestId)
                seq = (count || 0) + 1
            }

            // 2. Fetch the manifest to check for existing assignment
            const { data: manifest } = await supabase
                .from('manifests')
                .select('driver_id, vehicle_id')
                .eq('id', manifestId)
                .single()

            const updates: any = {
                manifest_id: manifestId,
                sequence_order: seq,
                status: 'assigned'
            }

            // Inherit driver/vehicle if present
            if (manifest?.driver_id) updates.driver_id = manifest.driver_id
            if (manifest?.vehicle_id) updates.vehicle_id = manifest.vehicle_id

            const { data, error } = await supabase
                .from('jobs')
                .update(updates)
                .eq('id', jobId)
                .select()
            if (error) throw error
            return data
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: manifestKeys.detail(variables.manifestId) })
            queryClient.invalidateQueries({ queryKey: ['jobs'] })
        }
    })
}

export function useRemoveJobFromManifest() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ jobId, manifestId }: { jobId: string; manifestId: string }) => {
            const { data, error } = await supabase
                .from('jobs')
                .update({
                    manifest_id: null,
                    sequence_order: null,
                    status: 'pending',
                    driver_id: null,
                    vehicle_id: null
                })
                .eq('id', jobId)
                .select()
            if (error) throw error
            return data
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: manifestKeys.detail(variables.manifestId) })
            queryClient.invalidateQueries({ queryKey: ['jobs'] })
        }
    })
}
