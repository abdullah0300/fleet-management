-- Migration 015: Add completion timestamp and location name to job_stops
-- These fields enable waiting time calculations and better location display

ALTER TABLE job_stops 
ADD COLUMN IF NOT EXISTS actual_completion_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS location_name text;

-- Add constraint: completion time must be at or after arrival time
-- (only enforced when both are set)
ALTER TABLE job_stops
ADD CONSTRAINT chk_completion_after_arrival
CHECK (
  actual_completion_time IS NULL 
  OR actual_arrival_time IS NULL 
  OR actual_completion_time >= actual_arrival_time
);

COMMENT ON COLUMN job_stops.actual_completion_time IS 'When the driver completed the stop (Picked Up/Delivered)';
COMMENT ON COLUMN job_stops.location_name IS 'Short location/city name for quick identification (e.g. Downtown LA)';
