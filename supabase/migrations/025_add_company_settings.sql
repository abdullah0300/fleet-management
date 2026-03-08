-- Migration: 025_add_company_settings
-- Description: Adds a JSONB settings column to the companies table to store tenant configurations

-- Add settings column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'settings'
    ) THEN 
        ALTER TABLE companies ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Provide an RLS policy if needed, but since companies table already has policies, 
-- updating the settings column will be covered by existing UPDATE policies for admins.
