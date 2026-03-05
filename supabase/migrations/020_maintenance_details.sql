-- ============================================
-- MAINTENANCE WORK ORDER ENHANCEMENTS
-- Adds granular cost tracking and document
-- attachment support for maintenance records.
-- ============================================

-- 1. Add itemized cost columns to maintenance_records
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS parts_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS mechanic_notes TEXT;

-- 2. RLS policies for maintenance-linked documents
--    The documents table is polymorphic (entity_type + entity_id).
--    We need to allow 'maintenance' as an entity_type.

CREATE POLICY "Company users see maintenance documents" ON public.documents
  FOR SELECT USING (
    entity_type = 'maintenance' AND EXISTS (
      SELECT 1 FROM public.maintenance_records mr
      JOIN public.vehicles v ON v.id = mr.vehicle_id
      WHERE mr.id = documents.entity_id
      AND v.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Company users can insert maintenance documents" ON public.documents
  FOR INSERT TO authenticated WITH CHECK (
    entity_type = 'maintenance' AND (
      is_platform_admin() OR EXISTS (
        SELECT 1 FROM public.maintenance_records mr
        JOIN public.vehicles v ON v.id = mr.vehicle_id
        WHERE mr.id = documents.entity_id
        AND v.company_id = get_user_company_id()
      )
    )
  );

CREATE POLICY "Company users can delete maintenance documents" ON public.documents
  FOR DELETE USING (
    entity_type = 'maintenance' AND (
      is_platform_admin() OR EXISTS (
        SELECT 1 FROM public.maintenance_records mr
        JOIN public.vehicles v ON v.id = mr.vehicle_id
        WHERE mr.id = documents.entity_id
        AND v.company_id = get_user_company_id()
      )
    )
  );
