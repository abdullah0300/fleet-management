export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // ============================================
      // 1. PROFILES (extends auth.users)
      // ============================================
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          role: 'admin' | 'fleet_manager' | 'dispatcher' | 'driver' | 'accountant'
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          role?: 'admin' | 'fleet_manager' | 'dispatcher' | 'driver' | 'accountant'
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          role?: 'admin' | 'fleet_manager' | 'dispatcher' | 'driver' | 'accountant'
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ============================================
      // 2. VEHICLES
      // ============================================
      vehicles: {
        Row: {
          id: string
          registration_number: string
          make: string
          model: string
          year: number | null
          vehicle_type: string | null
          fuel_type: 'diesel' | 'petrol' | 'electric' | 'hybrid' | null
          fuel_efficiency: number | null
          status: 'available' | 'in_use' | 'maintenance' | 'inactive' | null
          current_driver_id: string | null
          current_location: Json | null
          odometer_reading: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          registration_number: string
          make: string
          model: string
          year?: number | null
          vehicle_type?: string | null
          fuel_type?: 'diesel' | 'petrol' | 'electric' | 'hybrid' | null
          fuel_efficiency?: number | null
          status?: 'available' | 'in_use' | 'maintenance' | 'inactive' | null
          current_driver_id?: string | null
          current_location?: Json | null
          odometer_reading?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          registration_number?: string
          make?: string
          model?: string
          year?: number | null
          vehicle_type?: string | null
          fuel_type?: 'diesel' | 'petrol' | 'electric' | 'hybrid' | null
          fuel_efficiency?: number | null
          status?: 'available' | 'in_use' | 'maintenance' | 'inactive' | null
          current_driver_id?: string | null
          current_location?: Json | null
          odometer_reading?: number | null
          created_at?: string
          updated_at?: string
        }
      }

      // ============================================
      // 3. DRIVERS (extends profiles)
      // ============================================
      drivers: {
        Row: {
          id: string
          license_number: string | null
          license_expiry: string | null
          payment_type: 'per_mile' | 'per_trip' | 'hourly' | 'salary' | null
          rate_amount: number | null
          assigned_vehicle_id: string | null
          status: 'available' | 'on_trip' | 'off_duty' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string // Required - FK to profiles.id
          license_number?: string | null
          license_expiry?: string | null
          payment_type?: 'per_mile' | 'per_trip' | 'hourly' | 'salary' | null
          rate_amount?: number | null
          assigned_vehicle_id?: string | null
          status?: 'available' | 'on_trip' | 'off_duty' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          license_number?: string | null
          license_expiry?: string | null
          payment_type?: 'per_mile' | 'per_trip' | 'hourly' | 'salary' | null
          rate_amount?: number | null
          assigned_vehicle_id?: string | null
          status?: 'available' | 'on_trip' | 'off_duty' | null
          created_at?: string
          updated_at?: string
        }
      }

      // ============================================
      // 4. ROUTES
      // ============================================
      routes: {
        Row: {
          id: string
          name: string | null
          origin: Json
          destination: Json
          waypoints: Json | null
          distance_km: number | null
          estimated_duration: number | null
          estimated_fuel_cost: number | null
          estimated_toll_cost: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string | null
          origin: Json
          destination: Json
          waypoints?: Json | null
          distance_km?: number | null
          estimated_duration?: number | null
          estimated_fuel_cost?: number | null
          estimated_toll_cost?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          origin?: Json
          destination?: Json
          waypoints?: Json | null
          distance_km?: number | null
          estimated_duration?: number | null
          estimated_fuel_cost?: number | null
          estimated_toll_cost?: number | null
          created_at?: string
          updated_at?: string
        }
      }

      // ============================================
      // 5. JOBS
      // ============================================
      jobs: {
        Row: {
          id: string
          job_number: string | null
          route_id: string | null
          vehicle_id: string | null
          driver_id: string | null
          status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | null
          pickup_location: Json | null
          delivery_location: Json | null
          scheduled_date: string | null
          scheduled_time: string | null
          customer_name: string | null
          customer_phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_number?: string | null
          route_id?: string | null
          vehicle_id?: string | null
          driver_id?: string | null
          status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | null
          pickup_location?: Json | null
          delivery_location?: Json | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_number?: string | null
          route_id?: string | null
          vehicle_id?: string | null
          driver_id?: string | null
          status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | null
          pickup_location?: Json | null
          delivery_location?: Json | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      // ============================================
      // 6. TRIPS
      // ============================================
      trips: {
        Row: {
          id: string
          job_id: string | null
          driver_id: string | null
          vehicle_id: string | null
          start_time: string | null
          end_time: string | null
          start_odometer: number | null
          end_odometer: number | null
          actual_distance_km: number | null
          actual_fuel_cost: number | null
          actual_toll_cost: number | null
          driver_earnings: number | null
          status: 'started' | 'completed' | 'cancelled' | null
          gps_track: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          job_id?: string | null
          driver_id?: string | null
          vehicle_id?: string | null
          start_time?: string | null
          end_time?: string | null
          start_odometer?: number | null
          end_odometer?: number | null
          actual_distance_km?: number | null
          actual_fuel_cost?: number | null
          actual_toll_cost?: number | null
          driver_earnings?: number | null
          status?: 'started' | 'completed' | 'cancelled' | null
          gps_track?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          job_id?: string | null
          driver_id?: string | null
          vehicle_id?: string | null
          start_time?: string | null
          end_time?: string | null
          start_odometer?: number | null
          end_odometer?: number | null
          actual_distance_km?: number | null
          actual_fuel_cost?: number | null
          actual_toll_cost?: number | null
          driver_earnings?: number | null
          status?: 'started' | 'completed' | 'cancelled' | null
          gps_track?: Json | null
          created_at?: string
        }
      }

      // ============================================
      // 7. PROOF_OF_DELIVERY
      // ============================================
      proof_of_delivery: {
        Row: {
          id: string
          trip_id: string | null
          job_id: string | null
          type: 'pickup' | 'delivery'
          signature_url: string | null
          photos: string[] | null
          recipient_name: string | null
          notes: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          trip_id?: string | null
          job_id?: string | null
          type: 'pickup' | 'delivery'
          signature_url?: string | null
          photos?: string[] | null
          recipient_name?: string | null
          notes?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          trip_id?: string | null
          job_id?: string | null
          type?: 'pickup' | 'delivery'
          signature_url?: string | null
          photos?: string[] | null
          recipient_name?: string | null
          notes?: string | null
          timestamp?: string
        }
      }

      // ============================================
      // 8. MAINTENANCE_RECORDS
      // ============================================
      maintenance_records: {
        Row: {
          id: string
          vehicle_id: string | null
          type: 'scheduled' | 'repair' | 'inspection' | null
          description: string | null
          cost: number | null
          odometer_at_service: number | null
          service_date: string | null
          next_service_date: string | null
          next_service_odometer: number | null
          status: 'scheduled' | 'in_progress' | 'completed' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          vehicle_id?: string | null
          type?: 'scheduled' | 'repair' | 'inspection' | null
          description?: string | null
          cost?: number | null
          odometer_at_service?: number | null
          service_date?: string | null
          next_service_date?: string | null
          next_service_odometer?: number | null
          status?: 'scheduled' | 'in_progress' | 'completed' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string | null
          type?: 'scheduled' | 'repair' | 'inspection' | null
          description?: string | null
          cost?: number | null
          odometer_at_service?: number | null
          service_date?: string | null
          next_service_date?: string | null
          next_service_odometer?: number | null
          status?: 'scheduled' | 'in_progress' | 'completed' | null
          created_at?: string
          updated_at?: string
        }
      }

      // ============================================
      // 9. DOCUMENTS
      // ============================================
      documents: {
        Row: {
          id: string
          entity_type: 'vehicle' | 'driver' | 'job'
          entity_id: string
          document_type: string | null
          file_url: string | null
          expiry_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: 'vehicle' | 'driver' | 'job'
          entity_id: string
          document_type?: string | null
          file_url?: string | null
          expiry_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: 'vehicle' | 'driver' | 'job'
          entity_id?: string
          document_type?: string | null
          file_url?: string | null
          expiry_date?: string | null
          created_at?: string
        }
      }

      // ============================================
      // 10. NOTIFICATIONS
      // ============================================
      notifications: {
        Row: {
          id: string
          user_id: string | null
          type: string | null
          title: string | null
          message: string | null
          read: boolean | null
          data: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type?: string | null
          title?: string | null
          message?: string | null
          read?: boolean | null
          data?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: string | null
          title?: string | null
          message?: string | null
          read?: boolean | null
          data?: Json | null
          created_at?: string
        }
      }
    }
  }
}

// ============================================
// HELPER TYPES FOR COMMON USE
// ============================================

// Table row types (for reading data)
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Vehicle = Database['public']['Tables']['vehicles']['Row']
export type Driver = Database['public']['Tables']['drivers']['Row']
export type Route = Database['public']['Tables']['routes']['Row']
export type Job = Database['public']['Tables']['jobs']['Row']
export type Trip = Database['public']['Tables']['trips']['Row']
export type ProofOfDelivery = Database['public']['Tables']['proof_of_delivery']['Row']
export type MaintenanceRecord = Database['public']['Tables']['maintenance_records']['Row']
export type Document = Database['public']['Tables']['documents']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

// Insert types (for creating data)
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type VehicleInsert = Database['public']['Tables']['vehicles']['Insert']
export type DriverInsert = Database['public']['Tables']['drivers']['Insert']
export type RouteInsert = Database['public']['Tables']['routes']['Insert']
export type JobInsert = Database['public']['Tables']['jobs']['Insert']
export type TripInsert = Database['public']['Tables']['trips']['Insert']
export type ProofOfDeliveryInsert = Database['public']['Tables']['proof_of_delivery']['Insert']
export type MaintenanceRecordInsert = Database['public']['Tables']['maintenance_records']['Insert']
export type DocumentInsert = Database['public']['Tables']['documents']['Insert']
export type NotificationInsert = Database['public']['Tables']['notifications']['Insert']

// Update types (for updating data)
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type VehicleUpdate = Database['public']['Tables']['vehicles']['Update']
export type DriverUpdate = Database['public']['Tables']['drivers']['Update']
export type RouteUpdate = Database['public']['Tables']['routes']['Update']
export type JobUpdate = Database['public']['Tables']['jobs']['Update']
export type TripUpdate = Database['public']['Tables']['trips']['Update']
export type ProofOfDeliveryUpdate = Database['public']['Tables']['proof_of_delivery']['Update']
export type MaintenanceRecordUpdate = Database['public']['Tables']['maintenance_records']['Update']
export type DocumentUpdate = Database['public']['Tables']['documents']['Update']
export type NotificationUpdate = Database['public']['Tables']['notifications']['Update']

// ============================================
// JOINED TYPES (for queries with relations)
// ============================================

// Driver with profile data (from: drivers JOIN profiles)
export type DriverWithProfile = Driver & {
  profiles: Profile | null
}

// Job with all relations
export type JobWithRelations = Job & {
  routes: Route | null
  vehicles: Vehicle | null
  drivers: DriverWithProfile | null
}

// Trip with all relations
export type TripWithRelations = Trip & {
  jobs: Job | null
  vehicles: Vehicle | null
  drivers: DriverWithProfile | null
  proof_of_delivery: ProofOfDelivery[]
}

// Vehicle with current driver
export type VehicleWithDriver = Vehicle & {
  profiles: Profile | null // via current_driver_id FK
}
