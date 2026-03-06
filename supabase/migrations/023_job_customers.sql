-- ============================================
-- FLEET MANAGEMENT SAAS - ADD CUSTOMERS DATABASE
-- ============================================

-- 1. Create the new customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    email text,
    phone text,
    billing_address text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customers_pkey PRIMARY KEY (id)
);

-- 2. Add RLS Policies for customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers" ON public.customers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert customers" ON public.customers
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers" ON public.customers
    FOR UPDATE TO authenticated USING (true);

-- 3. Add updated_at trigger for customers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Alter existing jobs table to link to customers
-- We intentionally DO NOT drop customer_name/phone/email yet to retain historical data perfectly.
ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- 5. Add index for performance
CREATE INDEX IF NOT EXISTS idx_jobs_customer ON public.jobs(customer_id);
