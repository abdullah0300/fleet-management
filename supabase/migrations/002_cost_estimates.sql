-- ============================================
-- COST ESTIMATES TABLE
-- ============================================
-- Stores cost estimates linked to jobs
-- Run this in Supabase SQL Editor

-- Create cost_estimates table
CREATE TABLE IF NOT EXISTS public.cost_estimates (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  company_id uuid DEFAULT get_user_company_id(), -- Multi-tenancy
  job_id uuid,
  vehicle_id uuid,
  driver_id uuid,
  
  -- Distance and Route Info
  distance_km numeric NOT NULL DEFAULT 0,
  
  -- Fuel Costs
  fuel_efficiency numeric, -- km/L
  fuel_price_per_liter numeric, -- $/L
  fuel_cost numeric NOT NULL DEFAULT 0,
  
  -- Toll Costs
  toll_cost numeric NOT NULL DEFAULT 0,
  toll_notes text,
  
  -- Driver Costs
  driver_payment_type text CHECK (driver_payment_type = ANY (ARRAY['per_mile'::text, 'per_trip'::text, 'hourly'::text, 'salary'::text])),
  driver_rate numeric DEFAULT 0,
  driver_cost numeric NOT NULL DEFAULT 0,
  trip_duration_minutes integer,
  
  -- Other Costs
  other_costs numeric DEFAULT 0,
  other_costs_notes text,
  
  -- Total
  total_cost numeric NOT NULL DEFAULT 0,
  
  -- Metadata
  status text DEFAULT 'estimate'::text CHECK (status = ANY (ARRAY['estimate'::text, 'approved'::text, 'final'::text])),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT cost_estimates_pkey PRIMARY KEY (id),
  CONSTRAINT cost_estimates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT cost_estimates_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE SET NULL,
  CONSTRAINT cost_estimates_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL,
  CONSTRAINT cost_estimates_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL,
  CONSTRAINT cost_estimates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS cost_estimates_company_id_idx ON public.cost_estimates(company_id);
CREATE INDEX IF NOT EXISTS cost_estimates_job_id_idx ON public.cost_estimates(job_id);
CREATE INDEX IF NOT EXISTS cost_estimates_vehicle_id_idx ON public.cost_estimates(vehicle_id);
CREATE INDEX IF NOT EXISTS cost_estimates_driver_id_idx ON public.cost_estimates(driver_id);
CREATE INDEX IF NOT EXISTS cost_estimates_created_at_idx ON public.cost_estimates(created_at DESC);
CREATE INDEX IF NOT EXISTS cost_estimates_status_idx ON public.cost_estimates(status);

-- Enable RLS
ALTER TABLE public.cost_estimates ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Multi-Tenant)

CREATE POLICY "Platform admin sees all cost estimates" ON public.cost_estimates
  FOR SELECT USING (is_platform_admin());

CREATE POLICY "Company users can view own cost estimates" ON public.cost_estimates
  FOR SELECT USING (
    company_id = get_user_company_id()
  );

CREATE POLICY "Company admins and managers can insert cost estimates" ON public.cost_estimates
  FOR INSERT WITH CHECK (
    (is_platform_admin() OR company_id = get_user_company_id())
    AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'fleet_manager', 'dispatcher', 'accountant')
    )
  );

CREATE POLICY "Company admins and managers can update own cost estimates" ON public.cost_estimates
  FOR UPDATE USING (
    (is_platform_admin() OR company_id = get_user_company_id())
    AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'fleet_manager', 'accountant')
    )
  );

CREATE POLICY "Company admins can delete own cost estimates" ON public.cost_estimates
  FOR DELETE USING (
    (is_platform_admin() OR company_id = get_user_company_id())
    AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Updated_at trigger
CREATE TRIGGER cost_estimates_updated_at
  BEFORE UPDATE ON public.cost_estimates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- COST HISTORY VIEW (for reporting)
-- ============================================
CREATE OR REPLACE VIEW public.cost_summary AS
SELECT 
  ce.id,
  ce.job_id,
  j.job_number,
  ce.vehicle_id,
  v.registration_number as vehicle_registration,
  v.make || ' ' || v.model as vehicle_name,
  ce.driver_id,
  p.full_name as driver_name,
  ce.distance_km,
  ce.fuel_cost,
  ce.toll_cost,
  ce.driver_cost,
  ce.other_costs,
  ce.total_cost,
  ce.status,
  ce.created_at,
  DATE_TRUNC('month', ce.created_at) as month
FROM public.cost_estimates ce
LEFT JOIN public.jobs j ON ce.job_id = j.id
LEFT JOIN public.vehicles v ON ce.vehicle_id = v.id
LEFT JOIN public.drivers d ON ce.driver_id = d.id
LEFT JOIN public.profiles p ON d.id = p.id
ORDER BY ce.created_at DESC;
