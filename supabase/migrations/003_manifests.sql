-- NEW TABLE: Manifests (Groups multiple jobs into a trip)
-- Combined Schema: User's existing fields + App's required fields
CREATE TABLE IF NOT EXISTS public.manifests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  manifest_number text UNIQUE,
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  
  -- Combined Statuses: planning/draft, dispatched/scheduled, etc
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'planning', 'scheduled', 'dispatched', 'in_transit', 'completed', 'cancelled')),
  
  -- App Fields
  scheduled_date date,
  notes text,

  -- User's Extra Fields (Preserved)
  total_distance_km numeric DEFAULT 0,
  total_weight_kg numeric DEFAULT 0,
  route_geometry jsonb DEFAULT '{}'::jsonb,

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT manifests_pkey PRIMARY KEY (id)
);

-- AUTO-GENERATE MANIFEST NUMBER
CREATE SEQUENCE IF NOT EXISTS manifest_number_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_manifest_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.manifest_number IS NULL THEN
    NEW.manifest_number := 'MAN-' || LPAD(nextval('manifest_number_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop verify to ensure clean recreate if needed
DROP TRIGGER IF EXISTS set_manifest_number ON public.manifests;
CREATE TRIGGER set_manifest_number
  BEFORE INSERT ON public.manifests
  FOR EACH ROW EXECUTE FUNCTION public.generate_manifest_number();

-- UPDATE JOBS TABLE (Link to Manifests)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS manifest_id uuid REFERENCES public.manifests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sequence_order integer DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_jobs_manifest ON public.jobs(manifest_id);

-- UPDATE TRIPS TABLE (Link to Manifests, Allow NULL Job ID)
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS manifest_id uuid REFERENCES public.manifests(id) ON DELETE SET NULL;
  
ALTER TABLE public.trips
  ALTER COLUMN job_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_trips_manifest ON public.trips(manifest_id);

-- RLS POLICIES FOR MANIFESTS
ALTER TABLE public.manifests ENABLE ROW LEVEL SECURITY;

-- Safely recreate policies
DROP POLICY IF EXISTS "Authenticated users can view manifests" ON public.manifests;
DROP POLICY IF EXISTS "Authenticated users can insert manifests" ON public.manifests;
DROP POLICY IF EXISTS "Authenticated users can update manifests" ON public.manifests;

CREATE POLICY "Authenticated users can view manifests" ON public.manifests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert manifests" ON public.manifests
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update manifests" ON public.manifests
  FOR UPDATE TO authenticated USING (true);

-- TRIGGER FOR UPDATED_AT
DROP TRIGGER IF EXISTS set_updated_at ON public.manifests;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.manifests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
