-- ============================================
-- Job Costing & Profitability
-- ============================================

-- 1. Add revenue and billing fields to jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS revenue DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'flat_rate';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS driver_pay_rate_override DECIMAL(10,2) DEFAULT NULL;

-- 2. Pay Adjustments per job (detention, bonus, deductions, etc.)
CREATE TABLE IF NOT EXISTS job_pay_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    type TEXT NOT NULL DEFAULT 'bonus',
    -- type: 'bonus' | 'deduction' | 'detention' | 'stop_pay' | 'loading' | 'hazmat' | 'other'
    label TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE job_pay_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Company users can view own adjustments"
ON job_pay_adjustments FOR SELECT
USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Company users can insert adjustments"
ON job_pay_adjustments FOR INSERT
WITH CHECK (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Company users can update own adjustments"
ON job_pay_adjustments FOR UPDATE
USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Company users can delete own adjustments"
ON job_pay_adjustments FOR DELETE
USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
));
