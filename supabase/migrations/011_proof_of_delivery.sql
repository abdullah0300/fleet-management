-- Proof of Delivery location tracking
-- Adds columns to track where and when stops were actually completed

ALTER TABLE job_stops 
ADD COLUMN IF NOT EXISTS actual_arrival_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS actual_arrival_lat double precision,
ADD COLUMN IF NOT EXISTS actual_arrival_lng double precision,
ADD COLUMN IF NOT EXISTS actual_completion_lat double precision,
ADD COLUMN IF NOT EXISTS actual_completion_lng double precision,
ADD COLUMN IF NOT EXISTS flagged_location boolean DEFAULT false;

COMMENT ON COLUMN job_stops.flagged_location IS 'True if the completion location was significantly different from the planned location';
