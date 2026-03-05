-- ============================================
-- Maintenance Notification Trigger
-- Fires when vehicle_service_programs.status
-- changes to 'due' or 'overdue'.
-- Creates a notification for all admin/fleet_manager
-- users in the same company as the vehicle.
-- ============================================

CREATE OR REPLACE FUNCTION notify_maintenance_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_vehicle RECORD;
    v_program RECORD;
    v_user RECORD;
    v_title TEXT;
    v_message TEXT;
    v_type TEXT;
BEGIN
    -- Only fire on status change to 'due' or 'overdue'
    IF NEW.status NOT IN ('due', 'overdue') THEN
        RETURN NEW;
    END IF;

    -- Don't fire if status didn't actually change
    IF OLD IS NOT NULL AND OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- Get vehicle details
    SELECT id, license_plate, make, model, company_id
    INTO v_vehicle
    FROM vehicles
    WHERE id = NEW.vehicle_id;

    -- Get program name
    SELECT name
    INTO v_program
    FROM service_programs
    WHERE id = NEW.program_id;

    -- Build notification content
    IF NEW.status = 'overdue' THEN
        v_title := 'Maintenance Overdue';
        v_message := v_program.name || ' is overdue for ' || v_vehicle.make || ' ' || v_vehicle.model || ' (' || v_vehicle.license_plate || ')';
        v_type := 'maintenance_due';
    ELSE
        v_title := 'Maintenance Due Soon';
        v_message := v_program.name || ' is due for ' || v_vehicle.make || ' ' || v_vehicle.model || ' (' || v_vehicle.license_plate || ')';
        v_type := 'maintenance_due';
    END IF;

    -- Insert notification for each admin/fleet_manager in the same company
    FOR v_user IN
        SELECT id FROM profiles
        WHERE company_id = v_vehicle.company_id
        AND role IN ('admin', 'fleet_manager')
    LOOP
        INSERT INTO notifications (user_id, type, title, message, read, data)
        VALUES (
            v_user.id,
            v_type,
            v_title,
            v_message,
            false,
            jsonb_build_object(
                'vehicle_id', NEW.vehicle_id,
                'program_id', NEW.program_id,
                'status', NEW.status
            )
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_maintenance_status_notification ON vehicle_service_programs;

-- Create the trigger
CREATE TRIGGER trg_maintenance_status_notification
    AFTER INSERT OR UPDATE OF status
    ON vehicle_service_programs
    FOR EACH ROW
    EXECUTE FUNCTION notify_maintenance_status_change();
