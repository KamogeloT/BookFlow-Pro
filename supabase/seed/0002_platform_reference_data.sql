-- BookFlow Pro - Seed reference data for expanded platform modules
-- Safe to re-run (uses upserts / conflict guards).

begin;

do $$
declare
  v_tenant_id uuid;
  v_admin_role_id uuid;
  v_branch_admin_role_id uuid;
  v_dispatcher_role_id uuid;
  v_staff_role_id uuid;
  v_customer_role_id uuid;
  v_email_channel_id uuid;
begin
  select id into v_tenant_id
  from public.tenants
  where slug = 'dev'
  limit 1;

  if v_tenant_id is null then
    raise notice 'No dev tenant found; skipping platform reference seed.';
    return;
  end if;

  select id into v_admin_role_id from public.roles where tenant_id = v_tenant_id and name = 'Tenant Admin' limit 1;
  select id into v_branch_admin_role_id from public.roles where tenant_id = v_tenant_id and name = 'Branch Admin' limit 1;
  select id into v_dispatcher_role_id from public.roles where tenant_id = v_tenant_id and name = 'Dispatcher' limit 1;
  select id into v_staff_role_id from public.roles where tenant_id = v_tenant_id and name = 'Staff' limit 1;
  select id into v_customer_role_id from public.roles where tenant_id = v_tenant_id and name = 'Customer' limit 1;

  select id into v_email_channel_id
  from public.notification_channels
  where tenant_id = v_tenant_id and channel_type = 'email'
  order by created_at asc
  limit 1;

  -- Permission catalog
  insert into public.permissions (code, name, description)
  values
    ('tenant.manage', 'Manage Tenant', 'Create/update tenant level settings'),
    ('roles.manage', 'Manage Roles', 'Manage roles and permissions'),
    ('booking.create', 'Create Booking', 'Create booking records'),
    ('booking.view', 'View Bookings', 'View booking records'),
    ('resource.manage', 'Manage Resources', 'Manage resources and seat maps'),
    ('allocation.run', 'Run Allocation', 'Run allocation previews and commits'),
    ('notification.manage', 'Manage Notifications', 'Manage templates and queues'),
    ('webhook.manage', 'Manage Webhooks', 'Manage outbound webhooks'),
    ('reports.view', 'View Reports', 'View and generate reports'),
    ('audit.view', 'View Audit Logs', 'View audit log data')
  on conflict (code) do update set
    name = excluded.name,
    description = excluded.description;

  -- Role to permission mapping (minimal sensible defaults)
  if v_admin_role_id is not null then
    insert into public.role_permissions (role_id, permission_id)
    select v_admin_role_id, p.id from public.permissions p
    on conflict do nothing;
  end if;

  if v_branch_admin_role_id is not null then
    insert into public.role_permissions (role_id, permission_id)
    select v_branch_admin_role_id, p.id
    from public.permissions p
    where p.code in (
      'booking.create', 'booking.view', 'resource.manage', 'allocation.run',
      'notification.manage', 'reports.view', 'audit.view'
    )
    on conflict do nothing;
  end if;

  if v_dispatcher_role_id is not null then
    insert into public.role_permissions (role_id, permission_id)
    select v_dispatcher_role_id, p.id
    from public.permissions p
    where p.code in ('booking.create', 'booking.view', 'allocation.run', 'notification.manage', 'reports.view')
    on conflict do nothing;
  end if;

  if v_staff_role_id is not null then
    insert into public.role_permissions (role_id, permission_id)
    select v_staff_role_id, p.id
    from public.permissions p
    where p.code in ('booking.view', 'reports.view')
    on conflict do nothing;
  end if;

  if v_customer_role_id is not null then
    insert into public.role_permissions (role_id, permission_id)
    select v_customer_role_id, p.id
    from public.permissions p
    where p.code in ('booking.create', 'booking.view')
    on conflict do nothing;
  end if;

  -- Defaults for branding/settings
  insert into public.tenant_branding (tenant_id, app_name, accent_color, mode)
  values (v_tenant_id, 'BookFlow Pro', '#0A84FF', 'system')
  on conflict (tenant_id) do update set
    app_name = excluded.app_name,
    accent_color = excluded.accent_color,
    mode = excluded.mode,
    updated_at = now();

  insert into public.app_settings (tenant_id, setting_key, setting_value, is_secret)
  values
    (v_tenant_id, 'features.notifications_enabled', 'true'::jsonb, false),
    (v_tenant_id, 'features.waitlist_enabled', 'true'::jsonb, false),
    (v_tenant_id, 'features.qr_checkin_enabled', 'true'::jsonb, false),
    (v_tenant_id, 'booking.default_timezone', to_jsonb('Africa/Johannesburg'::text), false)
  on conflict (tenant_id, setting_key) do update set
    setting_value = excluded.setting_value,
    is_secret = excluded.is_secret,
    updated_at = now();

  -- Notification templates
  if v_email_channel_id is not null then
    insert into public.notification_templates (
      tenant_id, channel_id, trigger_event, code, name, subject_template, body_template, is_active
    )
    values
      (
        v_tenant_id, v_email_channel_id, 'booking_confirmed', 'BOOKING_CONFIRMED_EMAIL',
        'Booking Confirmed Email',
        'Your booking is confirmed',
        'Hi {{customer_name}}, your booking {{booking_reference}} is confirmed for {{scheduled_start}}.',
        true
      ),
      (
        v_tenant_id, v_email_channel_id, 'booking_reminder', 'BOOKING_REMINDER_EMAIL',
        'Booking Reminder Email',
        'Booking reminder',
        'Reminder: your booking {{booking_reference}} starts at {{scheduled_start}}.',
        true
      )
    on conflict (tenant_id, code) do update set
      channel_id = excluded.channel_id,
      trigger_event = excluded.trigger_event,
      name = excluded.name,
      subject_template = excluded.subject_template,
      body_template = excluded.body_template,
      is_active = excluded.is_active,
      updated_at = now();
  end if;

  -- Report definitions
  insert into public.report_definitions (tenant_id, code, name, category, query_template, default_filters, is_active)
  values
    (v_tenant_id, 'BOOKINGS_BY_DAY', 'Bookings by Day', 'bookings', null, '{"group_by":"day"}'::jsonb, true),
    (v_tenant_id, 'ALLOCATION_UTILIZATION', 'Allocation Utilization', 'allocation', null, '{"group_by":"resource"}'::jsonb, true),
    (v_tenant_id, 'NOTIFICATION_DELIVERY', 'Notification Delivery', 'notifications', null, '{"status":"all"}'::jsonb, true)
  on conflict (tenant_id, code) do update set
    name = excluded.name,
    category = excluded.category,
    query_template = excluded.query_template,
    default_filters = excluded.default_filters,
    is_active = excluded.is_active,
    updated_at = now();
end $$;

commit;

