-- ============================================
-- Seed Default Service Program Templates
-- These are global templates (company_id = NULL)
-- available to all tenants as starting points.
-- ============================================

INSERT INTO public.service_programs (name, description, interval_miles, interval_months, company_id)
VALUES
  (
    'Oil Change & Filter',
    'Standard engine oil and oil filter replacement. Critical for engine longevity.',
    5000,
    4,
    NULL
  ),
  (
    'Tire Rotation & Inspection',
    'Rotate tires and inspect tread depth, sidewall condition, and pressure.',
    10000,
    6,
    NULL
  ),
  (
    'Brake Pad Inspection',
    'Inspect brake pads, rotors/drums, brake lines, and fluid level.',
    30000,
    12,
    NULL
  ),
  (
    'Annual DOT Inspection',
    'Full Department of Transportation compliance inspection. Required annually by law.',
    NULL,
    12,
    NULL
  ),
  (
    'Air Filter Replacement',
    'Replace engine air filter and cabin air filter for optimal airflow and fuel efficiency.',
    15000,
    12,
    NULL
  ),
  (
    'Full Fluid Flush (Coolant/Trans)',
    'Complete flush and replacement of coolant, transmission fluid, and differential fluid.',
    50000,
    24,
    NULL
  )
ON CONFLICT DO NOTHING;
