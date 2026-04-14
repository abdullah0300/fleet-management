-- ============================================================
-- Integration Marketplace 
-- Adds tables for broker integrations (Cargomatic phase 1):
--   company_integrations  — per-company connection state + encrypted credentials
--   integration_events    — full activity log per integration
--   pending_tenders       — incoming load tenders awaiting dispatcher review
--
-- Also extends jobs + job_stops with source tracking columns.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. company_integrations
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_integrations (
    id                  uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id          uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    integration_slug    text        NOT NULL,              -- e.g. 'cargomatic'
    status              text        NOT NULL DEFAULT 'disconnected',  -- connected | disconnected | error
    credentials         text,                              -- AES-256-GCM encrypted JSON: {username, password}
    webhook_secret      text,                              -- secret token for ?secret= query param
    connected_by        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    connected_at        timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (company_id, integration_slug)
);

CREATE TRIGGER handle_updated_at_company_integrations
    BEFORE UPDATE ON public.company_integrations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: users can read their company's integrations; all writes via service role
ALTER TABLE public.company_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_integrations_select"
    ON public.company_integrations FOR SELECT
    USING (
        company_id = public.get_user_company_id()
        OR public.is_platform_admin()
    );

-- ─────────────────────────────────────────────────────────────
-- 2. integration_events  (activity log)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integration_events (
    id                  uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id          uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    integration_slug    text        NOT NULL,
    event_type          text        NOT NULL,   -- load_tender | accept_shipment | decline_tender | webhook_received | etc.
    direction           text        NOT NULL DEFAULT 'inbound',   -- inbound | outbound
    status              text        NOT NULL DEFAULT 'success',   -- success | error
    reference           text,                   -- shipmentReference or other external ID
    payload             jsonb,                  -- relevant request/response data
    error_message       text,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_events_company_slug
    ON public.integration_events (company_id, integration_slug, created_at DESC);

-- RLS: read-only for company users; writes via service role
ALTER TABLE public.integration_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integration_events_select"
    ON public.integration_events FOR SELECT
    USING (
        company_id = public.get_user_company_id()
        OR public.is_platform_admin()
    );

-- ─────────────────────────────────────────────────────────────
-- 3. pending_tenders  (incoming load tenders from brokers)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pending_tenders (
    id                  uuid        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_id          uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    integration_slug    text        NOT NULL DEFAULT 'cargomatic',
    shipment_reference  text        NOT NULL,   -- Cargomatic's shipmentReference (e.g. TES-1296)
    raw_payload         jsonb       NOT NULL,   -- full webhook payload stored as-is
    status              text        NOT NULL DEFAULT 'pending',   -- pending | accepted | declined
    job_id              uuid        REFERENCES public.jobs(id) ON DELETE SET NULL,
    acted_by            uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    acted_at            timestamptz,
    received_at         timestamptz NOT NULL DEFAULT now(),
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_tenders_company_status
    ON public.pending_tenders (company_id, status, received_at DESC);

CREATE TRIGGER handle_updated_at_pending_tenders
    BEFORE UPDATE ON public.pending_tenders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS: read-only for company users; writes via service role
ALTER TABLE public.pending_tenders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_tenders_select"
    ON public.pending_tenders FOR SELECT
    USING (
        company_id = public.get_user_company_id()
        OR public.is_platform_admin()
    );

-- ─────────────────────────────────────────────────────────────
-- 4. Extend jobs — source tracking
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS source_integration text,    -- e.g. 'cargomatic'
    ADD COLUMN IF NOT EXISTS external_job_ref   text;    -- e.g. 'TES-1296'

CREATE INDEX IF NOT EXISTS idx_jobs_external_ref
    ON public.jobs (source_integration, external_job_ref)
    WHERE external_job_ref IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 5. Extend job_stops — external stop ID
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.job_stops
    ADD COLUMN IF NOT EXISTS external_stop_id text;      -- Cargomatic's stopId

-- ─────────────────────────────────────────────────────────────
-- 6. Realtime — enable for pending_tenders so dispatchers
--    receive live updates without polling
-- ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.pending_tenders;
