
import { Database } from '@/types/database'

// Extends the base Database type with our new tables (until auto-gen works)
export type MaintenanceDatabase = Database & {
    public: {
        Tables: {
            service_programs: {
                Row: ServiceProgram
                Insert: ServiceProgramInsert
                Update: ServiceProgramUpdate
            }
            vehicle_service_programs: {
                Row: VehicleServiceProgram
                Insert: VehicleServiceProgramInsert
                Update: VehicleServiceProgramUpdate
            }
        }
    }
}

export interface ServiceProgram {
    id: string
    name: string
    description: string | null
    interval_miles: number | null
    interval_months: number | null
    created_at: string
}

export interface ServiceProgramInsert {
    id?: string
    name: string
    description?: string | null
    interval_miles?: number | null
    interval_months?: number | null
    created_at?: string
}

export interface ServiceProgramUpdate {
    name?: string
    description?: string | null
    interval_miles?: number | null
    interval_months?: number | null
}

export interface VehicleServiceProgram {
    id: string
    vehicle_id: string
    program_id: string
    last_service_date: string | null
    last_service_odometer: number | null
    next_due_date: string | null
    next_due_odometer: number | null
    status: 'ok' | 'due' | 'overdue'
    created_at: string
    updated_at: string
    // Joined data (often fetched together)
    service_programs?: ServiceProgram
}

export interface VehicleServiceProgramInsert {
    id?: string
    vehicle_id: string
    program_id: string
    last_service_date?: string | null
    last_service_odometer?: number | null
    next_due_date?: string | null
    next_due_odometer?: number | null
    status?: 'ok' | 'due' | 'overdue'
}

export interface VehicleServiceProgramUpdate {
    last_service_date?: string | null
    last_service_odometer?: number | null
    next_due_date?: string | null
    next_due_odometer?: number | null
    status?: 'ok' | 'due' | 'overdue'
}
