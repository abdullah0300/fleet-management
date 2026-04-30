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
                license_plate,
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
                license_plate,
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
            customers (id, name, email, phone),
            job_stops (*),
            routes (id, name, distance_km),
            vehicles (id, license_plate, make, model),
            drivers (
                id,
                profiles (full_name)
            ),
            manifests (id, manifest_number, status)
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
            customers (id, name, email, phone),
            routes (id, name, distance_km, estimated_duration),
            vehicles (id, license_plate, make, model),
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
                license_plate,
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

export type DocumentWithRelations = Document & {
    vehicle?: { license_plate: string; make: string; model: string; vin_number: string | null } | null;
    driver?: { full_name: string | null; email: string | null; phone: string | null } | null;
    job?: { job_number: string | null; notes: string | null; external_job_ref: string | null; customer_name: string | null; manifest_number?: string | null } | null;
    maintenance?: { type: string | null; description: string | null; mechanic_notes: string | null } | null;
}

export async function getDocuments(): Promise<DocumentWithRelations[]> {
    const supabase = await createClient()

    const { data: documents, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

    if (error || !documents) {
        console.error('Error fetching documents:', error)
        return []
    }

    // Extract unique entity IDs
    const vehicleIds = [...new Set(documents.filter(d => d.entity_type === 'vehicle').map(d => d.entity_id))]
    const driverIds = [...new Set(documents.filter(d => d.entity_type === 'driver').map(d => d.entity_id))]
    const jobIds = [...new Set(documents.filter(d => d.entity_type === 'job').map(d => d.entity_id))]
    const maintenanceIds = [...new Set(documents.filter(d => d.entity_type === 'maintenance').map(d => d.entity_id))]

    // Fetch related data in parallel
    const [vehiclesRes, driversRes, jobsRes, maintenanceRes] = await Promise.all([
        vehicleIds.length > 0 ? supabase.from('vehicles').select('id, license_plate, make, model, vin_number').in('id', vehicleIds) : { data: [] },
        driverIds.length > 0 ? supabase.from('profiles').select('id, full_name, email, phone').in('id', driverIds) : { data: [] },
        jobIds.length > 0 ? supabase.from('jobs').select('id, job_number, notes, external_job_ref, customer_name, manifests(manifest_number), drivers(profiles(full_name, email, phone)), vehicles(license_plate, make, model, vin_number)').in('id', jobIds) : { data: [] },
        maintenanceIds.length > 0 ? supabase.from('maintenance_records').select('id, type, description, mechanic_notes').in('id', maintenanceIds) : { data: [] }
    ])

    const vehiclesMap = new Map((vehiclesRes.data || []).map(v => [v.id, v]))
    const driversMap = new Map((driversRes.data || []).map(d => [d.id, d]))
    const jobsMap = new Map((jobsRes.data || []).map(j => {
        // extract manifest_number from the joined array/object
        const manifest_number = j.manifests ? (Array.isArray(j.manifests) ? j.manifests[0]?.manifest_number : (j.manifests as any)?.manifest_number) : null;
        return [j.id, { ...j, manifest_number }]
    }))
    const maintenanceMap = new Map((maintenanceRes.data || []).map(m => [m.id, m]))

    // Hydrate documents with relations
    return documents.map(doc => {
        let relations: any = {}
        if (doc.entity_type === 'vehicle') relations.vehicle = vehiclesMap.get(doc.entity_id)
        if (doc.entity_type === 'driver') relations.driver = driversMap.get(doc.entity_id)
        if (doc.entity_type === 'job') {
            const jobData = jobsMap.get(doc.entity_id)
            if (jobData) {
                relations.job = jobData
                
                // Inherit Driver and Vehicle from the Job to enable deep search
                if (jobData.drivers && jobData.drivers.profiles) {
                    // Extract profile if it's an array or single object
                    relations.driver = Array.isArray(jobData.drivers.profiles) ? jobData.drivers.profiles[0] : jobData.drivers.profiles
                }
                if (jobData.vehicles) {
                    relations.vehicle = Array.isArray(jobData.vehicles) ? jobData.vehicles[0] : jobData.vehicles
                }
            }
        }
        if (doc.entity_type === 'maintenance') relations.maintenance = maintenanceMap.get(doc.entity_id)
        
        return {
            ...doc,
            ...relations
        }
    })
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
            vehicles (license_plate, make, model),
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
            vehicles (license_plate, make, model),
            drivers (profiles (full_name, phone)),
            jobs (
                id, job_number, status, sequence_order, customer_id,
                customers (name, phone, email),
                customer_name, customer_phone, customer_email,
                priority, notes, revenue, financial_status,
                job_stops (
                    id, sequence_order, type, address,
                    latitude, longitude, notes, status
                ),
                trips (*),
                proof_of_delivery (*)
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
