import { createClient } from '@/lib/supabase/server'
import { Vehicle, Driver, Job, Route, MaintenanceRecord, Document, Manifest } from '@/types/database'

/**
 * Server-side data fetching functions
 * These run on the server and return data to Server Components
 * NO 'use client' - these are pure server functions
 */

// ==========================================
// VEHICLES
// ==========================================

export async function getVehicles(): Promise<Vehicle[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('vehicles')
        .select(`
            *,
            profiles:current_driver_id (
                id,
                full_name,
                avatar_url
            )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching vehicles:', error)
        return []
    }

    return data || []
}

export async function getVehicle(id: string): Promise<Vehicle | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('vehicles')
        .select(`
            *,
            profiles:current_driver_id (
                id,
                full_name,
                avatar_url
            )
        `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching vehicle:', error)
        return null
    }

    return data
}

// ==========================================
// DRIVERS
// ==========================================

export async function getDrivers(): Promise<Driver[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('drivers')
        .select(`
            *,
            profiles (
                id,
                full_name,
                email,
                phone,
                avatar_url
            ),
            vehicles:assigned_vehicle_id (
                id,
                registration_number,
                make,
                model
            )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching drivers:', error)
        return []
    }

    return data || []
}

export async function getDriver(id: string): Promise<Driver | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('drivers')
        .select(`
            *,
            profiles (
                id,
                full_name,
                email,
                phone,
                avatar_url
            ),
            vehicles:assigned_vehicle_id (
                id,
                registration_number,
                make,
                model
            )
        `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching driver:', error)
        return null
    }

    return data
}

// ==========================================
// ROUTES
// ==========================================

export async function getRoutes(): Promise<Route[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching routes:', error)
        return []
    }

    return data || []
}

export async function getRoute(id: string): Promise<Route | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching route:', error)
        return null
    }

    return data
}

// ==========================================
// JOBS
// ==========================================

export async function getJobs(): Promise<Job[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('jobs')
        .select(`
            *,
            routes (id, name, distance_km),
            vehicles (id, registration_number, make, model),
            drivers (
                id,
                profiles (full_name)
            )
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching jobs:', error)
        return []
    }

    return data || []
}

export async function getJob(id: string): Promise<Job | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('jobs')
        .select(`
            *,
            routes (id, name, distance_km, estimated_duration),
            vehicles (id, registration_number, make, model),
            drivers (
                id,
                profiles (full_name, phone)
            )
        `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching job:', error)
        return null
    }

    return data
}

// ==========================================
// MAINTENANCE
// ==========================================

export async function getMaintenanceRecords(): Promise<MaintenanceRecord[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
            *,
            vehicles (
                id,
                registration_number,
                make,
                model,
                odometer_reading
            )
        `)
        .order('next_service_date', { ascending: true })

    if (error) {
        console.error('Error fetching maintenance:', error)
        return []
    }

    return data || []
}

// ==========================================
// DOCUMENTS
// ==========================================

export async function getDocuments(): Promise<Document[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('expiry_date', { ascending: true, nullsFirst: false })

    if (error) {
        console.error('Error fetching documents:', error)
        return []
    }

    return data || []
}

// ==========================================
// DASHBOARD STATS
// ==========================================

export async function getDashboardStats() {
    const supabase = await createClient()

    // Parallel fetch all counts
    const [vehicles, drivers, jobs, maintenance] = await Promise.all([
        supabase.from('vehicles').select('status'),
        supabase.from('drivers').select('status'),
        supabase.from('jobs').select('status'),
        supabase.from('maintenance_records').select('status, next_service_date').neq('status', 'completed'),
    ])

    const today = new Date().toISOString().split('T')[0]

    return {
        vehicles: {
            total: vehicles.data?.length || 0,
            available: vehicles.data?.filter(v => v.status === 'available').length || 0,
            inUse: vehicles.data?.filter(v => v.status === 'in_use').length || 0,
            maintenance: vehicles.data?.filter(v => v.status === 'maintenance').length || 0,
        },
        drivers: {
            total: drivers.data?.length || 0,
            available: drivers.data?.filter(d => d.status === 'available').length || 0,
            onTrip: drivers.data?.filter(d => d.status === 'on_trip').length || 0,
        },
        jobs: {
            total: jobs.data?.length || 0,
            pending: jobs.data?.filter(j => j.status === 'pending').length || 0,
            inProgress: jobs.data?.filter(j => j.status === 'in_progress').length || 0,
            completed: jobs.data?.filter(j => j.status === 'completed').length || 0,
        },
        maintenance: {
            scheduled: maintenance.data?.length || 0,
            overdue: maintenance.data?.filter(m => m.next_service_date && m.next_service_date < today).length || 0,
        },
    }
}

// ==========================================
// MANIFESTS
// ==========================================

export async function getManifests(): Promise<Manifest[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('manifests')
        .select(`
            *,
            vehicles (registration_number, make, model),
            drivers (profiles (full_name)),
            jobs (id, status, job_number)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching manifests:', error)
        return []
    }

    return data || []
}

export async function getManifest(id: string): Promise<Manifest | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('manifests')
        .select(`
            *,
            vehicles (registration_number, make, model),
            drivers (profiles (full_name, phone)),
            jobs (
                id, job_number, status, sequence_order,
                customer_name, customer_phone, customer_email,
                priority, notes,
                job_stops (
                    id, sequence_order, type, address,
                    latitude, longitude, notes, status
                )
            )
        `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching manifest:', error)
        return null
    }

    // Sort jobs by sequence_order
    if (data && data.jobs && Array.isArray(data.jobs)) {
        data.jobs.sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0))
        // Also sort job_stops within each job
        data.jobs.forEach((job: any) => {
            if (job.job_stops && Array.isArray(job.job_stops)) {
                job.job_stops.sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0))
            }
        })
    }

    return data
}
