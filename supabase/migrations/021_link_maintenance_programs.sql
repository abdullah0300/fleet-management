-- Add program_id to explicitly link maintenance records to service templates
ALTER TABLE maintenance_records ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES service_programs(id) ON DELETE SET NULL;
