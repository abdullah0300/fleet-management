-- Fix inconsistent vehicle/driver assignments for existing manifests

-- 1. Sync Vehicles: Update current_driver_id from the latest active manifest
UPDATE vehicles v
SET 
  current_driver_id = sub.driver_id, 
  status = 'in_use'
FROM (
    SELECT DISTINCT ON (vehicle_id) vehicle_id, driver_id
    FROM manifests
    WHERE status IN ('scheduled', 'in_transit') 
    AND driver_id IS NOT NULL
    ORDER BY vehicle_id, created_at DESC
) sub
WHERE v.id = sub.vehicle_id
AND (v.current_driver_id IS NULL OR v.current_driver_id != sub.driver_id);

-- 2. Sync Drivers: Update assigned_vehicle_id from the latest active manifest
UPDATE drivers d
SET 
  assigned_vehicle_id = sub.vehicle_id, 
  status = 'on_trip'
FROM (
    SELECT DISTINCT ON (driver_id) driver_id, vehicle_id
    FROM manifests
    WHERE status IN ('scheduled', 'in_transit') 
    AND vehicle_id IS NOT NULL
    ORDER BY driver_id, created_at DESC
) sub
WHERE d.id = sub.driver_id
AND (d.assigned_vehicle_id IS NULL OR d.assigned_vehicle_id != sub.vehicle_id);
