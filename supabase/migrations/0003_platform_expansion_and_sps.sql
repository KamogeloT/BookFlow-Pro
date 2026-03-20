-- BookFlow Pro - Platform expansion (Phase 1 UI-complete backend foundation)
-- Adds missing schema modules + trusted RPCs (no UI wiring).

begin;

-- 1) Authorization / permissions
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

create index if not exists idx_role_permissions_role
  on public.role_permissions (role_id);

-- 2) Branding / app settings
create table if not exists public.tenant_branding (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  app_name text,
  logo_url text,
  favicon_url text,
  accent_color text,
  mode text not null default 'system',
  custom_css text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  setting_key text not null,
  setting_value jsonb not null default '{}'::jsonb,
  is_secret bool not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, setting_key)
);

create index if not exists idx_app_settings_tenant_key
  on public.app_settings (tenant_id, setting_key);

-- 3) Notification templates
create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  channel_id uuid not null references public.notification_channels(id) on delete cascade,
  trigger_event text not null,
  code text not null,
  name text not null,
  subject_template text,
  body_template text not null,
  is_active bool not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create index if not exists idx_notification_templates_tenant_trigger
  on public.notification_templates (tenant_id, trigger_event, is_active);

-- 4) Webhooks
create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  endpoint_url text not null,
  secret_ref text,
  events text[] not null default '{}'::text[],
  is_active bool not null default true,
  timeout_ms int not null default 8000,
  retry_limit int not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_webhook_endpoints_tenant_active
  on public.webhook_endpoints (tenant_id, is_active);

create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  event_name text not null,
  payload jsonb not null default '{}'::jsonb,
  response_code int,
  response_body text,
  status text not null default 'pending',
  attempts int not null default 0,
  next_retry_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_webhook_deliveries_dispatch
  on public.webhook_deliveries (tenant_id, status, next_retry_at, created_at);

-- 5) Waitlists
create table if not exists public.waitlists (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  requested_start timestamptz,
  requested_end timestamptz,
  priority int not null default 0,
  status text not null default 'Pending',
  source text not null default 'Web',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_waitlists_tenant_status
  on public.waitlists (tenant_id, status, priority desc, created_at);

create table if not exists public.waitlist_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  waitlist_id uuid not null references public.waitlists(id) on delete cascade,
  event_type text not null,
  actor_user_id uuid,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_waitlist_events_waitlist
  on public.waitlist_events (tenant_id, waitlist_id, created_at);

-- 6) Promotions
create table if not exists public.promotion_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  discount_type text not null default 'percentage',
  discount_value numeric(12,2) not null default 0,
  max_redemptions int,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active bool not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create index if not exists idx_promotion_campaigns_tenant_active
  on public.promotion_campaigns (tenant_id, is_active, starts_at, ends_at);

create table if not exists public.promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  campaign_id uuid not null references public.promotion_campaigns(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  redeemed_code text not null,
  discount_amount numeric(12,2) not null default 0,
  status text not null default 'Applied',
  created_at timestamptz not null default now()
);

create index if not exists idx_promotion_redemptions_tenant_booking
  on public.promotion_redemptions (tenant_id, booking_id, created_at);

-- 7) Feedback
create table if not exists public.feedback_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  rating int,
  category text,
  message text,
  sentiment text,
  status text not null default 'Open',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (rating is null or rating between 1 and 5)
);

create index if not exists idx_feedback_entries_tenant_status
  on public.feedback_entries (tenant_id, status, created_at desc);

-- 8) QR check-in
create table if not exists public.qr_checkins (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  qr_payload text,
  source text not null default 'web',
  status text not null default 'CheckedIn',
  checked_in_by uuid,
  checked_in_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_qr_checkins_tenant_booking
  on public.qr_checkins (tenant_id, booking_id, checked_in_at desc);

-- 9) API integrations / keys
create table if not exists public.api_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  provider text not null,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_api_integrations_tenant_status
  on public.api_integrations (tenant_id, status);

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  integration_id uuid references public.api_integrations(id) on delete set null,
  key_name text not null,
  key_prefix text not null,
  key_hash text not null,
  scopes text[] not null default '{}'::text[],
  is_active bool not null default true,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, key_name)
);

create index if not exists idx_api_keys_tenant_active
  on public.api_keys (tenant_id, is_active, expires_at);

-- 10) Reports / dashboard snapshots
create table if not exists public.report_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  code text not null,
  name text not null,
  category text,
  query_template text,
  default_filters jsonb not null default '{}'::jsonb,
  is_active bool not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, code)
);

create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  report_definition_id uuid references public.report_definitions(id) on delete set null,
  run_by uuid,
  filters jsonb not null default '{}'::jsonb,
  status text not null default 'Queued',
  rows_count int not null default 0,
  result_snapshot jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_report_runs_tenant_status
  on public.report_runs (tenant_id, status, created_at desc);

create table if not exists public.dashboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  dashboard_code text not null,
  snapshot_scope text not null default 'daily',
  snapshot_at timestamptz not null default now(),
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_dashboard_snapshots_tenant
  on public.dashboard_snapshots (tenant_id, dashboard_code, snapshot_at desc);

-- ---------------------------------------------------------------------------
-- RLS for new tables
-- ---------------------------------------------------------------------------
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.tenant_branding enable row level security;
alter table public.app_settings enable row level security;
alter table public.notification_templates enable row level security;
alter table public.webhook_endpoints enable row level security;
alter table public.webhook_deliveries enable row level security;
alter table public.waitlists enable row level security;
alter table public.waitlist_events enable row level security;
alter table public.promotion_campaigns enable row level security;
alter table public.promotion_redemptions enable row level security;
alter table public.feedback_entries enable row level security;
alter table public.qr_checkins enable row level security;
alter table public.api_integrations enable row level security;
alter table public.api_keys enable row level security;
alter table public.report_definitions enable row level security;
alter table public.report_runs enable row level security;
alter table public.dashboard_snapshots enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'permissions' and policyname = 'permissions_select_all'
  ) then
    create policy permissions_select_all
    on public.permissions for select
    using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'role_permissions' and policyname = 'role_permissions_rw_tenant_via_role'
  ) then
    create policy role_permissions_rw_tenant_via_role
    on public.role_permissions
    for all
    using (
      exists (
        select 1 from public.roles r
        where r.id = role_permissions.role_id
          and r.tenant_id = public.current_tenant_id()
      )
    )
    with check (
      exists (
        select 1 from public.roles r
        where r.id = role_permissions.role_id
          and r.tenant_id = public.current_tenant_id()
      )
    );
  end if;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'tenant_branding',
    'app_settings',
    'notification_templates',
    'webhook_endpoints',
    'webhook_deliveries',
    'waitlists',
    'waitlist_events',
    'promotion_campaigns',
    'promotion_redemptions',
    'feedback_entries',
    'qr_checkins',
    'api_integrations',
    'api_keys',
    'report_definitions',
    'report_runs',
    'dashboard_snapshots'
  ]
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = t
        and policyname = t || '_rw_tenant'
    ) then
      execute format(
        'create policy %I on public.%I for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id())',
        t || '_rw_tenant',
        t
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Trusted RPCs / stored procedures
-- ---------------------------------------------------------------------------

create or replace function public.upsert_app_setting(
  p_setting_key text,
  p_setting_value jsonb,
  p_is_secret bool default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_id uuid;
begin
  if v_tenant_id is null then
    raise exception 'Tenant not resolved for current auth user.';
  end if;
  if p_setting_key is null or btrim(p_setting_key) = '' then
    raise exception 'p_setting_key is required.';
  end if;

  insert into public.app_settings (tenant_id, setting_key, setting_value, is_secret, updated_at)
  values (v_tenant_id, btrim(p_setting_key), coalesce(p_setting_value, '{}'::jsonb), coalesce(p_is_secret, false), now())
  on conflict (tenant_id, setting_key)
  do update set
    setting_value = excluded.setting_value,
    is_secret = excluded.is_secret,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.add_waitlist_entry(
  p_service_id uuid,
  p_branch_id uuid,
  p_customer_email text,
  p_requested_start timestamptz,
  p_requested_end timestamptz,
  p_priority int default 0,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_customer_id uuid;
  v_waitlist_id uuid;
begin
  if v_tenant_id is null then
    raise exception 'Tenant not resolved for current auth user.';
  end if;
  if p_customer_email is null or btrim(p_customer_email) = '' then
    raise exception 'p_customer_email is required.';
  end if;

  select c.id into v_customer_id
  from public.customers c
  where c.tenant_id = v_tenant_id
    and c.email = p_customer_email
  limit 1;

  if v_customer_id is null then
    insert into public.customers (tenant_id, email)
    values (v_tenant_id, p_customer_email)
    returning id into v_customer_id;
  end if;

  insert into public.waitlists (
    tenant_id, branch_id, service_id, customer_id,
    requested_start, requested_end, priority, notes
  )
  values (
    v_tenant_id, p_branch_id, p_service_id, v_customer_id,
    p_requested_start, p_requested_end, coalesce(p_priority, 0), p_notes
  )
  returning id into v_waitlist_id;

  insert into public.waitlist_events (
    tenant_id, waitlist_id, event_type, actor_user_id, event_data
  )
  values (
    v_tenant_id, v_waitlist_id, 'Created', auth.uid(),
    jsonb_build_object('service_id', p_service_id, 'requested_start', p_requested_start)
  );

  return v_waitlist_id;
end;
$$;

create or replace function public.enqueue_notification_from_template(
  p_template_code text,
  p_trigger_event text,
  p_booking_id uuid,
  p_recipient text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_template record;
  v_queue_id uuid;
begin
  if v_tenant_id is null then
    raise exception 'Tenant not resolved for current auth user.';
  end if;

  select nt.*, nc.id as resolved_channel_id
  into v_template
  from public.notification_templates nt
  join public.notification_channels nc on nc.id = nt.channel_id
  where nt.tenant_id = v_tenant_id
    and nt.code = p_template_code
    and nt.trigger_event = p_trigger_event
    and nt.is_active = true
  limit 1;

  if v_template.id is null then
    raise exception 'Active template not found for code/event.';
  end if;

  insert into public.notification_queue (
    tenant_id, channel_id, booking_id, recipient, payload, status
  )
  values (
    v_tenant_id,
    v_template.resolved_channel_id,
    p_booking_id,
    coalesce(p_recipient, ''),
    jsonb_build_object(
      'template_code', v_template.code,
      'subject_template', v_template.subject_template,
      'body_template', v_template.body_template,
      'payload', coalesce(p_payload, '{}'::jsonb)
    ),
    'Pending'
  )
  returning id into v_queue_id;

  return v_queue_id;
end;
$$;

create or replace function public.checkin_booking_by_reference(
  p_booking_reference text,
  p_qr_payload text default null,
  p_source text default 'web'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_booking_id uuid;
  v_checkin_id uuid;
begin
  if v_tenant_id is null then
    raise exception 'Tenant not resolved for current auth user.';
  end if;

  select b.id into v_booking_id
  from public.bookings b
  where b.tenant_id = v_tenant_id
    and b.booking_reference = p_booking_reference
  limit 1;

  if v_booking_id is null then
    raise exception 'Booking reference not found.';
  end if;

  insert into public.qr_checkins (
    tenant_id, booking_id, qr_payload, source, checked_in_by
  )
  values (
    v_tenant_id, v_booking_id, p_qr_payload, coalesce(p_source, 'web'), auth.uid()
  )
  returning id into v_checkin_id;

  insert into public.booking_events (
    tenant_id, booking_id, event_type, actor_user_id, event_data
  )
  values (
    v_tenant_id, v_booking_id, 'CheckedIn', auth.uid(),
    jsonb_build_object('source', p_source, 'qr_payload', p_qr_payload)
  );

  return v_checkin_id;
end;
$$;

create or replace function public.apply_promotion_code(
  p_booking_id uuid,
  p_code text,
  p_amount numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_campaign record;
  v_booking record;
  v_redemption_id uuid;
begin
  if v_tenant_id is null then
    raise exception 'Tenant not resolved for current auth user.';
  end if;
  if p_code is null or btrim(p_code) = '' then
    raise exception 'p_code is required.';
  end if;

  select b.id, b.customer_id
  into v_booking
  from public.bookings b
  where b.tenant_id = v_tenant_id
    and b.id = p_booking_id
  limit 1;

  if v_booking.id is null then
    raise exception 'Booking not found.';
  end if;

  select pc.*
  into v_campaign
  from public.promotion_campaigns pc
  where pc.tenant_id = v_tenant_id
    and pc.code = p_code
    and pc.is_active = true
    and (pc.starts_at is null or pc.starts_at <= now())
    and (pc.ends_at is null or pc.ends_at >= now())
  limit 1;

  if v_campaign.id is null then
    raise exception 'Promotion code invalid or inactive.';
  end if;

  insert into public.promotion_redemptions (
    tenant_id, campaign_id, booking_id, customer_id, redeemed_code, discount_amount
  )
  values (
    v_tenant_id, v_campaign.id, v_booking.id, v_booking.customer_id, p_code, coalesce(p_amount, 0)
  )
  returning id into v_redemption_id;

  insert into public.booking_events (
    tenant_id, booking_id, event_type, actor_user_id, event_data
  )
  values (
    v_tenant_id, v_booking.id, 'PromotionApplied', auth.uid(),
    jsonb_build_object('campaign_id', v_campaign.id, 'code', p_code, 'amount', coalesce(p_amount, 0))
  );

  return v_redemption_id;
end;
$$;

create or replace function public.capture_dashboard_snapshot(
  p_dashboard_code text,
  p_scope text default 'daily'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid := public.current_tenant_id();
  v_snapshot_id uuid;
  v_bookings_today int := 0;
  v_pending_notifications int := 0;
  v_waiting int := 0;
begin
  if v_tenant_id is null then
    raise exception 'Tenant not resolved for current auth user.';
  end if;

  select count(*) into v_bookings_today
  from public.bookings b
  where b.tenant_id = v_tenant_id
    and b.booking_at::date = now()::date;

  select count(*) into v_pending_notifications
  from public.notification_queue nq
  where nq.tenant_id = v_tenant_id
    and nq.status = 'Pending';

  select count(*) into v_waiting
  from public.waitlists w
  where w.tenant_id = v_tenant_id
    and w.status in ('Pending', 'Waiting');

  insert into public.dashboard_snapshots (
    tenant_id, dashboard_code, snapshot_scope, metrics
  )
  values (
    v_tenant_id,
    coalesce(nullif(btrim(p_dashboard_code), ''), 'admin'),
    coalesce(nullif(btrim(p_scope), ''), 'daily'),
    jsonb_build_object(
      'bookings_today', v_bookings_today,
      'pending_notifications', v_pending_notifications,
      'waitlist_open', v_waiting
    )
  )
  returning id into v_snapshot_id;

  return v_snapshot_id;
end;
$$;

-- Allow authenticated clients to execute trusted procedures (RLS still applies).
grant execute on function public.upsert_app_setting(text, jsonb, bool) to authenticated;
grant execute on function public.add_waitlist_entry(uuid, uuid, text, timestamptz, timestamptz, int, text) to authenticated;
grant execute on function public.enqueue_notification_from_template(text, text, uuid, text, jsonb) to authenticated;
grant execute on function public.checkin_booking_by_reference(text, text, text) to authenticated;
grant execute on function public.apply_promotion_code(uuid, text, numeric) to authenticated;
grant execute on function public.capture_dashboard_snapshot(text, text) to authenticated;

commit;

