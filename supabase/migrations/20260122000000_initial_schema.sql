-- Create custom types (enums)
create type public.user_role as enum ('admin', 'fleet_manager', 'dispatcher', 'driver', 'accountant');
create type public.vehicle_status as enum ('available', 'in_use', 'maintenance', 'inactive');
create type public.job_status as enum ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
create type public.payment_type as enum ('per_mile', 'per_trip', 'hourly', 'salary');
create type public.driver_status as enum ('active', 'inactive', 'on_leave');

-- 1. Profiles Table (Extends auth.users)
create table public.profiles (
  id uuid not null references auth.users(id) on delete cascade primary key,
  role public.user_role not null default 'driver',
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Vehicles Table
create table public.vehicles (
  id uuid default gen_random_uuid() primary key,
  make text not null,
  model text not null,
  year integer not null,
  license_plate text not null unique,
  vin text,
  status public.vehicle_status default 'available',
  location jsonb, -- { "lat": 123, "lng": 456 }
  odometer_meters integer default 0,
  fuel_level_percent integer,
  assigned_driver_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Drivers Table (Driver specific details)
create table public.drivers (
  id uuid not null references public.profiles(id) on delete cascade primary key,
  license_number text,
  license_expiry date,
  payment_type public.payment_type default 'per_mile',
  rate numeric(10, 2), -- Hourly rate or Per Mile rate
  status public.driver_status default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Routes Table
create table public.routes (
  id uuid default gen_random_uuid() primary key,
  name text,
  origin_address text not null,
  destination_address text not null,
  origin_coords jsonb not null, -- { "lat": ..., "lng": ... }
  destination_coords jsonb not null,
  waypoints jsonb default '[]', -- Array of waypoint objects
  distance_meters integer,
  duration_seconds integer,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Jobs Table (Pickups/Deliveries)
create table public.jobs (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  pickup_address text,
  delivery_address text,
  pickup_time timestamptz,
  delivery_time timestamptz,
  status public.job_status default 'pending',
  vehicle_id uuid references public.vehicles(id),
  driver_id uuid references public.profiles(id),
  route_id uuid references public.routes(id),
  notes text,
  cost_estimate numeric(10, 2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Trips Table (Executed trips)
create table public.trips (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id),
  driver_id uuid references public.profiles(id),
  vehicle_id uuid references public.vehicles(id),
  start_time timestamptz,
  end_time timestamptz,
  start_odometer integer,
  end_odometer integer,
  distance_meters integer,
  status text, -- e.g. 'started', 'ended'
  gps_trace jsonb, -- potentially large, maybe store simplified path or reference to storage
  created_at timestamptz default now()
);

-- 7. Proof of Delivery Table
create table public.proof_of_delivery (
  id uuid default gen_random_uuid() primary key,
  job_id uuid references public.jobs(id) not null,
  photo_url text,
  signature_url text,
  notes text,
  timestamp timestamptz default now(),
  created_at timestamptz default now()
);

-- 8. Maintenance Records Table
create table public.maintenance_records (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid references public.vehicles(id) not null,
  service_date date not null,
  description text not null,
  cost numeric(10, 2),
  odometer_at_service integer,
  performed_by text,
  type text, -- 'scheduled', 'repair'
  next_service_date date,
  next_service_odometer integer,
  created_at timestamptz default now()
);

-- 9. Documents Table
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  entity_type text not null, -- 'vehicle', 'driver', 'job'
  entity_id uuid not null, -- generic reference, enforced by app logic
  name text not null,
  file_url text not null,
  file_type text,
  expiry_date date,
  created_at timestamptz default now()
);

-- 10. Notifications Table
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  title text not null,
  message text not null,
  read boolean default false,
  type text, -- 'alert', 'info', 'reminder'
  link text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.routes enable row level security;
alter table public.jobs enable row level security;
alter table public.trips enable row level security;
alter table public.proof_of_delivery enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;

-- Basic Policies (Open for development, restrict later)
create policy "Enable read access for authenticated users" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Enable insert for authenticated users" on public.profiles for insert with check (auth.role() = 'authenticated');
create policy "Enable update for users based on id" on public.profiles for update using (auth.uid() = id);

-- For other tables, just allow all authenticated for now to speed up Phase 1/2
create policy "Enable all access for authenticated users" on public.vehicles for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on public.drivers for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on public.routes for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on public.jobs for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on public.trips for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on public.proof_of_delivery for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on public.maintenance_records for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on public.documents for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on public.notifications for all using (auth.role() = 'authenticated');

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'driver'); -- Default to driver or check metadata
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
