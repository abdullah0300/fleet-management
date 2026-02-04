-- Add timing columns to job_stops table
ALTER TABLE job_stops 
ADD COLUMN IF NOT EXISTS scheduled_time time without time zone,
ADD COLUMN IF NOT EXISTS service_duration integer DEFAULT 0; -- in minutes

-- Add comment for clarity
COMMENT ON COLUMN job_stops.service_duration IS 'Estimated time spent at the stop in minutes';
