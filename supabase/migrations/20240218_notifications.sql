-- ==========================================
-- 1. NOTIFICATIONS TABLE
-- ==========================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null, -- e.g., 'job_assigned', 'maintenance_due'
  title text not null,
  message text,
  read boolean default false,
  data jsonb, -- For arbitrary data like { job_id: '...' }
  created_at timestamptz default now()
);

-- RLS Policies for Notifications
alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications (mark as read)"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Note: Inserts usually happen via Server Actions using Service Role, 
-- but if we want client-side triggers (less secure), we'd need an insert policy.
-- Keeping it restricted for now to ensure system integrity.

-- Enable Realtime
-- This is critical for the Bell icon to update instantly
alter publication supabase_realtime add table public.notifications;


-- ==========================================
-- 2. PUSH TOKENS TABLE
-- ==========================================

create table if not exists public.user_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  token text not null,
  platform text, -- 'ios', 'android', 'web'
  last_used_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id, token) -- Prevent duplicates
);

-- RLS Policies for Push Tokens
alter table public.user_push_tokens enable row level security;

create policy "Users can manage their own push tokens"
  on public.user_push_tokens for all
  using (auth.uid() = user_id);


-- ==========================================
-- 3. INDEXES FOR PERFORMANCE
-- ==========================================

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(user_id, read);
