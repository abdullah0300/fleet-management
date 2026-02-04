-- Upgrade job_stops for Advanced Scheduling
-- We need to support "Fixed" vs "Window" modes

-- 1. Add the Type discriminator
ALTER TABLE job_stops 
ADD COLUMN arrival_mode text CHECK (arrival_mode IN ('fixed', 'window')) DEFAULT 'fixed';

-- 2. Add Window columns (Timestamp to allow Date + Time)
ALTER TABLE job_stops 
ADD COLUMN window_start timestamp with time zone,
ADD COLUMN window_end timestamp with time zone;

-- 3. Upgrade scheduled_time to Timestamp (for Fixed mode) to support Date + Time
-- We'll assume existing times are for the current date if we cast them, or just make a new column.
-- Safest is to add a new column 'scheduled_arrival' and migrate data if needed, but for now we'll just add it.
ALTER TABLE job_stops 
ADD COLUMN scheduled_arrival timestamp with time zone;

-- Note: scheduled_time (Time only) is now legacy/redundant, but we can keep it or migrate it.
-- We will use `scheduled_arrival` for the new "Fixed" date+time.
