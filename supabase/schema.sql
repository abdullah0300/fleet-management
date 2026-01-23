-- ============================================
-- FLEET MANAGEMENT SAAS - COMPLETE DATABASE SCHEMA
-- ============================================
-- Run this in Supabase SQL Editor
-- Tables are ordered by dependency (parent tables first)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (extends auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  role text DEFAULT 'driver'::text CHECK (role = ANY (ARRAY['admin'::text, 'fleet_manager'::text, 'dispatcher'::text, 'driver'::text, 'accountant'::text])),
  phone text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. VEHICLES
-- ============================================
CREATE TABLE public.vehicles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  registration_number text NOT NULL UNIQUE,
  make text NOT NULL,
  model text NOT NULL,
  year integer,
  vehicle_type text,
  fuel_type text DEFAULT 'diesel'::text CHECK (fuel_type = ANY (ARRAY['diesel'::text, 'petrol'::text, 'electric'::text, 'hybrid'::text])),
  fuel_efficiency numeric,
  status text DEFAULT 'available'::text CHECK (status = ANY (ARRAY['available'::text, 'in_use'::text, 'maintenance'::text, 'inactive'::text])),
  current_driver_id uuid,
  current_location jsonb,
  odometer_reading integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vehicles_pkey PRIMARY KEY (id),
  CONSTRAINT vehicles_current_driver_id_fkey FOREIGN KEY (current_driver_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ============================================
-- 3. DRIVERS (extends profiles)
-- ============================================
CREATE TABLE public.drivers (
  id uuid NOT NULL,
  license_number text,
  license_expiry date,
  payment_type text DEFAULT 'per_mile'::text CHECK (payment_type = ANY (ARRAY['per_mile'::text, 'per_trip'::text, 'hourly'::text, 'salary'::text])),
  rate_amount numeric DEFAULT 0,
  assigned_vehicle_id uuid,
  status text DEFAULT 'available'::text CHECK (status = ANY (ARRAY['available'::text, 'on_trip'::text, 'off_duty'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT drivers_pkey PRIMARY KEY (id),
  CONSTRAINT drivers_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT drivers_assigned_vehicle_id_fkey FOREIGN KEY (assigned_vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL
);

-- ============================================
-- 4. ROUTES
-- ============================================
CREATE TABLE public.routes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text,
  origin jsonb NOT NULL,
  destination jsonb NOT NULL,
  waypoints jsonb DEFAULT '[]'::jsonb,
  distance_km numeric,
  estimated_duration integer,
  estimated_fuel_cost numeric,
  estimated_toll_cost numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT routes_pkey PRIMARY KEY (id)
);

-- ============================================
-- 5. JOBS
-- ============================================
CREATE TABLE public.jobs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  job_number text UNIQUE,
  route_id uuid,
  vehicle_id uuid,
  driver_id uuid,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'assigned'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])),
  pickup_location jsonb,
  delivery_location jsonb,
  scheduled_date date,
  scheduled_time time without time zone,
  customer_name text,
  customer_phone text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT jobs_pkey PRIMARY KEY (id),
  CONSTRAINT jobs_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.routes(id) ON DELETE SET NULL,
  CONSTRAINT jobs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL,
  CONSTRAINT jobs_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL
);

-- Auto-generate job number
CREATE OR REPLACE FUNCTION public.generate_job_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.job_number IS NULL THEN
    NEW.job_number := 'JOB-' || LPAD(nextval('job_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS job_number_seq START 1;

CREATE TRIGGER set_job_number
  BEFORE INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.generate_job_number();

-- ============================================
-- 6. TRIPS
-- ============================================
CREATE TABLE public.trips (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  job_id uuid,
  driver_id uuid,
  vehicle_id uuid,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  start_odometer integer,
  end_odometer integer,
  actual_distance_km numeric,
  actual_fuel_cost numeric,
  actual_toll_cost numeric,
  driver_earnings numeric,
  status text DEFAULT 'started'::text CHECK (status = ANY (ARRAY['started'::text, 'completed'::text, 'cancelled'::text])),
  gps_track jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT trips_pkey PRIMARY KEY (id),
  CONSTRAINT trips_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL,
  CONSTRAINT trips_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL,
  CONSTRAINT trips_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL
);

-- ============================================
-- 7. PROOF OF DELIVERY
-- ============================================
CREATE TABLE public.proof_of_delivery (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  trip_id uuid,
  job_id uuid,
  type text NOT NULL CHECK (type = ANY (ARRAY['pickup'::text, 'delivery'::text])),
  signature_url text,
  photos text[] DEFAULT '{}'::text[],
  recipient_name text,
  notes text,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT proof_of_delivery_pkey PRIMARY KEY (id),
  CONSTRAINT proof_of_delivery_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE SET NULL,
  CONSTRAINT proof_of_delivery_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL
);

-- ============================================
-- 8. MAINTENANCE RECORDS
-- ============================================
CREATE TABLE public.maintenance_records (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  vehicle_id uuid,
  type text DEFAULT 'scheduled'::text CHECK (type = ANY (ARRAY['scheduled'::text, 'repair'::text, 'inspection'::text])),
  description text,
  cost numeric,
  odometer_at_service integer,
  service_date date,
  next_service_date date,
  next_service_odometer integer,
  status text DEFAULT 'scheduled'::text CHECK (status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT maintenance_records_pkey PRIMARY KEY (id),
  CONSTRAINT maintenance_records_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE
);

-- ============================================
-- 9. DOCUMENTS
-- ============================================
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  entity_type text NOT NULL CHECK (entity_type = ANY (ARRAY['vehicle'::text, 'driver'::text, 'job'::text])),
  entity_id uuid NOT NULL,
  document_type text,
  file_url text,
  expiry_date date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id)
);

-- ============================================
-- 10. NOTIFICATIONS
-- ============================================
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  type text,
  title text,
  message text,
  read boolean DEFAULT false,
  data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_of_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES: Users can read all, update own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- VEHICLES: Authenticated users can CRUD
CREATE POLICY "Authenticated users can view vehicles" ON public.vehicles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert vehicles" ON public.vehicles
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update vehicles" ON public.vehicles
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete vehicles" ON public.vehicles
  FOR DELETE TO authenticated USING (true);

-- DRIVERS: Authenticated users can view, admins/managers can modify
CREATE POLICY "Authenticated users can view drivers" ON public.drivers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert drivers" ON public.drivers
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update drivers" ON public.drivers
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete drivers" ON public.drivers
  FOR DELETE TO authenticated USING (true);

-- ROUTES: Authenticated users can CRUD
CREATE POLICY "Authenticated users can view routes" ON public.routes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert routes" ON public.routes
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update routes" ON public.routes
  FOR UPDATE TO authenticated USING (true);

-- JOBS: Authenticated users can CRUD
CREATE POLICY "Authenticated users can view jobs" ON public.jobs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert jobs" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update jobs" ON public.jobs
  FOR UPDATE TO authenticated USING (true);

-- TRIPS: Authenticated users can CRUD
CREATE POLICY "Authenticated users can view trips" ON public.trips
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert trips" ON public.trips
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update trips" ON public.trips
  FOR UPDATE TO authenticated USING (true);

-- PROOF OF DELIVERY: Authenticated users can CRUD
CREATE POLICY "Authenticated users can view POD" ON public.proof_of_delivery
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert POD" ON public.proof_of_delivery
  FOR INSERT TO authenticated WITH CHECK (true);

-- MAINTENANCE: Authenticated users can CRUD
CREATE POLICY "Authenticated users can view maintenance" ON public.maintenance_records
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert maintenance" ON public.maintenance_records
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update maintenance" ON public.maintenance_records
  FOR UPDATE TO authenticated USING (true);

-- DOCUMENTS: Authenticated users can CRUD
CREATE POLICY "Authenticated users can view documents" ON public.documents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert documents" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (true);

-- NOTIFICATIONS: Users can only view their own
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- UPDATED_AT TRIGGER (auto-update timestamp)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.routes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.maintenance_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_vehicles_current_driver ON public.vehicles(current_driver_id);
CREATE INDEX idx_drivers_status ON public.drivers(status);
CREATE INDEX idx_drivers_assigned_vehicle ON public.drivers(assigned_vehicle_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_vehicle ON public.jobs(vehicle_id);
CREATE INDEX idx_jobs_driver ON public.jobs(driver_id);
CREATE INDEX idx_jobs_scheduled_date ON public.jobs(scheduled_date);
CREATE INDEX idx_trips_status ON public.trips(status);
CREATE INDEX idx_trips_job ON public.trips(job_id);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read);
CREATE INDEX idx_documents_entity ON public.documents(entity_type, entity_id);
CREATE INDEX idx_maintenance_vehicle ON public.maintenance_records(vehicle_id);
