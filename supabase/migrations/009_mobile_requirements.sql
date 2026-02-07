-- Mobile Driver App Setup SQL

-- 1. Drivers Table - Login Support
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS login_pin text UNIQUE;

-- 2. Job Stops - Status Tracking
ALTER TABLE job_stops ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE job_stops ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- 3. Row Level Security updates (ensure drivers can read/update their own stops)
-- This depends on if RLS is already active. Assuming yes for safety:
-- Policy for drivers to update status of stops on jobs assigned to them
-- (Implementation of RLS usually requires known policies, this is a placeholder/safe-add if policies exist)
