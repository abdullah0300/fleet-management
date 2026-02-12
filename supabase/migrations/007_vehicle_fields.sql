-- Migration: Rename registration_number to license_plate, add VIN and RFID Tag
-- Date: 2026-02-13

-- 1. Rename registration_number → license_plate
ALTER TABLE vehicles RENAME COLUMN registration_number TO license_plate;

-- 2. Add VIN number column (nullable)
ALTER TABLE vehicles ADD COLUMN vin_number TEXT;

-- 3. Add RFID Tag column (nullable)
ALTER TABLE vehicles ADD COLUMN rfid_tag TEXT;
