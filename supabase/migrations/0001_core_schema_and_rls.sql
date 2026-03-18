-- BookFlow Pro - Supabase schema (Phase 1)
-- Note: This is written to be compatible with Supabase/Postgres.

begin;

create extension if not exists pgcrypto;

-- 1) Tenant + identity
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  status text not null default 'Active',
  default_timezone text not null default 'Africa/Johannesburg',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  is_system bool not null default false,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  display_name text,
  email text,
  phone text,
  is_active bool not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_role_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_profile_id uuid not null references public.user_profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  is_primary bool not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_role_assignments_tenant_profile
  on public.user_role_assignments (tenant_id, user_profile_id);

-- 2) Helper functions for RLS / app logic
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select up.tenant_id
  from public.user_profiles up
  where up.auth_user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select r.name
  from public.user_profiles up
  join public.user_role_assignments ura on ura.user_profile_id = up.id
  join public.roles r on r.id = ura.role_id
  where up.auth_user_id = auth.uid()
  order by ura.is_primary desc, r.name
  limit 1;
$$;

-- 3) Branch + service catalog (minimal for Phase 1 booking)
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  code text,
  created_at timestamptz not null default now()
);

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  category_id uuid references public.service_categories(id) on delete set null,
  name text not null,
  code text not null,
  duration_minutes int not null,
  is_active bool not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists public.sub_services (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  name text not null,
  code text not null,
  duration_override_minutes int,
  is_active bool not null default true,
  created_at timestamptz not null default now(),
  unique (service_id, code)
);

-- Resource typing + eligibility (minimal)
create table if not exists public.resource_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  code text not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists public.service_resources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  resource_type_id uuid not null references public.resource_types(id) on delete cascade,
  is_active bool not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, service_id, resource_type_id)
);

-- 4) Customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  reference_no text not null default ('CUST-' || substr(md5(random()::text), 1, 8)),
  full_name text,
  email text,
  phone text,
  date_of_birth date,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, reference_no)
);

create index if not exists idx_customers_tenant_email
  on public.customers (tenant_id, email);
create index if not exists idx_customers_tenant_phone
  on public.customers (tenant_id, phone);

-- 5) Resources + seats (minimal for seat capacity scenarios)
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  resource_type_id uuid not null references public.resource_types(id) on delete restrict,
  code text not null,
  name text not null,
  capacity int not null default 1,
  status text not null default 'Active',
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create index if not exists idx_resources_tenant_branch_status
  on public.resources (tenant_id, branch_id, status);
create index if not exists idx_resources_type_status
  on public.resources (tenant_id, resource_type_id, status);

create table if not exists public.seat_maps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  resource_id uuid references public.resources(id) on delete set null,
  name text,
  is_active bool not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_seat_maps_tenant_resource
  on public.seat_maps (tenant_id, resource_id);

create table if not exists public.seats (
  id uuid primary key default gen_random_uuid(),
  seat_map_id uuid not null references public.seat_maps(id) on delete cascade,
  seat_number text not null,
  row_no int,
  col_no int,
  seat_class text,
  is_bookable bool not null default true,
  created_at timestamptz not null default now(),
  unique (seat_map_id, seat_number)
);

create index if not exists idx_seats_map_bookable
  on public.seats (seat_map_id, is_bookable, seat_number);

-- Availability/Unavailability (minimal overlap checks)
create table if not exists public.resource_availability (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.resource_unavailability (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_resource_availability_resource_time
  on public.resource_availability (tenant_id, resource_id, start_time, end_time);
create index if not exists idx_resource_unavailability_resource_time
  on public.resource_unavailability (tenant_id, resource_id, start_time, end_time);

-- 6) Booking + allocations (minimal for Phase 1)
create table if not exists public.booking_statuses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  is_system bool not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  booking_reference text null,
  status_id uuid not null references public.booking_statuses(id) on delete restrict,
  booking_at timestamptz not null default now(),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  source text not null default 'Web',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- booking_reference must be unique per tenant when set
create unique index if not exists uq_bookings_reference_per_tenant
  on public.bookings (tenant_id, booking_reference)
  where booking_reference is not null;

create index if not exists idx_bookings_tenant_status_start
  on public.bookings (tenant_id, status_id, scheduled_start);
create index if not exists idx_bookings_customer_start
  on public.bookings (tenant_id, customer_id, scheduled_start);

create table if not exists public.booking_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  sub_service_id uuid references public.sub_services(id) on delete set null,
  quantity int not null default 1,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  allocation_status text not null default 'Unallocated'
);

create index if not exists idx_booking_items_booking
  on public.booking_items (tenant_id, booking_id);
create index if not exists idx_booking_items_service_start
  on public.booking_items (tenant_id, service_id, scheduled_start);

create table if not exists public.allocations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_item_id uuid not null references public.booking_items(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete restrict,
  seat_id uuid references public.seats(id) on delete set null,
  allocated_at timestamptz not null default now(),
  status text not null default 'Confirmed',
  algorithm_version text,
  manual_override bool not null default false,
  unique (booking_item_id, resource_id, seat_id)
);

create index if not exists idx_allocations_resource_time
  on public.allocations (tenant_id, resource_id, allocated_at);
create index if not exists idx_allocations_vehicle_seat
  on public.allocations (tenant_id, seat_id, allocated_at);
create index if not exists idx_allocations_tenant_status
  on public.allocations (tenant_id, status);

-- Allocation rules / batching (minimal placeholders for Phase 1)
create table if not exists public.allocation_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  rule_scope text not null default 'service',
  priority int not null default 100,
  rule_expression jsonb not null default '{}'::jsonb,
  is_active bool not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.allocation_batches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  algorithm_version text not null default 'phase1-v1',
  status text not null default 'Running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_by_user_id uuid
);

create table if not exists public.seat_holds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_item_id uuid not null references public.booking_items(id) on delete cascade,
  seat_id uuid references public.seats(id) on delete set null,
  held_until timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_seat_holds_tenant_until
  on public.seat_holds (tenant_id, held_until);

create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid,
  event_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_booking_events_tenant_booking
  on public.booking_events (tenant_id, booking_id, created_at desc);

-- 7) Notification queue (minimal)
create table if not exists public.notification_channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel_type text not null, -- 'email' | 'sms' | 'in_app'
  name text,
  is_active bool not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, channel_type)
);

create table if not exists public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel_id uuid references public.notification_channels(id) on delete set null,
  template_id uuid,
  booking_id uuid references public.bookings(id) on delete set null,
  recipient text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'Queued', -- Queued | Sent | Failed
  queued_at timestamptz not null default now(),
  processed_at timestamptz,
  try_count int not null default 0
);

create index if not exists idx_notification_queue_status
  on public.notification_queue (tenant_id, status, queued_at);

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel_id uuid references public.notification_channels(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  recipient text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'Sent',
  created_at timestamptz not null default now()
);

-- 8) Audit log (immutable-ish)
create table if not exists public.audit_log (
  id bigserial primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_user_id uuid,
  entity_name text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_tenant_entity
  on public.audit_log (tenant_id, entity_name, entity_id);
create index if not exists idx_audit_log_created_at
  on public.audit_log (created_at desc);

-- 9) RLS enablement + policies
-- Deny-by-default
alter table public.tenants enable row level security;
alter table public.roles enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_role_assignments enable row level security;
alter table public.branches enable row level security;
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.sub_services enable row level security;
alter table public.resource_types enable row level security;
alter table public.service_resources enable row level security;
alter table public.customers enable row level security;
alter table public.resources enable row level security;
alter table public.seat_maps enable row level security;
alter table public.seats enable row level security;
alter table public.resource_availability enable row level security;
alter table public.resource_unavailability enable row level security;
alter table public.booking_statuses enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_items enable row level security;
alter table public.allocations enable row level security;
alter table public.allocation_rules enable row level security;
alter table public.allocation_batches enable row level security;
alter table public.seat_holds enable row level security;
alter table public.booking_events enable row level security;
alter table public.notification_channels enable row level security;
alter table public.notification_queue enable row level security;
alter table public.notification_log enable row level security;
alter table public.audit_log enable row level security;

-- tenants
create policy tenants_select_own_tenant
on public.tenants for select
using (id = public.current_tenant_id());

-- roles
create policy roles_select_for_current_user_tenant
on public.roles for select
using (tenant_id = public.current_tenant_id());

-- user_profiles (avoid recursion: do not use current_tenant_id() here)
create policy user_profiles_select_own
on public.user_profiles for select
using (auth_user_id = auth.uid());

create policy user_profiles_insert_own
on public.user_profiles for insert
with check (auth_user_id = auth.uid());

-- user_role_assignments
create policy user_role_assignments_select_own_profile
on public.user_role_assignments for select
using (user_profile_id in (
  select up.id from public.user_profiles up where up.auth_user_id = auth.uid()
));

create policy user_role_assignments_insert_own_profile
on public.user_role_assignments for insert
with check (user_profile_id in (
  select up.id from public.user_profiles up where up.auth_user_id = auth.uid()
));

-- generic tenant-owned tables
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'branches' and policyname = 'branches_rw_tenant'
  ) then
    create policy branches_rw_tenant
    on public.branches
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'service_categories' and policyname = 'service_categories_rw_tenant'
  ) then
    create policy service_categories_rw_tenant
    on public.service_categories
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'services' and policyname = 'services_rw_tenant'
  ) then
    create policy services_rw_tenant
    on public.services
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'sub_services' and policyname = 'sub_services_rw_tenant'
  ) then
    create policy sub_services_rw_tenant
    on public.sub_services
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'resource_types' and policyname = 'resource_types_rw_tenant'
  ) then
    create policy resource_types_rw_tenant
    on public.resource_types
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'service_resources' and policyname = 'service_resources_rw_tenant'
  ) then
    create policy service_resources_rw_tenant
    on public.service_resources
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'customers' and policyname = 'customers_rw_tenant'
  ) then
    create policy customers_rw_tenant
    on public.customers
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'resources' and policyname = 'resources_rw_tenant'
  ) then
    create policy resources_rw_tenant
    on public.resources
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'seat_maps' and policyname = 'seat_maps_rw_tenant'
  ) then
    create policy seat_maps_rw_tenant
    on public.seat_maps
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

-- seats does not have tenant_id, so we enforce via seat_map tenant_id
create policy seats_rw_tenant
on public.seats
for all
using (
  exists (
    select 1
    from public.seat_maps sm
    where sm.id = seats.seat_map_id
      and sm.tenant_id = public.current_tenant_id()
  )
)
with check (
  exists (
    select 1
    from public.seat_maps sm
    where sm.id = seats.seat_map_id
      and sm.tenant_id = public.current_tenant_id()
  )
);

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'resource_availability' and policyname = 'resource_availability_rw_tenant'
  ) then
    create policy resource_availability_rw_tenant
    on public.resource_availability
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'resource_unavailability' and policyname = 'resource_unavailability_rw_tenant'
  ) then
    create policy resource_unavailability_rw_tenant
    on public.resource_unavailability
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'booking_statuses' and policyname = 'booking_statuses_rw_tenant'
  ) then
    create policy booking_statuses_rw_tenant
    on public.booking_statuses
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

-- bookings / allocations / events: tenant-scoped. Update policy can be tightened later.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'bookings' and policyname = 'bookings_rw_tenant'
  ) then
    create policy bookings_rw_tenant
    on public.bookings
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'booking_items' and policyname = 'booking_items_rw_tenant'
  ) then
    create policy booking_items_rw_tenant
    on public.booking_items
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'allocations' and policyname = 'allocations_rw_tenant'
  ) then
    create policy allocations_rw_tenant
    on public.allocations
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'allocation_rules' and policyname = 'allocation_rules_rw_tenant'
  ) then
    create policy allocation_rules_rw_tenant
    on public.allocation_rules
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'allocation_batches' and policyname = 'allocation_batches_rw_tenant'
  ) then
    create policy allocation_batches_rw_tenant
    on public.allocation_batches
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'seat_holds' and policyname = 'seat_holds_rw_tenant'
  ) then
    create policy seat_holds_rw_tenant
    on public.seat_holds
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'booking_events' and policyname = 'booking_events_rw_tenant'
  ) then
    create policy booking_events_rw_tenant
    on public.booking_events
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_channels' and policyname = 'notification_channels_rw_tenant'
  ) then
    create policy notification_channels_rw_tenant
    on public.notification_channels
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_queue' and policyname = 'notification_queue_rw_tenant'
  ) then
    create policy notification_queue_rw_tenant
    on public.notification_queue
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'notification_log' and policyname = 'notification_log_rw_tenant'
  ) then
    create policy notification_log_rw_tenant
    on public.notification_log
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'audit_log' and policyname = 'audit_log_rw_tenant'
  ) then
    create policy audit_log_rw_tenant
    on public.audit_log
    for all
    using (tenant_id = public.current_tenant_id())
    with check (tenant_id = public.current_tenant_id());
  end if;
end $$;

-- 10) Basic reference data hooks (RPC/seed will rely on these names)
-- (No seed rows inserted here; that happens in the seed step.)

commit;

