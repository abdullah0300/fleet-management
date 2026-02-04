-- =============================================
-- SQL Migration: Add missing columns to jobs table
-- Run this in Supabase SQL Editor
-- =============================================

-- Add customer_email column to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS customer_email text;

-- Add priority column to jobs table with default value 'normal'
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' 
CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- =============================================
-- Verify the changes (optional - run to check)
-- =============================================
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'jobs' 
-- ORDER BY ordinal_position;
