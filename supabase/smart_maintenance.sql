-- 1. Service Programs (Templates for maintenance like "Oil Change")
CREATE TABLE IF NOT EXISTS public.service_programs (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL, -- e.g. "Standard Oil Change", "Tire Rotation"
  description text,
  interval_miles integer, -- e.g. 5000
  interval_months integer, -- e.g. 6
  created_at timestamptz DEFAULT now()
);

-- 2. Vehicle Service Assignments (Tracks status of a specific program for a vehicle)
CREATE TABLE IF NOT EXISTS public.vehicle_service_programs (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.service_programs(id) ON DELETE CASCADE,
  
  -- The last time this specific service was done
  last_service_date date,
  last_service_odometer integer,
  
  -- The calculated next due point
  next_due_date date,
  next_due_odometer integer,
  
  -- Status: 'ok' | 'due' (approaching) | 'overdue'
  status text DEFAULT 'ok' CHECK (status IN ('ok', 'due', 'overdue')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Prevent assigning the same program twice to the same vehicle
  UNIQUE(vehicle_id, program_id)
);

-- 3. Link Maintenance Records to Programs (Optional: helps track history)
ALTER TABLE public.maintenance_records 
ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.service_programs(id);

-- 4. Enable RLS (Security)
ALTER TABLE public.service_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_service_programs ENABLE ROW LEVEL SECURITY;

-- 5. Policies (Allow all authenticated users read/write for now - adjust roles later of course)
CREATE POLICY "Enable read access for authenticated users" ON public.service_programs
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable write access for authenticated users" ON public.service_programs
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.service_programs
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON public.service_programs
FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for Assignments
CREATE POLICY "Enable read access for authenticated users" ON public.vehicle_service_programs
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable write access for authenticated users" ON public.vehicle_service_programs
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON public.vehicle_service_programs
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON public.vehicle_service_programs
FOR DELETE USING (auth.role() = 'authenticated');
