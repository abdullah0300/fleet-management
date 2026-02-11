-- Location History Table
-- Tracks breadcrumbs of vehicle location over time

CREATE TABLE IF NOT EXISTS vehicle_location_history (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    heading double precision DEFAULT 0,
    speed double precision DEFAULT 0,
    timestamp timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- Index for fast queries by vehicle and time
CREATE INDEX IF NOT EXISTS idx_vehicle_location_history_vehicle_time 
ON vehicle_location_history (vehicle_id, timestamp DESC);

-- RLS Policies
ALTER TABLE vehicle_location_history ENABLE ROW LEVEL SECURITY;

-- Dispatchers and Admins can view all history
CREATE POLICY "Dispatchers can view location history" 
ON vehicle_location_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'dispatcher', 'fleet_manager')
    )
);

-- Drivers can insert their own location (managed via Edge Function usually, but good to have)
CREATE POLICY "Drivers can insert location history" 
ON vehicle_location_history FOR INSERT 
WITH CHECK (
    driver_id = auth.uid()
);
