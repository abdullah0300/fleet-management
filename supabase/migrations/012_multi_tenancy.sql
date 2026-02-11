-- ============================================
-- MULTI-TENANCY MIGRATION
-- ============================================
-- Run this ENTIRE script in Supabase SQL Editor
-- This adds company-scoped data isolation to the platform
-- ============================================

-- ============================================
-- STEP 1: CREATE COMPANIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  address text,
  phone text,
  email text,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'trial'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT companies_pkey PRIMARY KEY (id)
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger for companies
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- STEP 2: ADD company_id TO PARENT TABLES
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.manifests ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
ALTER TABLE public.service_programs ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Add platform admin flag
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_platform_admin boolean DEFAULT false;

-- ============================================
-- STEP 3: INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_company ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_company ON public.vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_drivers_company ON public.drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_routes_company ON public.routes(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON public.jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_manifests_company ON public.manifests(company_id);
CREATE INDEX IF NOT EXISTS idx_service_programs_company ON public.service_programs(company_id);

-- ============================================
-- STEP 4: HELPER FUNCTIONS FOR RLS
-- ============================================

-- Returns the company_id of the currently authenticated user
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Returns whether the current user is a platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- STEP 5: MIGRATE EXISTING DATA
-- ============================================
-- Create the first company (Webcraftio)
INSERT INTO public.companies (name, slug, email)
VALUES ('Webcraftio', 'webcraftio', 'abdullah@gmail.com')
ON CONFLICT (slug) DO NOTHING;

-- Assign ALL existing data to Webcraftio
UPDATE public.profiles SET company_id = (SELECT id FROM public.companies WHERE slug = 'webcraftio') WHERE company_id IS NULL;
UPDATE public.vehicles SET company_id = (SELECT id FROM public.companies WHERE slug = 'webcraftio') WHERE company_id IS NULL;
UPDATE public.drivers SET company_id = (SELECT id FROM public.companies WHERE slug = 'webcraftio') WHERE company_id IS NULL;
UPDATE public.routes SET company_id = (SELECT id FROM public.companies WHERE slug = 'webcraftio') WHERE company_id IS NULL;
UPDATE public.jobs SET company_id = (SELECT id FROM public.companies WHERE slug = 'webcraftio') WHERE company_id IS NULL;
UPDATE public.manifests SET company_id = (SELECT id FROM public.companies WHERE slug = 'webcraftio') WHERE company_id IS NULL;
UPDATE public.service_programs SET company_id = (SELECT id FROM public.companies WHERE slug = 'webcraftio') WHERE company_id IS NULL;

-- Mark abdullah@gmail.com as platform admin
UPDATE public.profiles SET is_platform_admin = true WHERE email = 'abdullah@gmail.com';

-- ============================================
-- STEP 6: UPDATE handle_new_user() TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company_id)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    (new.raw_user_meta_data->>'company_id')::uuid
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 7: DROP ALL OLD RLS POLICIES
-- ============================================

-- Companies (new table, no old policies)

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;

-- Vehicles
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can delete vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.vehicles;

-- Drivers
DROP POLICY IF EXISTS "Authenticated users can view drivers" ON public.drivers;
DROP POLICY IF EXISTS "Authenticated users can insert drivers" ON public.drivers;
DROP POLICY IF EXISTS "Authenticated users can update drivers" ON public.drivers;
DROP POLICY IF EXISTS "Authenticated users can delete drivers" ON public.drivers;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.drivers;

-- Routes
DROP POLICY IF EXISTS "Authenticated users can view routes" ON public.routes;
DROP POLICY IF EXISTS "Authenticated users can insert routes" ON public.routes;
DROP POLICY IF EXISTS "Authenticated users can update routes" ON public.routes;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.routes;

-- Jobs
DROP POLICY IF EXISTS "Authenticated users can view jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON public.jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON public.jobs;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.jobs;

-- Job Stops
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.job_stops;
DROP POLICY IF EXISTS "Authenticated users can view job_stops" ON public.job_stops;
DROP POLICY IF EXISTS "Authenticated users can insert job_stops" ON public.job_stops;
DROP POLICY IF EXISTS "Authenticated users can update job_stops" ON public.job_stops;
DROP POLICY IF EXISTS "Authenticated users can delete job_stops" ON public.job_stops;

-- Manifests
DROP POLICY IF EXISTS "Authenticated users can view manifests" ON public.manifests;
DROP POLICY IF EXISTS "Authenticated users can insert manifests" ON public.manifests;
DROP POLICY IF EXISTS "Authenticated users can update manifests" ON public.manifests;

-- Trips
DROP POLICY IF EXISTS "Authenticated users can view trips" ON public.trips;
DROP POLICY IF EXISTS "Authenticated users can insert trips" ON public.trips;
DROP POLICY IF EXISTS "Authenticated users can update trips" ON public.trips;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.trips;

-- Proof of Delivery
DROP POLICY IF EXISTS "Authenticated users can view POD" ON public.proof_of_delivery;
DROP POLICY IF EXISTS "Authenticated users can insert POD" ON public.proof_of_delivery;
DROP POLICY IF EXISTS "Allow all operations on proof_of_delivery" ON public.proof_of_delivery;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.proof_of_delivery;

-- Proof of Delivery Photos
DROP POLICY IF EXISTS "Allow all operations on proof_of_delivery_photos" ON public.proof_of_delivery_photos;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.proof_of_delivery_photos;

-- Maintenance Records
DROP POLICY IF EXISTS "Authenticated users can view maintenance" ON public.maintenance_records;
DROP POLICY IF EXISTS "Authenticated users can insert maintenance" ON public.maintenance_records;
DROP POLICY IF EXISTS "Authenticated users can update maintenance" ON public.maintenance_records;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.maintenance_records;

-- Documents
DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.documents;

-- Notifications (keep scoped by user_id, but re-create for consistency)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.notifications;

-- Cost Estimates (skipped - table does not exist)

-- Service Programs
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.service_programs;
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.service_programs;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.service_programs;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.service_programs;

-- Vehicle Service Programs
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.vehicle_service_programs;
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.vehicle_service_programs;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.vehicle_service_programs;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON public.vehicle_service_programs;

-- Vehicle Location History
DROP POLICY IF EXISTS "Dispatchers can view location history" ON public.vehicle_location_history;
DROP POLICY IF EXISTS "Drivers can insert location history" ON public.vehicle_location_history;

-- ============================================
-- STEP 8: CREATE NEW COMPANY-SCOPED RLS POLICIES
-- ============================================

-- ==========================================
-- COMPANIES TABLE
-- ==========================================
CREATE POLICY "Platform admin sees all companies" ON public.companies
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own company" ON public.companies
  FOR SELECT USING (id = get_user_company_id());

CREATE POLICY "Platform admin can insert companies" ON public.companies
  FOR INSERT WITH CHECK (is_platform_admin());

CREATE POLICY "Platform admin can update companies" ON public.companies
  FOR UPDATE USING (is_platform_admin());

CREATE POLICY "Platform admin can delete companies" ON public.companies
  FOR DELETE USING (is_platform_admin());

-- ==========================================
-- PROFILES TABLE
-- ==========================================
CREATE POLICY "Platform admin sees all profiles" ON public.profiles
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own company profiles" ON public.profiles
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Users can see own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Platform admin can update any profile" ON public.profiles
  FOR UPDATE USING (is_platform_admin());

CREATE POLICY "System can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- ==========================================
-- VEHICLES TABLE
-- ==========================================
CREATE POLICY "Platform admin sees all vehicles" ON public.vehicles
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own vehicles" ON public.vehicles
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Company users can insert vehicles" ON public.vehicles
  FOR INSERT TO authenticated WITH CHECK (
    is_platform_admin() OR company_id = get_user_company_id()
  );

CREATE POLICY "Company users can update own vehicles" ON public.vehicles
  FOR UPDATE USING (
    is_platform_admin() OR company_id = get_user_company_id()
  );

CREATE POLICY "Company users can delete own vehicles" ON public.vehicles
  FOR DELETE USING (
    is_platform_admin() OR company_id = get_user_company_id()
  );

-- ==========================================
-- DRIVERS TABLE
-- ==========================================
CREATE POLICY "Platform admin sees all drivers" ON public.drivers
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own drivers" ON public.drivers
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Company users can insert drivers" ON public.drivers
  FOR INSERT TO authenticated WITH CHECK (
    is_platform_admin() OR company_id = get_user_company_id()
  );

CREATE POLICY "Company users can update own drivers" ON public.drivers
  FOR UPDATE USING (
    is_platform_admin() OR company_id = get_user_company_id()
  );

CREATE POLICY "Company users can delete own drivers" ON public.drivers
  FOR DELETE USING (
    is_platform_admin() OR company_id = get_user_company_id()
  );

-- ==========================================
-- ROUTES TABLE
-- ==========================================
CREATE POLICY "Platform admin sees all routes" ON public.routes
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own routes" ON public.routes
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Company users can insert routes" ON public.routes
  FOR INSERT TO authenticated WITH CHECK (
    is_platform_admin() OR company_id = get_user_company_id()
  );

CREATE POLICY "Company users can update own routes" ON public.routes
  FOR UPDATE USING (
    is_platform_admin() OR company_id = get_user_company_id()
  );

-- ==========================================
-- JOBS TABLE
-- ==========================================
CREATE POLICY "Platform admin sees all jobs" ON public.jobs
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own jobs" ON public.jobs
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Company users can insert jobs" ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (
    is_platform_admin() OR company_id = get_user_company_id()
  );

CREATE POLICY "Company users can update own jobs" ON public.jobs
  FOR UPDATE USING (
    is_platform_admin() OR company_id = get_user_company_id()
  );

-- ==========================================
-- JOB STOPS TABLE (inherits via jobs)
-- ==========================================
-- Ensure RLS is enabled
ALTER TABLE public.job_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admin sees all job_stops" ON public.job_stops
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own job_stops" ON public.job_stops
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_stops.job_id
      AND jobs.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company users can insert job_stops" ON public.job_stops
  FOR INSERT TO authenticated WITH CHECK (
    is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_stops.job_id
      AND jobs.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company users can update own job_stops" ON public.job_stops
  FOR UPDATE USING (
    is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_stops.job_id
      AND jobs.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company users can delete own job_stops" ON public.job_stops
  FOR DELETE USING (
    is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = job_stops.job_id
      AND jobs.company_id = get_user_company_id()
    )
  );

-- ==========================================
-- MANIFESTS TABLE
-- ==========================================
CREATE POLICY "Platform admin sees all manifests" ON public.manifests
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own manifests" ON public.manifests
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Company users can insert manifests" ON public.manifests
  FOR INSERT TO authenticated WITH CHECK (
    is_platform_admin() OR company_id = get_user_company_id()
  );

CREATE POLICY "Company users can update own manifests" ON public.manifests
  FOR UPDATE USING (
    is_platform_admin() OR company_id = get_user_company_id()
  );

-- ==========================================
-- TRIPS TABLE (inherits via jobs or manifests)
-- ==========================================
CREATE POLICY "Platform admin sees all trips" ON public.trips
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own trips" ON public.trips
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = trips.job_id
      AND jobs.company_id = get_user_company_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.manifests
      WHERE manifests.id = trips.manifest_id
      AND manifests.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company users can insert trips" ON public.trips
  FOR INSERT TO authenticated WITH CHECK (
    is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = trips.job_id
      AND jobs.company_id = get_user_company_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.manifests
      WHERE manifests.id = trips.manifest_id
      AND manifests.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company users can update own trips" ON public.trips
  FOR UPDATE USING (
    is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = trips.job_id
      AND jobs.company_id = get_user_company_id()
    )
    OR EXISTS (
      SELECT 1 FROM public.manifests
      WHERE manifests.id = trips.manifest_id
      AND manifests.company_id = get_user_company_id()
    )
  );

-- ==========================================
-- PROOF OF DELIVERY (inherits via jobs)
-- ==========================================
CREATE POLICY "Platform admin sees all POD" ON public.proof_of_delivery
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own POD" ON public.proof_of_delivery
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = proof_of_delivery.job_id
      AND jobs.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company users can insert POD" ON public.proof_of_delivery
  FOR INSERT TO authenticated WITH CHECK (
    is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = proof_of_delivery.job_id
      AND jobs.company_id = get_user_company_id()
    )
  );

-- ==========================================
-- PROOF OF DELIVERY PHOTOS (inherits via POD -> jobs)
-- ==========================================
-- Ensure RLS is enabled
ALTER TABLE public.proof_of_delivery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admin sees all POD photos" ON public.proof_of_delivery_photos
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own POD photos" ON public.proof_of_delivery_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.proof_of_delivery pod
      JOIN public.jobs ON jobs.id = pod.job_id
      WHERE pod.id = proof_of_delivery_photos.pod_id
      AND jobs.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company users can insert POD photos" ON public.proof_of_delivery_photos
  FOR INSERT TO authenticated WITH CHECK (
    is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.proof_of_delivery pod
      JOIN public.jobs ON jobs.id = pod.job_id
      WHERE pod.id = proof_of_delivery_photos.pod_id
      AND jobs.company_id = get_user_company_id()
    )
  );

-- ==========================================
-- MAINTENANCE RECORDS (inherits via vehicles)
-- ==========================================
CREATE POLICY "Platform admin sees all maintenance" ON public.maintenance_records
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own maintenance" ON public.maintenance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = maintenance_records.vehicle_id
      AND vehicles.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company users can insert maintenance" ON public.maintenance_records
  FOR INSERT TO authenticated WITH CHECK (
    is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = maintenance_records.vehicle_id
      AND vehicles.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company users can update own maintenance" ON public.maintenance_records
  FOR UPDATE USING (
    is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = maintenance_records.vehicle_id
      AND vehicles.company_id = get_user_company_id()
    )
  );

-- ==========================================
-- DOCUMENTS (polymorphic - entity_type + entity_id)
-- ==========================================
CREATE POLICY "Platform admin sees all documents" ON public.documents
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own documents" ON public.documents
  FOR SELECT USING (
    -- Vehicle documents
    (entity_type = 'vehicle' AND EXISTS (
      SELECT 1 FROM public.vehicles WHERE vehicles.id = documents.entity_id AND vehicles.company_id = get_user_company_id()
    ))
    OR
    -- Driver documents
    (entity_type = 'driver' AND EXISTS (
      SELECT 1 FROM public.drivers WHERE drivers.id = documents.entity_id AND drivers.company_id = get_user_company_id()
    ))
    OR
    -- Job documents
    (entity_type = 'job' AND EXISTS (
      SELECT 1 FROM public.jobs WHERE jobs.id = documents.entity_id AND jobs.company_id = get_user_company_id()
    ))
  );

CREATE POLICY "Company users can insert documents" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (
    is_platform_admin() OR
    (entity_type = 'vehicle' AND EXISTS (
      SELECT 1 FROM public.vehicles WHERE vehicles.id = documents.entity_id AND vehicles.company_id = get_user_company_id()
    ))
    OR
    (entity_type = 'driver' AND EXISTS (
      SELECT 1 FROM public.drivers WHERE drivers.id = documents.entity_id AND drivers.company_id = get_user_company_id()
    ))
    OR
    (entity_type = 'job' AND EXISTS (
      SELECT 1 FROM public.jobs WHERE jobs.id = documents.entity_id AND jobs.company_id = get_user_company_id()
    ))
  );

-- ==========================================
-- NOTIFICATIONS (already user-scoped, keep it)
-- ==========================================
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- COST ESTIMATES (skipped - table does not exist in live database)

-- ==========================================
-- SERVICE PROGRAMS
-- ==========================================
CREATE POLICY "Platform admin sees all service programs" ON public.service_programs
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own service programs" ON public.service_programs
  FOR SELECT USING (company_id = get_user_company_id());

CREATE POLICY "Company users can insert service programs" ON public.service_programs
  FOR INSERT TO authenticated WITH CHECK (
    is_platform_admin() OR company_id = get_user_company_id()
  );

CREATE POLICY "Company users can update own service programs" ON public.service_programs
  FOR UPDATE USING (
    is_platform_admin() OR company_id = get_user_company_id()
  );

CREATE POLICY "Company users can delete own service programs" ON public.service_programs
  FOR DELETE USING (
    is_platform_admin() OR company_id = get_user_company_id()
  );

-- ==========================================
-- VEHICLE SERVICE PROGRAMS (inherits via vehicles)
-- ==========================================
CREATE POLICY "Platform admin sees all vehicle service programs" ON public.vehicle_service_programs
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own vehicle service programs" ON public.vehicle_service_programs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = vehicle_service_programs.vehicle_id
      AND vehicles.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company users can insert vehicle service programs" ON public.vehicle_service_programs
  FOR INSERT TO authenticated WITH CHECK (
    is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = vehicle_service_programs.vehicle_id
      AND vehicles.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company users can update own vehicle service programs" ON public.vehicle_service_programs
  FOR UPDATE USING (
    is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = vehicle_service_programs.vehicle_id
      AND vehicles.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company users can delete own vehicle service programs" ON public.vehicle_service_programs
  FOR DELETE USING (
    is_platform_admin() OR EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = vehicle_service_programs.vehicle_id
      AND vehicles.company_id = get_user_company_id()
    )
  );

-- ==========================================
-- VEHICLE LOCATION HISTORY (inherits via vehicles)
-- ==========================================
CREATE POLICY "Platform admin sees all location history" ON public.vehicle_location_history
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users see own location history" ON public.vehicle_location_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.vehicles
      WHERE vehicles.id = vehicle_location_history.vehicle_id
      AND vehicles.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Drivers can insert location history" ON public.vehicle_location_history
  FOR INSERT TO authenticated WITH CHECK (
    driver_id = auth.uid()
  );

-- ============================================
-- DONE! Verify the migration
-- ============================================
-- Run these queries to verify:
-- SELECT * FROM public.companies;
-- SELECT email, company_id, is_platform_admin FROM public.profiles;
-- SELECT COUNT(*) FROM public.vehicles WHERE company_id IS NOT NULL;
